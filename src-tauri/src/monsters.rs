use std::{
    fs,
    path::{Path, PathBuf},
};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use serde::Serialize;
use serde_json::{Value, json};
use sqlx::{AssertSqlSafe, FromRow, Sqlite, SqlitePool, Transaction};
use time::{Duration, OffsetDateTime, format_description::well_known::Rfc3339};
use unicode_normalization::{UnicodeNormalization, char::is_combining_mark};
use uuid::Uuid;

use crate::{
    database::{AppState, utc_now},
    error::{AppError, AppResult},
    images::{NormalizedLibraryImage, StagedImageChange},
    monster_validation::{canonical_hash, validate_monster},
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonsterSummary {
    pub id: String,
    pub library_id: String,
    pub name: String,
    pub editorial_category: Option<String>,
    pub status: String,
    pub image_data_url: Option<String>,
    pub updated_at: String,
    pub created_at: String,
    pub row_version: i64,
    pub terrains: Vec<String>,
    pub activity_periods: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonsterDto {
    pub document: Value,
    pub image_data_url: Option<String>,
}

#[derive(FromRow)]
struct MonsterRow {
    id: String,
    library_id: String,
    name: String,
    status: String,
    document_json: String,
    image_path: Option<String>,
    updated_at: String,
    row_version: i64,
}

const MONSTER_SELECT: &str = "SELECT m.id, m.library_id, m.name, m.status, m.document_json, m.image_path, m.updated_at, m.row_version FROM monsters m";

#[tauri::command]
pub async fn monster_list(
    state: tauri::State<'_, AppState>,
    library_id: String,
    status: String,
) -> AppResult<Vec<MonsterSummary>> {
    if !matches!(status.as_str(), "active" | "archived" | "trashed" | "all") {
        return Err(AppError::new(
            "MONSTER_STATUS_INVALID",
            "Selecione um estado de listagem válido.",
        ));
    }
    let pool = state.pool().await?;
    let query = format!(
        "{MONSTER_SELECT} JOIN libraries l ON l.id = m.library_id WHERE m.library_id = ? AND l.deleted_at IS NULL AND (? = 'all' OR m.status = ?) ORDER BY m.sort_name COLLATE BINARY, m.created_at, m.id"
    );
    let rows = sqlx::query_as::<_, MonsterRow>(AssertSqlSafe(query.as_str()))
        .bind(library_id)
        .bind(&status)
        .bind(&status)
        .fetch_all(&pool)
        .await?;
    rows.into_iter()
        .map(|row| {
            let document = parse_document(&row.document_json)?;
            let (terrains, activity_periods) = document
                .get("profiles")
                .and_then(Value::as_array)
                .map(|profiles| {
                    let collect_codes = |field: &str| {
                        let mut values = profiles
                            .iter()
                            .flat_map(|profile| {
                                profile
                                    .get(field)
                                    .and_then(Value::as_array)
                                    .into_iter()
                                    .flatten()
                            })
                            .filter_map(|entry| {
                                entry.get("code").and_then(Value::as_str).map(str::to_owned)
                            })
                            .collect::<Vec<_>>();
                        values.sort();
                        values.dedup();
                        values
                    };
                    (collect_codes("terrains"), collect_codes("activityPeriods"))
                })
                .unwrap_or_default();
            Ok(MonsterSummary {
                id: row.id,
                library_id: row.library_id,
                name: row.name,
                editorial_category: document
                    .get("editorialCategory")
                    .and_then(Value::as_str)
                    .map(str::to_owned)
                    .or_else(|| {
                        document
                            .get("descriptors")
                            .and_then(Value::as_array)
                            .map(|items| {
                                items
                                    .iter()
                                    .filter_map(Value::as_str)
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            })
                    }),
                status: row.status,
                image_data_url: thumbnail_data_url(state.app_data_dir(), row.image_path.as_deref()),
                updated_at: row.updated_at,
                created_at: document
                    .get("createdAt")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_owned(),
                row_version: row.row_version,
                terrains,
                activity_periods,
            })
        })
        .collect()
}

#[tauri::command]
pub async fn monster_get(state: tauri::State<'_, AppState>, id: String) -> AppResult<MonsterDto> {
    let pool = state.pool().await?;
    let row = fetch_monster(&pool, &id, false).await?;
    to_dto_db(row, state.app_data_dir())
}

#[tauri::command]
pub async fn monster_create(
    state: tauri::State<'_, AppState>,
    library_id: String,
    mut document: Value,
    image_data_url: Option<String>,
) -> AppResult<MonsterDto> {
    let pool = state.pool().await?;
    let system_code = document
        .get("systemCode")
        .and_then(Value::as_str)
        .ok_or_else(invalid_document)?
        .to_owned();
    ensure_library_system(&pool, &library_id, &system_code).await?;
    let id = Uuid::new_v4().to_string();
    let now = format_time(OffsetDateTime::now_utc())?;
    let name = validate_name(
        document
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default(),
    )?;
    document["name"] = json!(name);
    let image = image_data_url
        .as_deref()
        .map(NormalizedLibraryImage::from_data_url)
        .transpose()?;
    set_common_fields(
        &mut document,
        &id,
        &library_id,
        &system_code,
        "active",
        1,
        &now,
        &now,
    )?;
    set_image_metadata(&mut document, &id, image.as_ref());
    document["contentHash"] = Value::String(canonical_hash(&document)?);
    validate_monster(&document)?;
    let document_json = serde_json::to_string(&document).map_err(|_| {
        AppError::internal(
            "MONSTER_SERIALIZATION_FAILED",
            "Não foi possível preparar a ficha.",
        )
    })?;
    let content_hash = document["contentHash"].as_str().unwrap_or_default();
    let name = document["name"].as_str().unwrap_or_default().to_owned();
    let sort_name = normalize_sort_name(&name);
    let image_path = image.as_ref().map(|_| monster_image_path(&id));
    let image_hash = image.as_ref().map(|image| image.sha256.as_str());
    let image_width = image.as_ref().map(|image| i64::from(image.width));
    let image_height = image.as_ref().map(|image| i64::from(image.height));
    let mut staged = image
        .as_ref()
        .map(|image| stage_monster_image(state.app_data_dir(), &id, Some(image)))
        .transpose()?;
    let mut transaction = pool.begin().await?;
    sqlx::query("INSERT INTO monsters (id, library_id, name, sort_name, status, schema_key, schema_version, document_json, image_path, thumbnail_path, image_hash, image_width, image_height, content_hash, created_at, updated_at, row_version) VALUES (?, ?, ?, ?, 'active', ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
        .bind(&id)
        .bind(&library_id)
        .bind(&name)
        .bind(sort_name)
        .bind(schema_key(&system_code)?)
        .bind(&document_json)
        .bind(&image_path)
        .bind(image_path.as_ref().map(|path| path.replace("main.webp", "thumb.webp")))
        .bind(image_hash)
        .bind(image_width)
        .bind(image_height)
        .bind(content_hash)
        .bind(&now)
        .bind(&now)
        .execute(&mut *transaction)
        .await?;
    sync_profiles(&mut transaction, &id, &document).await?;
    if let Some(change) = staged.as_mut() {
        if let Err(error) = change.apply() {
            let _ = transaction.rollback().await;
            change.rollback();
            return Err(error);
        }
    }
    if let Err(error) = transaction.commit().await {
        if let Some(change) = staged.as_mut() {
            change.rollback();
        }
        return Err(error.into());
    }
    if let Some(change) = staged {
        change.finish();
    }
    get_by_id(&pool, state.app_data_dir(), &id).await
}

#[tauri::command]
pub async fn monster_update(
    state: tauri::State<'_, AppState>,
    id: String,
    mut document: Value,
    image_data_url: Option<String>,
    remove_image: bool,
    expected_row_version: i64,
) -> AppResult<MonsterDto> {
    if remove_image && image_data_url.is_some() {
        return Err(AppError::new(
            "INVALID_IMAGE_OPERATION",
            "Escolha uma imagem nova ou remova a imagem atual, mas não faça as duas ações juntas.",
        ));
    }
    let pool = state.pool().await?;
    let current = fetch_monster(&pool, &id, true).await?;
    if current.row_version != expected_row_version {
        return Err(conflict());
    }
    let previous = parse_document(&current.document_json)?;
    let library_id = current.library_id.clone();
    let system_code = previous
        .get("systemCode")
        .and_then(Value::as_str)
        .ok_or_else(invalid_document)?
        .to_owned();
    if document.get("systemCode").and_then(Value::as_str) != Some(system_code.as_str()) {
        return Err(AppError::new(
            "MONSTER_SYSTEM_MISMATCH",
            "O sistema da ficha nÃ£o pode ser alterado.",
        ));
    }
    ensure_library_system(&pool, &library_id, &system_code).await?;
    let name = validate_name(
        document
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or_default(),
    )?;
    document["name"] = json!(name);
    let now = format_time(OffsetDateTime::now_utc())?;
    let row_version = expected_row_version + 1;
    let status = current.status.as_str();
    if remove_image {
        document["image"] = Value::Null;
    } else if image_data_url.is_none() {
        document["image"] = previous.get("image").cloned().unwrap_or(Value::Null);
    }
    set_common_fields(
        &mut document,
        &id,
        &library_id,
        &system_code,
        status,
        row_version,
        previous
            .get("createdAt")
            .and_then(Value::as_str)
            .unwrap_or(&now),
        &now,
    )?;
    let image = image_data_url
        .as_deref()
        .map(NormalizedLibraryImage::from_data_url)
        .transpose()?;
    if image.is_some() {
        set_image_metadata(&mut document, &id, image.as_ref());
    }
    document["contentHash"] = Value::String(canonical_hash(&document)?);
    validate_monster(&document)?;
    let document_json = serde_json::to_string(&document).map_err(|_| {
        AppError::internal(
            "MONSTER_SERIALIZATION_FAILED",
            "Não foi possível preparar a ficha.",
        )
    })?;
    let content_hash = document["contentHash"].as_str().unwrap_or_default();
    let mut staged = if image.is_some() || (remove_image && current.image_path.is_some()) {
        Some(stage_monster_image(
            state.app_data_dir(),
            &id,
            image.as_ref(),
        )?)
    } else {
        None
    };
    let image_path = if remove_image {
        None
    } else if image.is_some() {
        Some(monster_image_path(&id))
    } else {
        current.image_path.clone()
    };
    let image_hash = if remove_image {
        None
    } else {
        image
            .as_ref()
            .map(|image| image.sha256.clone())
            .or_else(|| {
                current.image_path.as_ref().and_then(|_| {
                    previous
                        .get("image")
                        .and_then(|value| value.get("sha256"))
                        .and_then(Value::as_str)
                        .map(str::to_owned)
                })
            })
    };
    let image_width = if remove_image {
        None
    } else {
        image
            .as_ref()
            .map(|image| i64::from(image.width))
            .or_else(|| {
                previous
                    .get("image")
                    .and_then(|value| value.get("width"))
                    .and_then(Value::as_i64)
            })
    };
    let image_height = if remove_image {
        None
    } else {
        image
            .as_ref()
            .map(|image| i64::from(image.height))
            .or_else(|| {
                previous
                    .get("image")
                    .and_then(|value| value.get("height"))
                    .and_then(Value::as_i64)
            })
    };
    let mut transaction = pool.begin().await?;
    let updated = sqlx::query("UPDATE monsters SET name = ?, sort_name = ?, document_json = ?, image_path = ?, thumbnail_path = ?, image_hash = ?, image_width = ?, image_height = ?, content_hash = ?, updated_at = ?, row_version = row_version + 1 WHERE id = ? AND status <> 'trashed' AND row_version = ?")
        .bind(&name)
        .bind(normalize_sort_name(&name))
        .bind(document_json)
        .bind(&image_path)
        .bind(image_path.as_ref().map(|path| path.replace("main.webp", "thumb.webp")))
        .bind(image_hash)
        .bind(image_width)
        .bind(image_height)
        .bind(content_hash)
        .bind(&now)
        .bind(&id)
        .bind(expected_row_version)
        .execute(&mut *transaction)
        .await?;
    if updated.rows_affected() != 1 {
        let _ = transaction.rollback().await;
        return Err(conflict());
    }
    sqlx::query("DELETE FROM monster_profiles WHERE monster_id = ?")
        .bind(&id)
        .execute(&mut *transaction)
        .await?;
    sync_profiles(&mut transaction, &id, &document).await?;
    if let Some(change) = staged.as_mut() {
        if let Err(error) = change.apply() {
            let _ = transaction.rollback().await;
            change.rollback();
            return Err(error);
        }
    }
    if let Err(error) = transaction.commit().await {
        if let Some(change) = staged.as_mut() {
            change.rollback();
        }
        return Err(error.into());
    }
    if let Some(change) = staged {
        change.finish();
    }
    get_by_id(&pool, state.app_data_dir(), &id).await
}

#[tauri::command]
pub async fn monster_set_archived(
    state: tauri::State<'_, AppState>,
    id: String,
    archived: bool,
    expected_row_version: i64,
) -> AppResult<MonsterDto> {
    let pool = state.pool().await?;
    let row = fetch_monster(&pool, &id, true).await?;
    if row.row_version != expected_row_version || row.status == "trashed" {
        return Err(conflict());
    }
    let status = if archived { "archived" } else { "active" };
    let document = update_document_state(
        parse_document(&row.document_json)?,
        status,
        row.row_version + 1,
    )?;
    let now = utc_now()?;
    let archived_at = if archived { Some(now.clone()) } else { None };
    let mut transaction = pool.begin().await?;
    let update = sqlx::query("UPDATE monsters SET status = ?, archived_at = ?, document_json = ?, content_hash = ?, updated_at = ?, row_version = row_version + 1 WHERE id = ? AND row_version = ? AND status <> 'trashed'")
        .bind(status)
        .bind(archived_at)
        .bind(serde_json::to_string(&document).map_err(|_| AppError::internal("MONSTER_SERIALIZATION_FAILED", "Não foi possível preparar a ficha."))?)
        .bind(document["contentHash"].as_str().unwrap_or_default())
        .bind(now)
        .bind(&id)
        .bind(expected_row_version)
        .execute(&mut *transaction)
        .await?;
    if update.rows_affected() != 1 {
        let _ = transaction.rollback().await;
        return Err(conflict());
    }
    transaction.commit().await?;
    get_by_id(&pool, state.app_data_dir(), &id).await
}

#[tauri::command]
pub async fn monster_move_to_trash(
    state: tauri::State<'_, AppState>,
    id: String,
    expected_row_version: i64,
) -> AppResult<()> {
    let pool = state.pool().await?;
    let row = fetch_monster(&pool, &id, true).await?;
    if row.row_version != expected_row_version || row.status == "trashed" {
        return Err(conflict());
    }
    let previous_status = row.status.clone();
    let document = update_document_state(
        parse_document(&row.document_json)?,
        "trashed",
        row.row_version + 1,
    )?;
    let now = OffsetDateTime::now_utc();
    let deleted_at = format_time(now)?;
    let purge_after = format_time(now + Duration::days(30))?;
    let mut transaction = pool.begin().await?;
    let result = sqlx::query("UPDATE monsters SET status = 'trashed', previous_status = ?, archived_at = NULL, deleted_at = ?, purge_after = ?, document_json = ?, content_hash = ?, updated_at = ?, row_version = row_version + 1 WHERE id = ? AND row_version = ? AND status <> 'trashed'")
        .bind(previous_status)
        .bind(&deleted_at)
        .bind(purge_after)
        .bind(serde_json::to_string(&document).map_err(|_| AppError::internal("MONSTER_SERIALIZATION_FAILED", "Não foi possível preparar a ficha."))?)
        .bind(document["contentHash"].as_str().unwrap_or_default())
        .bind(&deleted_at)
        .bind(&id)
        .bind(expected_row_version)
        .execute(&mut *transaction)
        .await?;
    if result.rows_affected() != 1 {
        let _ = transaction.rollback().await;
        return Err(conflict());
    }
    transaction.commit().await?;
    Ok(())
}

#[tauri::command]
pub async fn monster_restore(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    let pool = state.pool().await?;
    let row = fetch_monster(&pool, &id, true).await?;
    if row.status != "trashed" {
        return Err(not_found());
    }
    let now = OffsetDateTime::now_utc();
    let now_text = format_time(now)?;
    let purge_after = parse_time(row.purge_after.as_deref()).ok_or_else(not_found)?;
    if purge_after <= now {
        return Err(AppError::new(
            "MONSTER_PURGE_EXPIRED",
            "O prazo de restauração deste monstro terminou.",
        ));
    }
    let status = row.previous_status.as_deref().unwrap_or("active");
    let document = update_document_state(
        parse_document(&row.document_json)?,
        status,
        row.row_version + 1,
    )?;
    let archived_at = if status == "archived" {
        Some(now_text.clone())
    } else {
        None
    };
    let result = sqlx::query("UPDATE monsters SET status = ?, previous_status = NULL, archived_at = ?, deleted_at = NULL, purge_after = NULL, document_json = ?, content_hash = ?, updated_at = ?, row_version = row_version + 1 WHERE id = ? AND status = 'trashed' AND row_version = ? AND purge_after > ?")
        .bind(status)
        .bind(archived_at)
        .bind(serde_json::to_string(&document).map_err(|_| AppError::internal("MONSTER_SERIALIZATION_FAILED", "Não foi possível preparar a ficha."))?)
        .bind(document["contentHash"].as_str().unwrap_or_default())
        .bind(&now_text)
        .bind(&id)
        .bind(row.row_version)
        .bind(&now_text)
        .execute(&pool)
        .await?;
    if result.rows_affected() != 1 {
        return Err(conflict());
    }
    Ok(())
}

#[tauri::command]
pub async fn monster_delete_permanently(
    state: tauri::State<'_, AppState>,
    id: String,
    confirmation_name: String,
) -> AppResult<()> {
    let pool = state.pool().await?;
    let row = fetch_monster(&pool, &id, true).await?;
    if row.status != "trashed" {
        return Err(AppError::new(
            "MONSTER_MUST_BE_TRASHED",
            "Envie o monstro à lixeira antes de excluí-lo definitivamente.",
        ));
    }
    let name = row.name.clone();
    if confirmation_name != name {
        return Err(AppError::new(
            "CONFIRMATION_NAME_MISMATCH",
            "Digite o nome exato do monstro para confirmar a exclusão.",
        ));
    }
    let mut transaction = pool.begin().await?;
    let result = sqlx::query("DELETE FROM monsters WHERE id = ? AND status = 'trashed'")
        .bind(&id)
        .execute(&mut *transaction)
        .await?;
    if result.rows_affected() != 1 {
        let _ = transaction.rollback().await;
        return Err(not_found());
    }
    transaction.commit().await?;
    cleanup_or_enqueue(&pool, state.app_data_dir(), &monster_directory_path(&id)).await
}

async fn fetch_monster(
    pool: &SqlitePool,
    id: &str,
    include_trashed: bool,
) -> AppResult<MonsterDbRow> {
    let trashed_clause = if include_trashed {
        ""
    } else {
        " AND m.status <> 'trashed'"
    };
    let query = format!(
        "SELECT m.library_id, m.name, m.status, m.previous_status, m.document_json, m.image_path, m.purge_after, m.row_version FROM monsters m JOIN libraries l ON l.id = m.library_id WHERE m.id = ? AND l.deleted_at IS NULL{trashed_clause}"
    );
    sqlx::query_as::<_, MonsterDbRow>(AssertSqlSafe(query.as_str()))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(not_found)
}

#[derive(FromRow)]
struct MonsterDbRow {
    library_id: String,
    name: String,
    status: String,
    previous_status: Option<String>,
    document_json: String,
    image_path: Option<String>,
    purge_after: Option<String>,
    row_version: i64,
}

async fn get_by_id(pool: &SqlitePool, app_data_dir: &Path, id: &str) -> AppResult<MonsterDto> {
    let row = fetch_monster(pool, id, false).await?;
    to_dto_db(row, app_data_dir)
}

fn parse_document(serialized: &str) -> AppResult<Value> {
    serde_json::from_str(serialized).map_err(|_| {
        AppError::internal(
            "MONSTER_DOCUMENT_CORRUPT",
            "O documento salvo desta ficha está inválido.",
        )
    })
}

fn set_common_fields(
    document: &mut Value,
    id: &str,
    library_id: &str,
    system_code: &str,
    status: &str,
    row_version: i64,
    created_at: &str,
    updated_at: &str,
) -> AppResult<()> {
    let object = document.as_object_mut().ok_or_else(|| {
        AppError::new(
            "MONSTER_DOCUMENT_INVALID",
            "A ficha deve ser um objeto JSON.",
        )
    })?;
    object.insert("id".into(), json!(id));
    object.insert("libraryId".into(), json!(library_id));
    object.insert("systemCode".into(), json!(system_code));
    object.insert("schemaKey".into(), json!(schema_key(system_code)?));
    object.insert("schemaVersion".into(), json!(1));
    object.insert("status".into(), json!(status));
    object.insert("createdAt".into(), json!(created_at));
    object.insert("updatedAt".into(), json!(updated_at));
    object.insert("rowVersion".into(), json!(row_version));
    Ok(())
}

fn set_image_metadata(document: &mut Value, id: &str, image: Option<&NormalizedLibraryImage>) {
    if image.is_none() {
        document["image"] = Value::Null;
    } else if let Some(image) = image {
        document["image"] = json!({
            "path": monster_image_path(id), "mediaType": "image/webp", "width": image.width,
            "height": image.height, "sha256": image.sha256,
        });
    }
}

fn update_document_state(mut document: Value, status: &str, row_version: i64) -> AppResult<Value> {
    let now = format_time(OffsetDateTime::now_utc())?;
    document["status"] = json!(status);
    document["updatedAt"] = json!(now);
    document["rowVersion"] = json!(row_version);
    document["contentHash"] = json!(canonical_hash(&document)?);
    validate_monster(&document)?;
    Ok(document)
}

async fn ensure_library_system(pool: &SqlitePool, id: &str, expected: &str) -> AppResult<()> {
    if !matches!(expected, "add2e" | "shadowlords3e") {
        return Err(AppError::new(
            "MONSTER_SYSTEM_INVALID",
            "O sistema da ficha nÃ£o Ã© reconhecido.",
        ));
    }
    let system: Option<String> =
        sqlx::query_scalar("SELECT system_code FROM libraries WHERE id = ? AND deleted_at IS NULL")
            .bind(id)
            .fetch_optional(pool)
            .await?;
    match system.as_deref() {
        Some(actual) if actual == expected => Ok(()),
        Some(_) => Err(AppError::new(
            "MONSTER_SYSTEM_MISMATCH",
            "O sistema da ficha precisa corresponder ao sistema da biblioteca.",
        )),
        None => Err(AppError::new(
            "LIBRARY_NOT_FOUND",
            "A biblioteca não foi encontrada ou está na lixeira.",
        )),
    }
}

fn schema_key(system_code: &str) -> AppResult<&'static str> {
    match system_code {
        "add2e" => Ok("add2e.monster"),
        "shadowlords3e" => Ok("shadowlords3e.monster"),
        _ => Err(AppError::new(
            "MONSTER_SYSTEM_INVALID",
            "O sistema da ficha nÃ£o Ã© reconhecido.",
        )),
    }
}

async fn sync_profiles(
    transaction: &mut Transaction<'_, Sqlite>,
    monster_id: &str,
    document: &Value,
) -> AppResult<()> {
    let profiles = document
        .get("profiles")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            AppError::new(
                "MONSTER_PROFILES_INVALID",
                "A ficha precisa conter ao menos um perfil.",
            )
        })?;
    for profile in profiles {
        let id = string_at(profile, "id")?;
        let frequency = profile.get("frequency").ok_or_else(invalid_document)?;
        let statistics = profile.get("statistics").ok_or_else(invalid_document)?;
        let profile_json = canonical_hash(profile)?;
        sqlx::query("INSERT INTO monster_profiles (id, monster_id, label, kind, is_primary, sort_order, frequency_code, frequency_other, organization, diet, quantity_encounter, size_text, morale_text, treasure_text, climate_terrain_notes, activity_notes, special_defenses_summary, magic_protection_summary, stats_json, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(id)
            .bind(monster_id)
            .bind(string_at(profile, "label")?)
            .bind(string_at(profile, "kind")?)
            .bind(i64::from(profile.get("isPrimary").and_then(Value::as_bool).unwrap_or(false)))
            .bind(profile.get("sortOrder").and_then(Value::as_i64).unwrap_or(0))
            .bind(string_at(frequency, "code")?)
            .bind(nullable_string_at(frequency, "other"))
            .bind(string_at(profile, "organization")?)
            .bind(string_at(profile, "diet")?)
            .bind(string_at(profile, "quantityEncounter")?)
            .bind(string_at(profile, "size")?)
            .bind(scalar_string_at(profile, "morale")?)
            .bind(string_at(profile, "treasure")?)
            .bind(nullable_string_at(profile, "climateTerrainNotes"))
            .bind(nullable_string_at(profile, "activityNotes"))
            .bind(string_at(profile, "specialDefensesSummary").or_else(|_| string_at(statistics, "specialDefenses"))?)
            .bind(string_at(profile, "magicProtectionSummary").or_else(|_| string_at(statistics, "magicResistance"))?)
            .bind(serde_json::to_string(statistics).map_err(|_| invalid_document())?)
            .bind(profile_json)
            .execute(&mut **transaction)
            .await?;
        for (table, property) in [
            ("profile_climates", "climates"),
            ("profile_terrains", "terrains"),
            ("profile_activity_periods", "activityPeriods"),
        ] {
            let entries = profile
                .get(property)
                .and_then(Value::as_array)
                .ok_or_else(invalid_document)?;
            for entry in entries {
                let query = match table {
                    "profile_climates" => {
                        "INSERT INTO profile_climates (profile_id, code, other_text) VALUES (?, ?, ?)"
                    }
                    "profile_terrains" => {
                        "INSERT INTO profile_terrains (profile_id, code, other_text) VALUES (?, ?, ?)"
                    }
                    _ => {
                        "INSERT INTO profile_activity_periods (profile_id, code, other_text) VALUES (?, ?, ?)"
                    }
                };
                sqlx::query(query)
                    .bind(id)
                    .bind(string_at(entry, "code")?)
                    .bind(nullable_string_at(entry, "other"))
                    .execute(&mut **transaction)
                    .await?;
            }
        }
    }
    Ok(())
}

fn string_at<'a>(value: &'a Value, key: &str) -> AppResult<&'a str> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(invalid_document)
}

