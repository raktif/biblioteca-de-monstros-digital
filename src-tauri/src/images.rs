use std::{
    fs,
    io::{Cursor, Write},
    path::{Path, PathBuf},
};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use image::{
    DynamicImage, GenericImageView, ImageDecoder, ImageFormat, ImageReader, imageops::FilterType,
    metadata::Cicp,
};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

const MAX_INPUT_BYTES: usize = 10 * 1024 * 1024;
const MAX_INPUT_PIXELS: u64 = 40_000_000;
const MAX_STORED_DIMENSION: u32 = 2048;
const THUMBNAIL_DIMENSION: u32 = 256;

pub struct NormalizedLibraryImage {
    pub main_bytes: Vec<u8>,
    pub thumbnail_bytes: Vec<u8>,
    pub sha256: String,
    pub width: u32,
    pub height: u32,
}

pub struct StagedImageChange {
    staging_dir: PathBuf,
    backup_dir: PathBuf,
    final_dir: PathBuf,
    place_new_image: bool,
    old_image_moved: bool,
    new_image_placed: bool,
    completed: bool,
}

impl NormalizedLibraryImage {
    pub fn from_data_url(data_url: &str) -> AppResult<Self> {
        let (declared_media_type, encoded) = data_url
            .split_once(',')
            .ok_or_else(|| invalid_image("O arquivo selecionado não é uma imagem válida."))?;
        let declared_media_type = declared_media_type
            .strip_prefix("data:")
            .and_then(|prefix| prefix.strip_suffix(";base64"))
            .ok_or_else(|| invalid_image("O arquivo selecionado não é uma imagem válida."))?;
        if !matches!(
            declared_media_type,
            "image/jpeg" | "image/png" | "image/webp"
        ) {
            return Err(invalid_image("Selecione uma imagem JPEG, PNG ou WebP."));
        }

        let bytes = STANDARD
            .decode(encoded)
            .map_err(|_| invalid_image("O arquivo selecionado não é uma imagem válida."))?;
        if bytes.is_empty() || bytes.len() > MAX_INPUT_BYTES {
            return Err(AppError::new(
                "IMAGE_TOO_LARGE",
                "A imagem deve ter no máximo 10 MiB.",
            ));
        }

        let reader = ImageReader::new(Cursor::new(bytes.as_slice()))
            .with_guessed_format()
            .map_err(|_| {
                invalid_image("O conteúdo do arquivo não corresponde a uma imagem aceita.")
            })?;
        let format = reader
            .format()
            .ok_or_else(|| invalid_image("O formato da imagem não foi reconhecido."))?;
        let actual_media_type = match format {
            ImageFormat::Jpeg => "image/jpeg",
            ImageFormat::Png => "image/png",
            ImageFormat::WebP => "image/webp",
            _ => return Err(invalid_image("Selecione uma imagem JPEG, PNG ou WebP.")),
        };
        if actual_media_type != declared_media_type {
            return Err(invalid_image(
                "O conteúdo do arquivo não corresponde ao tipo informado.",
            ));
        }
        if format == ImageFormat::WebP && is_animated_webp(&bytes) {
            return Err(invalid_image("Imagens WebP animadas não são aceitas."));
        }

        let mut decoder = reader
            .into_decoder()
            .map_err(|_| invalid_image("Não foi possível ler a imagem selecionada."))?;
        let (input_width, input_height) = decoder.dimensions();
        let pixels = u64::from(input_width) * u64::from(input_height);
        if input_width == 0 || input_height == 0 || pixels > MAX_INPUT_PIXELS {
            return Err(AppError::new(
                "IMAGE_TOO_LARGE",
                "A imagem não pode ultrapassar 40 megapixels.",
            ));
        }
        let orientation = decoder
            .orientation()
            .map_err(|_| invalid_image("Não foi possível ler a orientação da imagem."))?;
        let mut image = DynamicImage::from_decoder(decoder)
            .map_err(|_| invalid_image("Não foi possível decodificar a imagem selecionada."))?;
        image.apply_orientation(orientation);
        image
            .apply_color_space(Cicp::SRGB, Default::default())
            .map_err(|_| {
                invalid_image("O perfil de cor da imagem não pode ser convertido para sRGB.")
            })?;

        let (width, height) = image.dimensions();
        let scale = (f64::from(MAX_STORED_DIMENSION) / f64::from(width))
            .min(f64::from(MAX_STORED_DIMENSION) / f64::from(height))
            .min(1.0);
        let stored_width = ((f64::from(width) * scale).round() as u32).max(1);
        let stored_height = ((f64::from(height) * scale).round() as u32).max(1);
        if stored_width != width || stored_height != height {
            image = image.resize_exact(stored_width, stored_height, FilterType::Lanczos3);
        }

        let thumbnail = image.resize_to_fill(
            THUMBNAIL_DIMENSION,
            THUMBNAIL_DIMENSION,
            FilterType::Lanczos3,
        );
        let main_bytes = encode_webp(image)?;
        let thumbnail_bytes = encode_webp(thumbnail)?;
        let sha256 = Sha256::digest(&main_bytes)
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();

        Ok(Self {
            main_bytes,
            thumbnail_bytes,
            sha256,
            width: stored_width,
            height: stored_height,
        })
    }
}

