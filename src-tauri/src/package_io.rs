use std::{collections::HashMap, fs::File, io::Read, path::Path};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use unicode_normalization::UnicodeNormalization;
use zip::ZipArchive;

use crate::error::{AppError, AppResult};

const MAX_ZIP_LIBRARY: u64 = 2 * 1024 * 1024 * 1024;
const MAX_ZIP_MONSTER: u64 = 32 * 1024 * 1024;
const MAX_FILES_LIBRARY: usize = 25_000;
const MAX_FILES_MONSTER: usize = 10;
const MAX_FILE_JSON: u64 = 5 * 1024 * 1024;
const MAX_FILE_IMAGE: u64 = 16 * 1024 * 1024;
const MAX_TOTAL_LIBRARY: u64 = 4 * 1024 * 1024 * 1024;
const MAX_TOTAL_MONSTER: u64 = 64 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageManifest {
    pub format: String,
    pub format_version: u32,
    pub kind: String,
    pub package_kind: String,
    pub system_code: String,
    pub schema_key: String,
    pub schema_version: u32,
    pub exported_at: String,
    pub generator: PackageGenerator,
    pub counts: PackageCounts,
    pub total_uncompressed_bytes: u64,
    pub files: Vec<PackageFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageGenerator {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageCounts {
    pub libraries: u32,
    pub monsters: u32,
    pub active_monsters: u32,
    pub archived_monsters: u32,
    pub images: u32,
    pub files: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageFile {
    pub path: String,
    pub role: String,
    pub media_type: String,
    pub size: u64,
    pub sha256: String,
}

#[derive(Debug)]
pub struct InspectedPackage {
    pub manifest: PackageManifest,
    pub files: HashMap<String, Vec<u8>>,
    pub compressed_bytes: u64,
}

pub fn inspect_zip(path: &Path) -> AppResult<InspectedPackage> {
    let file = File::open(path).map_err(|_| {
        package_error(
            "PACKAGE_READ_FAILED",
            "Não foi possível abrir o pacote ZIP.",
        )
    })?;
    let compressed_bytes = file.metadata()?.len();
    if compressed_bytes > MAX_ZIP_LIBRARY {
        return Err(package_error(
            "PACKAGE_TOO_LARGE",
            "O tamanho comprimido excede o limite do pacote.",
        ));
    }
    let mut archive = ZipArchive::new(file).map_err(|_| {
        package_error(
            "PACKAGE_ZIP_INVALID",
            "O arquivo não é um pacote ZIP válido.",
        )
    })?;
    if archive.len() == 0 || archive.len() > MAX_FILES_LIBRARY + 1 {
        return Err(package_error(
            "PACKAGE_ENTRY_LIMIT_EXCEEDED",
            "A quantidade de arquivos do pacote excede o limite.",
        ));
    }

    let mut files = HashMap::new();
    let mut folded_paths = HashMap::new();
    let mut uncompressed_bytes = 0_u64;
    let mut manifest_bytes = None;
    for index in 0..archive.len() {
        let entry = archive.by_index(index).map_err(|_| {
            package_error(
                "PACKAGE_ZIP_INVALID",
                "Não foi possível ler o inventário ZIP.",
            )
        })?;
        let name = entry
            .name()
            .map_err(|_| {
                package_error(
                    "PACKAGE_ZIP_INVALID",
                    "O pacote contém um nome de arquivo inválido.",
                )
            })?
            .into_owned();
        validate_path(&name)?;
        if entry.is_dir()
            || entry.is_symlink()
            || entry.encrypted()
            || entry.enclosed_name().is_none()
        {
            return Err(package_error(
                "PACKAGE_ENTRY_UNSAFE",
                "O pacote contém uma entrada inválida, criptografada ou não permitida.",
            ));
        }
        let folded = name.nfc().collect::<String>().to_lowercase();
        if folded_paths.insert(folded, name.clone()).is_some() {
            return Err(package_error(
                "PACKAGE_DUPLICATE_PATH",
                "O pacote contém caminhos duplicados.",
            ));
        }
        let size = entry.size();
        let file_limit = if name.ends_with(".json") {
            MAX_FILE_JSON
        } else {
            MAX_FILE_IMAGE
        };
        if size == 0 || size > file_limit {
            return Err(package_error(
                "PACKAGE_FILE_TOO_LARGE",
                "Um arquivo do pacote excede o limite permitido.",
            ));
        }
        uncompressed_bytes = uncompressed_bytes.checked_add(size).ok_or_else(|| {
            package_error(
                "PACKAGE_UNCOMPRESSED_LIMIT_EXCEEDED",
                "O tamanho descompactado excede o limite.",
            )
        })?;
        let mut data = Vec::with_capacity(size as usize);
        entry
            .take(file_limit + 1)
            .read_to_end(&mut data)
            .map_err(|_| {
                package_error(
                    "PACKAGE_ZIP_INVALID",
                    "Não foi possível descompactar um arquivo do pacote.",
                )
            })?;
        if data.len() as u64 != size {
            return Err(package_error(
                "PACKAGE_SIZE_MISMATCH",
                "O tamanho descompactado não corresponde ao inventário ZIP.",
            ));
        }
        if name == "manifest.json" {
            manifest_bytes = Some(data);
        } else {
            files.insert(name, data);
        }
    }

    let manifest_bytes = manifest_bytes.ok_or_else(|| {
        package_error(
            "PACKAGE_MANIFEST_MISSING",
            "O pacote não contém manifest.json.",
        )
    })?;
    let manifest: PackageManifest = serde_json::from_slice(&manifest_bytes).map_err(|_| {
        package_error(
            "PACKAGE_MANIFEST_INVALID",
            "O manifesto do pacote não é um JSON válido.",
        )
    })?;
    validate_manifest(&manifest, compressed_bytes, uncompressed_bytes, &files)?;
    Ok(InspectedPackage {
        manifest,
        files,
        compressed_bytes,
    })
}

fn validate_manifest(
    manifest: &PackageManifest,
    compressed_bytes: u64,
    total_bytes: u64,
    files: &HashMap<String, Vec<u8>>,
) -> AppResult<()> {
    let is_library = manifest.package_kind == "library";
    if !is_library && manifest.package_kind != "monster" {
        return Err(package_error(
            "PACKAGE_KIND_INVALID",
            "O tipo do pacote não é reconhecido.",
        ));
    }
    if manifest.format != "biblioteca-de-monstros-digital.package"
        || manifest.format_version != 1
        || manifest.kind != "package-manifest"
        || manifest.schema_version != 1
    {
        return Err(package_error(
            "PACKAGE_VERSION_UNSUPPORTED",
            "A versão ou o formato do pacote não é compatível.",
        ));
    }
    if !matches!(manifest.system_code.as_str(), "add2e" | "shadowlords3e")
        || manifest.schema_key != format!("{}.monster", manifest.system_code)
    {
        return Err(package_error(
            "PACKAGE_SYSTEM_INVALID",
            "O sistema declarado no manifesto é inválido.",
        ));
    }
    let max_compressed = if is_library {
        MAX_ZIP_LIBRARY
    } else {
        MAX_ZIP_MONSTER
    };
    let max_total = if is_library {
        MAX_TOTAL_LIBRARY
    } else {
        MAX_TOTAL_MONSTER
    };
    let max_files = if is_library {
        MAX_FILES_LIBRARY
    } else {
        MAX_FILES_MONSTER
    };
    if compressed_bytes > max_compressed || total_bytes > max_total || files.len() > max_files {
        return Err(package_error(
            "PACKAGE_LIMIT_EXCEEDED",
            "O pacote excede os limites permitidos.",
        ));
    }
    if manifest.counts.files as usize != files.len()
        || manifest.files.len() != files.len()
        || manifest.total_uncompressed_bytes
            != manifest.files.iter().map(|item| item.size).sum::<u64>()
    {
        return Err(package_error(
            "PACKAGE_MANIFEST_COUNTS_INVALID",
            "As contagens do manifesto não correspondem aos arquivos.",
        ));
    }
    if (is_library && manifest.counts.libraries != 1)
        || (!is_library && (manifest.counts.libraries != 0 || manifest.counts.monsters != 1))
    {
        return Err(package_error(
            "PACKAGE_MANIFEST_COUNTS_INVALID",
            "As contagens do tipo de pacote são inválidas.",
        ));
    }
    let mut seen = HashMap::new();
    for declared in &manifest.files {
        validate_path(&declared.path)?;
        let folded = declared.path.nfc().collect::<String>().to_lowercase();
        if seen.insert(folded, ()).is_some() {
            return Err(package_error(
                "PACKAGE_DUPLICATE_PATH",
                "O manifesto contém caminhos duplicados.",
            ));
        }
        let actual = files.get(&declared.path).ok_or_else(|| {
            package_error(
                "PACKAGE_FILE_MISSING",
                "Um arquivo listado no manifesto não existe no ZIP.",
            )
        })?;
        let hash = hex_sha256(actual);
        if declared.size != actual.len() as u64
            || !constant_time_equal(declared.sha256.as_bytes(), hash.as_bytes())
        {
            return Err(package_error(
                "PACKAGE_HASH_MISMATCH",
                "O tamanho ou hash de um arquivo não corresponde ao manifesto.",
            ));
        }
    }
    if files
        .keys()
        .any(|path| !manifest.files.iter().any(|declared| declared.path == *path))
    {
        return Err(package_error(
            "PACKAGE_FILE_UNLISTED",
            "O ZIP contém um arquivo que não está declarado no manifesto.",
        ));
    }
    Ok(())
}

fn validate_path(path: &str) -> AppResult<()> {
    let segments = path.split('/').collect::<Vec<_>>();
    if path.is_empty()
        || path.len() > 512
        || path.starts_with('/')
        || path.contains('\\')
        || path.contains('\0')
        || path.split(':').count() > 1
        || segments.len() > 8
        || segments
            .iter()
            .any(|part| part.is_empty() || *part == "." || *part == "..")
    {
        return Err(package_error(
            "PACKAGE_PATH_UNSAFE",
            "O pacote contém um caminho de arquivo não seguro.",
        ));
    }
    Ok(())
}

fn hex_sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

fn constant_time_equal(left: &[u8], right: &[u8]) -> bool {
    left.len() == right.len()
        && left
            .iter()
            .zip(right)
            .fold(0_u8, |diff, (a, b)| diff | (a ^ b))
            == 0
}

fn package_error(code: &'static str, message: &'static str) -> AppError {
    AppError::new(code, message)
}

#[cfg(test)]
mod tests {
    use std::{fs, io::Write};

    use zip::{ZipWriter, write::SimpleFileOptions};

    use super::{
        PackageCounts, PackageFile, PackageGenerator, PackageManifest, hex_sha256, inspect_zip,
    };

    fn manifest(monster: &[u8], hash: String) -> PackageManifest {
        PackageManifest {
            format: "biblioteca-de-monstros-digital.package".into(),
            format_version: 1,
            kind: "package-manifest".into(),
            package_kind: "monster".into(),
            system_code: "add2e".into(),
            schema_key: "add2e.monster".into(),
            schema_version: 1,
            exported_at: "2026-11-25T12:00:00Z".into(),
            generator: PackageGenerator {
                name: "Biblioteca de Monstros Digital".into(),
                version: "0.1.0".into(),
            },
            counts: PackageCounts {
                libraries: 0,
                monsters: 1,
                active_monsters: 1,
                archived_monsters: 0,
                images: 0,
                files: 1,
            },
            total_uncompressed_bytes: monster.len() as u64,
            files: vec![PackageFile {
                path: "monster.json".into(),
                role: "monster-data".into(),
                media_type: "application/json".into(),
                size: monster.len() as u64,
                sha256: hash,
            }],
        }
    }

    fn write_zip(entries: &[(&str, &[u8])]) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!("bmd-package-{}.zip", uuid::Uuid::new_v4()));
        let file = fs::File::create(&path).unwrap();
        let mut writer = ZipWriter::new(file);
        for (name, data) in entries {
            writer
                .start_file(*name, SimpleFileOptions::default())
                .unwrap();
            writer.write_all(data).unwrap();
        }
        writer.finish().unwrap();
        path
    }

    #[test]
    fn reads_valid_zip_and_checks_manifest_hashes() {
        let monster = br#"{"kind":"monster"}"#;
        let manifest = serde_json::to_vec(&manifest(monster, hex_sha256(monster))).unwrap();
        let path = write_zip(&[("monster.json", monster), ("manifest.json", &manifest)]);
        let result = inspect_zip(&path).unwrap();
        assert_eq!(result.manifest.package_kind, "monster");
        assert_eq!(result.files.get("monster.json").unwrap(), monster);
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn rejects_zip_traversal_before_extracting_anything() {
        let path = write_zip(&[("../outside.json", b"{}")]);
        let error = inspect_zip(&path).unwrap_err();
        assert_eq!(error.code, "PACKAGE_PATH_UNSAFE");
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn rejects_manifest_hash_mismatch() {
        let monster = br#"{"kind":"monster"}"#;
        let manifest = serde_json::to_vec(&manifest(monster, "0".repeat(64))).unwrap();
        let path = write_zip(&[("monster.json", monster), ("manifest.json", &manifest)]);
        let error = inspect_zip(&path).unwrap_err();
        assert_eq!(error.code, "PACKAGE_HASH_MISMATCH");
        fs::remove_file(path).unwrap();
    }
}