fn scalar_string_at(value: &Value, key: &str) -> AppResult<String> {
    value
        .get(key)
        .filter(|value| value.is_string() || value.is_number())
        .map(|value| {
            value
                .as_str()
                .map(str::to_owned)
                .unwrap_or_else(|| value.to_string())
        })
        .ok_or_else(invalid_document)
}

fn nullable_string_at(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_owned)
}

fn invalid_document() -> AppError {
    AppError::new(
        "MONSTER_DOCUMENT_INVALID",
        "A ficha contém dados fora do contrato AD&D.",
    )
}
fn validate_name(value: &str) -> AppResult<String> {
    let name = value.trim();
    if name.is_empty() || name.chars().count() > 120 {
        return Err(AppError::new(
            "MONSTER_NAME_INVALID",
            "O nome deve ter de 1 a 120 caracteres.",
        ));
    }
    Ok(name.to_owned())
}

fn normalize_sort_name(name: &str) -> String {
    name.trim()
        .nfd()
        .filter(|character| !is_combining_mark(*character))
        .flat_map(char::to_lowercase)
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn stage_monster_image(
    app_data_dir: &Path,
    id: &str,
    image: Option<&NormalizedLibraryImage>,
) -> AppResult<StagedImageChange> {
    StagedImageChange::stage_at(
        app_data_dir,
        &monster_directory_path(id),
        "main.webp",
        "thumb.webp",
        image,
    )
}

fn monster_image_path(id: &str) -> String {
    format!("{}/main.webp", monster_directory_path(id))
}
fn monster_directory_path(id: &str) -> String {
    format!("images/monsters/{id}")
}

fn thumbnail_data_url(app_data_dir: &Path, image_path: Option<&str>) -> Option<String> {
    let relative = image_path?
        .strip_suffix("main.webp")
        .map(|prefix| format!("{prefix}thumb.webp"))?;
    let path = safe_app_path(app_data_dir, &relative)?;
    fs::read(path)
        .ok()
        .map(|bytes| format!("data:image/webp;base64,{}", STANDARD.encode(bytes)))
}

fn main_image_data_url(app_data_dir: &Path, image_path: Option<&str>) -> Option<String> {
    let path = safe_app_path(app_data_dir, image_path?)?;
    fs::read(path)
        .ok()
        .map(|bytes| format!("data:image/webp;base64,{}", STANDARD.encode(bytes)))
}

fn safe_app_path(root: &Path, relative: &str) -> Option<PathBuf> {
    let path = Path::new(relative);
    if path.is_absolute()
        || path
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return None;
    }
    Some(root.join(path))
}