impl StagedImageChange {
    pub fn stage(
        app_data_dir: &Path,
        library_id: &str,
        image: Option<&NormalizedLibraryImage>,
    ) -> AppResult<Self> {
        Self::stage_at(
            app_data_dir,
            &format!("images/libraries/{library_id}"),
            "cover.webp",
            "thumb.webp",
            image,
        )
    }

    pub fn stage_at(
        app_data_dir: &Path,
        relative_directory: &str,
        main_name: &str,
        thumbnail_name: &str,
        image: Option<&NormalizedLibraryImage>,
    ) -> AppResult<Self> {
        let operation_id = uuid::Uuid::new_v4().to_string();
        let staging_dir = app_data_dir.join("staging/images").join(&operation_id);
        let backup_dir = app_data_dir
            .join("staging/images")
            .join(format!("{operation_id}-backup"));
        let final_dir = app_data_dir.join(relative_directory);
        fs::create_dir_all(&staging_dir)?;

        let mut staged = Self {
            staging_dir,
            backup_dir,
            final_dir,
            place_new_image: image.is_some(),
            old_image_moved: false,
            new_image_placed: false,
            completed: false,
        };
        if let Some(image) = image {
            if let Err(error) = write_synced(&staged.staging_dir.join(main_name), &image.main_bytes)
                .and_then(|()| {
                    write_synced(
                        &staged.staging_dir.join(thumbnail_name),
                        &image.thumbnail_bytes,
                    )
                })
            {
                staged.rollback();
                return Err(error.into());
            }
        }

        Ok(staged)
    }

    pub fn apply(&mut self) -> AppResult<()> {
        if self.final_dir.exists() {
            if let Some(parent) = self.backup_dir.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::rename(&self.final_dir, &self.backup_dir)?;
            self.old_image_moved = true;
        }

        if self.place_new_image {
            if let Some(parent) = self.final_dir.parent() {
                fs::create_dir_all(parent)?;
            }
            if let Err(error) = fs::rename(&self.staging_dir, &self.final_dir) {
                self.restore_backup();
                return Err(error.into());
            }
            self.new_image_placed = true;
        }
        Ok(())
    }

