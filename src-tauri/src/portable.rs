use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortableManifest {
    pub format: String,
    pub format_version: u32,
    pub kind: String,
    pub package_kind: String,
    pub system_code: String,
    pub schema_key: String,
    pub schema_version: u32,
    pub exported_at: String,
    pub generator: PortableGenerator,
    pub counts: PortableCounts,
    pub total_uncompressed_bytes: u64,
    pub files: Vec<PortableFileEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortableGenerator { pub name: String, pub version: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortableCounts { pub libraries: u32, pub monsters: u32, pub active_monsters: u32, pub archived_monsters: u32, pub images: u32, pub files: u32 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortableFileEntry { pub path: String, pub role: String, pub media_type: String, pub size: u64, pub sha256: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortableLibraryEnvelope { pub format: String, #[serde(rename = "formatVersion")] pub format_version: u32, pub kind: String, #[serde(rename = "systemCode")] pub system_code: String, #[serde(rename = "schemaKey")] pub schema_key: String, #[serde(rename = "schemaVersion")] pub schema_version: u32, pub library: PortableLibrary }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortableLibrary { pub name: String, pub image: Option<PortableImageRef> }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortableMonsterEnvelope { pub format: String, #[serde(rename = "formatVersion")] pub format_version: u32, pub kind: String, #[serde(rename = "systemCode")] pub system_code: String, #[serde(rename = "schemaKey")] pub schema_key: String, #[serde(rename = "schemaVersion")] pub schema_version: u32, pub monster: Value }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortableImageRef { pub path: String, #[serde(rename = "mediaType")] pub media_type: String, pub width: u32, pub height: u32 }