async fn cleanup_or_enqueue(
    pool: &SqlitePool,
    app_data_dir: &Path,
    relative: &str,
) -> AppResult<()> {
    let path = safe_app_path(app_data_dir, relative).ok_or_else(|| {
        AppError::internal(
            "UNSAFE_STORAGE_PATH",
            "O caminho local do monstro não é válido.",
        )
    })?;
    if !path.exists() {
        return Ok(());
    }
    if let Err(error) = fs::remove_dir_all(&path) {
        log::warn!("Limpeza da imagem do monstro adiada ({})", error.kind());
        sqlx::query(
            "INSERT OR IGNORE INTO file_cleanup_tasks (relative_path, created_at) VALUES (?, ?)",
        )
        .bind(relative)
        .bind(utc_now()?)
        .execute(pool)
        .await?;
    }
    Ok(())
}

fn to_dto_db(row: MonsterDbRow, app_data_dir: &Path) -> AppResult<MonsterDto> {
    let image_data_url = main_image_data_url(app_data_dir, row.image_path.as_deref());
    Ok(MonsterDto {
        document: parse_document(&row.document_json)?,
        image_data_url,
    })
}

fn format_time(value: OffsetDateTime) -> AppResult<String> {
    let format = time::format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3]Z",
    )
    .map_err(|_| {
        AppError::internal(
            "DATETIME_FORMAT_FAILED",
            "O formato de data UTC nÃ£o pÃ´de ser preparado.",
        )
    })?;
    value.format(&format).map_err(|_| {
        AppError::internal(
            "DATETIME_FORMAT_FAILED",
            "Não foi possível gerar o horário UTC.",
        )
    })
}