    pub fn rollback(&mut self) {
        if self.new_image_placed {
            match fs::remove_dir_all(&self.final_dir) {
                Ok(()) => self.new_image_placed = false,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    self.new_image_placed = false;
                }
                Err(error) => log::error!(
                    "Falha ao reverter imagem nova ({}): {}",
                    self.final_dir.display(),
                    error.kind()
                ),
            }
        }
        self.restore_backup();
        if let Err(error) = fs::remove_dir_all(&self.staging_dir) {
            if error.kind() != std::io::ErrorKind::NotFound {
                log::warn!(
                    "Falha ao remover staging de imagem ({}): {}",
                    self.staging_dir.display(),
                    error.kind()
                );
            }
        }
        self.completed = !self.new_image_placed && !self.old_image_moved;
    }

    pub fn finish(mut self) {
        if self.old_image_moved {
            if let Err(error) = fs::remove_dir_all(&self.backup_dir) {
                if error.kind() != std::io::ErrorKind::NotFound {
                    log::warn!(
                        "Falha ao remover backup de capa ({}): {}",
                        self.backup_dir.display(),
                        error.kind()
                    );
                }
            }
        }
        let _ = fs::remove_dir_all(&self.staging_dir);
        self.completed = true;
    }

    fn restore_backup(&mut self) {
        if self.old_image_moved {
            if self.final_dir.exists() {
                if let Err(error) = fs::remove_dir_all(&self.final_dir) {
                    log::error!(
                        "Falha ao preparar restauração de capa ({}): {}",
                        self.final_dir.display(),
                        error.kind()
                    );
                    return;
                }
            }
            match fs::rename(&self.backup_dir, &self.final_dir) {
                Ok(()) => self.old_image_moved = false,
                Err(error) => log::error!(
                    "Falha ao restaurar capa anterior ({}): {}",
                    self.backup_dir.display(),
                    error.kind()
                ),
            }
        }
    }
}

impl Drop for StagedImageChange {
    fn drop(&mut self) {
        if !self.completed {
            self.rollback();
        }
    }
}

fn encode_webp(image: DynamicImage) -> AppResult<Vec<u8>> {
    let mut output = Cursor::new(Vec::new());
    image
        .write_to(&mut output, ImageFormat::WebP)
        .map_err(|_| {
            AppError::internal(
                "IMAGE_CONVERSION_FAILED",
                "Não foi possível normalizar a imagem.",
            )
        })?;
    Ok(output.into_inner())
}

fn write_synced(path: &Path, bytes: &[u8]) -> AppResult<()> {
    let mut file = fs::File::create(path)?;
    file.write_all(bytes)?;
    file.sync_all()?;
    Ok(())
}

fn invalid_image(message: &str) -> AppError {
    AppError::new("IMAGE_INVALID", message)
}

fn is_animated_webp(bytes: &[u8]) -> bool {
    if bytes.len() < 12 || &bytes[..4] != b"RIFF" || &bytes[8..12] != b"WEBP" {
        return false;
    }
    let mut offset = 12usize;
    while offset.saturating_add(8) <= bytes.len() {
        let chunk_type = &bytes[offset..offset + 4];
        let chunk_size =
            u32::from_le_bytes(bytes[offset + 4..offset + 8].try_into().unwrap()) as usize;
        let data_start = offset + 8;
        let Some(data_end) = data_start.checked_add(chunk_size) else {
            return true;
        };
        if data_end > bytes.len() {
            return true;
        }
        if chunk_type == b"ANIM" {
            return true;
        }
        if chunk_type == b"VP8X" && chunk_size > 0 && bytes[data_start] & 0x02 != 0 {
            return true;
        }
        let Some(next_offset) = data_end.checked_add(chunk_size & 1) else {
            return true;
        };
        offset = next_offset;
    }
    false
}

#[cfg(test)]
mod tests {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    use image::{DynamicImage, ImageFormat};
    use std::io::Cursor;

    use super::NormalizedLibraryImage;

    #[test]
    fn image_pipeline_reencodes_accepted_png_as_webp_cover_and_thumbnail() {
        let mut png = Cursor::new(Vec::new());
        DynamicImage::new_rgba8(400, 200)
            .write_to(&mut png, ImageFormat::Png)
            .unwrap();
        let url = format!(
            "data:image/png;base64,{}",
            STANDARD.encode(png.into_inner())
        );
        let image = NormalizedLibraryImage::from_data_url(&url).unwrap();
        assert_eq!((image.width, image.height), (400, 200));
        assert_eq!(&image.main_bytes[8..12], b"WEBP");
        assert_eq!(&image.thumbnail_bytes[8..12], b"WEBP");
    }

    #[test]
    fn image_pipeline_rejects_unsupported_data_urls() {
        assert!(
            NormalizedLibraryImage::from_data_url("data:image/svg+xml;base64,PHN2Zz4=").is_err()
        );
        assert!(NormalizedLibraryImage::from_data_url("data:image/png;base64,AAAA").is_err());
    }
}