fn parse_time(value: Option<&str>) -> Option<OffsetDateTime> {
    value.and_then(|value| OffsetDateTime::parse(value, &Rfc3339).ok())
}

fn conflict() -> AppError {
    AppError::new(
        "CONFLICT_ROW_VERSION",
        "A ficha foi alterada em outra operação. Recarregue os dados e tente novamente.",
    )
}
fn not_found() -> AppError {
    AppError::new(
        "MONSTER_NOT_FOUND",
        "O monstro não foi encontrado ou está indisponível.",
    )
}

#[cfg(test)]
mod tests {
    use serde_json::Value;
    use time::OffsetDateTime;

    use super::format_time;
    use crate::monster_validation::validate_add2e;

    #[test]
    fn complete_fixture_survives_json_round_trip() {
        let fixture: Value =
            serde_json::from_str(include_str!("../../fixtures/add2e/valid-monster.json")).unwrap();
        let serialized = serde_json::to_string(&fixture).unwrap();
        let loaded: Value = serde_json::from_str(&serialized).unwrap();
        assert_eq!(loaded, fixture);
        assert!(validate_add2e(&loaded).is_ok());
    }

    #[test]
    fn generated_timestamps_match_the_versioned_schema_precision() {
        let mut fixture: Value =
            serde_json::from_str(include_str!("../../fixtures/add2e/valid-monster.json")).unwrap();
        fixture["updatedAt"] = serde_json::json!(format_time(OffsetDateTime::now_utc()).unwrap());
        assert!(validate_add2e(&fixture).is_ok());
    }
}
