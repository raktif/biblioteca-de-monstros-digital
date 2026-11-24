use std::{
    fs,
    path::{Path, PathBuf},
};

use base64::{Engine as _, engine::general_purpose::STANDARD};
use serde::Serialize;
use sqlx::{FromRow, SqlitePool};
use time::{Duration, OffsetDateTime, format_description::well_known::Rfc3339};
use unicode_normalization::{UnicodeNormalization, char::is_combining_mark};
use uuid::Uuid;

use crate::{
    database::{AppState, utc_now},
    error::{AppError, AppResult},
    images::{NormalizedLibraryImage, StagedLibraryImageChange},
};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDto {
    pub id: String,
    pub system_code: String,
    pub system_name: String,
    pub name: String,
    pub image_data_url: Option<String>,
    pub active_monster_count: i64,
    pub total_monster_count: i64,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub purge_after: Option<String>,
    pub row_version: i64,
}

#[derive(FromRow)]
struct LibraryRow {
    id: String,
    system_code: String,
    system_name: String,
    name: String,
    image_path: Option<String>,
    active_monster_count: i64,
    total_monster_count: i64,
    created_at: String,
    updated_at: String,
    deleted_at: Option<String>,
    purge_after: Option<String>,
    row_version: i64,
}

const LIBRARY_SELECT: &str = "
    SELECT l.id, l.system_code, s.display_name AS system_name, l.name, l.image_path,
           (SELECT COUNT(*) FROM monsters m WHERE m.library_id = l.id AND m.status = 'active') AS active_monster_count,
           (SELECT COUNT(*) FROM monsters m WHERE m.library_id = l.id) AS total_monster_count,
           l.created_at, l.updated_at, l.deleted_at, l.purge_after, l.row_version
    FROM libraries l JOIN systems s ON s.code = l.system_code
";

pub async fn library_list(state: tauri::State<'_, AppState>) -> AppResult<Vec<LibraryDto>> {
    let pool = state.pool().await?;
    let query = format!(
        "{LIBRARY_SELECT} WHERE l.deleted_at IS NULL ORDER BY l.sort_name COLLATE BINARY, l.created_at, l.id"
    );
    let rows = sqlx::query_as::<_, LibraryRow>(&query)
        .fetch_all(&pool)
        .await?;
    rows.into_iter()
        .map(|row| to_dto(row, state.app_data_dir()))
        .collect()
}

pub async fn library_get(state: tauri::State<'_, AppState>, id: String) -> AppResult<LibraryDto> {
    let pool = state.pool().await?;
    let query = format!("{LIBRARY_SELECT} WHERE l.id = ? AND l.deleted_at IS NULL");
    let row = sqlx::query_as::<_, LibraryRow>(&query)
        .bind(id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(not_found)?;
    to_dto(row, state.app_data_dir())
}

pub async fn library_trash_list(state: tauri::State<'_, AppState>) -> AppResult<Vec<LibraryDto>> {
    let pool = state.pool().await?;
    let query = format!(
        "{LIBRARY_SELECT} WHERE l.deleted_at IS NOT NULL AND l.purge_after > ? ORDER BY l.purge_after, l.sort_name COLLATE BINARY, l.id"
    );
    let rows = sqlx::query_as::<_, LibraryRow>(&query)
        .bind(utc_now()?)
        .fetch_all(&pool)
        .await?;
    rows.into_iter()
        .map(|row| to_dto(row, state.app_data_dir()))
        .collect()
}

pub async fn library_create(
    state: tauri::State<'_, AppState>,
    name: String,
    system_code: String,
    image_data_url: Option<String>,
) -> AppResult<LibraryDto> {
    let name = validate_name(name)?;
    let pool = state.pool().await?;
    validate_system(&pool, &system_code).await?;

    let id = Uuid::new_v4().to_string();
    let now = utc_now()?;
    let image = image_data_url
        .as_deref()
        .map(NormalizedLibraryImage::from_data_url)
        .transpose()?;
    let mut file_change = image
        .as_ref()
        .map(|image| StagedLibraryImageChange::stage(state.app_data_dir(), &id, Some(image)))
        .transpose()?;
    let image_path = image.as_ref().map(|_| library_image_path(&id));

    let mut transaction = pool.begin().await?;
    let insert = sqlx::query(
        "INSERT INTO libraries (id, system_code, name, sort_name, image_path, image_hash, image_width, image_height, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&system_code)
    .bind(&name)
    .bind(normalize_sort_name(&name))
    .bind(&image_path)
    .bind(image.as_ref().map(|image| image.sha256.as_str()))
    .bind(image.as_ref().map(|image| i64::from(image.width)))
    .bind(image.as_ref().map(|image| i64::from(image.height)))
    .bind(&now)
    .bind(&now)
    .execute(&mut *transaction)
    .await;

    if let Err(error) = insert {
        let _ = transaction.rollback().await;
        if let Some(change) = file_change.as_mut() {
            change.rollback();
        }
        return Err(error.into());
    }

    if let Some(change) = file_change.as_mut() {
        if let Err(error) = change.apply() {
            let _ = transaction.rollback().await;
            change.rollback();
            return Err(error);
        }
    }

    if let Err(error) = transaction.commit().await {
        if let Some(change) = file_change.as_mut() {
            change.rollback();
        }
        return Err(error.into());
    }
    if let Some(change) = file_change {
        change.finish();
    }

    library_get_by_id(&pool, state.app_data_dir(), &id).await
}

pub async fn library_update(
    state: tauri::State<'_, AppState>,
    id: String,
    name: String,
    system_code: String,
    image_data_url: Option<String>,
    remove_image: bool,
    expected_row_version: i64,
) -> AppResult<LibraryDto> {
    if remove_image && image_data_url.is_some() {
        return Err(AppError::new(
            "INVALID_IMAGE_OPERATION",
            "Escolha uma imagem nova ou remova a capa, mas não faça as duas ações juntas.",
        ));
    }
    let name = validate_name(name)?;
    let pool = state.pool().await?;
    validate_system(&pool, &system_code).await?;

    let current = sqlx::query_as::<_, (String, i64, Option<String>, Option<String>, Option<i64>, Option<i64>)>(
        "SELECT system_code, row_version, image_path, image_hash, image_width, image_height FROM libraries WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(not_found)?;
    if current.1 != expected_row_version {
        return Err(conflict());
    }
    if current.0 != system_code {
        let monster_count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM monsters WHERE library_id = ?")
                .bind(&id)
                .fetch_one(&pool)
                .await?;
        if monster_count > 0 {
            return Err(AppError::new(
                "LIBRARY_SYSTEM_LOCKED",
                "O sistema não pode ser alterado depois que a biblioteca recebeu monstros.",
            ));
        }
    }

    let image = image_data_url
        .as_deref()
        .map(NormalizedLibraryImage::from_data_url)
        .transpose()?;
    let should_change_image = image.is_some() || (remove_image && current.2.is_some());
    let mut file_change = if should_change_image {
        Some(StagedLibraryImageChange::stage(
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
        Some(library_image_path(&id))
    } else {
        current.2.clone()
    };
    let image_hash = if remove_image {
        None
    } else {
        image
            .as_ref()
            .map(|image| image.sha256.clone())
            .or_else(|| current.3.clone())
    };
    let image_width = if remove_image {
        None
    } else {
        image
            .as_ref()
            .map(|image| i64::from(image.width))
            .or(current.4)
    };
    let image_height = if remove_image {
        None
    } else {
        image
            .as_ref()
            .map(|image| i64::from(image.height))
            .or(current.5)
    };

    let mut transaction = pool.begin().await?;
    let update = sqlx::query(
        "UPDATE libraries SET system_code = ?, name = ?, sort_name = ?, image_path = ?, image_hash = ?, image_width = ?, image_height = ?, updated_at = ?, row_version = row_version + 1 WHERE id = ? AND row_version = ? AND deleted_at IS NULL",
    )
    .bind(&system_code)
    .bind(&name)
    .bind(normalize_sort_name(&name))
    .bind(&image_path)
    .bind(image_hash)
    .bind(image_width)
    .bind(image_height)
    .bind(utc_now()?)
    .bind(&id)
    .bind(expected_row_version)
    .execute(&mut *transaction)
    .await;

    let update = match update {
        Ok(result) if result.rows_affected() == 1 => result,
        Ok(_) => {
            let _ = transaction.rollback().await;
            return Err(conflict());
        }
        Err(error) => {
            let _ = transaction.rollback().await;
            return Err(error.into());
        }
    };
    let _ = update;

    if let Some(change) = file_change.as_mut() {
        if let Err(error) = change.apply() {
            let _ = transaction.rollback().await;
            change.rollback();
            return Err(error);
        }
    }
    if let Err(error) = transaction.commit().await {
        if let Some(change) = file_change.as_mut() {
            change.rollback();
        }
        return Err(error.into());
    }
    if let Some(change) = file_change {
        change.finish();
    }

    library_get_by_id(&pool, state.app_data_dir(), &id).await
}

pub async fn library_move_to_trash(
    state: tauri::State<'_, AppState>,
    id: String,
    expected_row_version: i64,
) -> AppResult<()> {
    let pool = state.pool().await?;
    let now = OffsetDateTime::now_utc();
    let deleted_at = format_time(now)?;
    let purge_after = format_time(now + Duration::days(30))?;
    let result = sqlx::query(
        "UPDATE libraries SET deleted_at = ?, purge_after = ?, updated_at = ?, row_version = row_version + 1 WHERE id = ? AND deleted_at IS NULL AND row_version = ?",
    )
    .bind(deleted_at)
    .bind(purge_after)
    .bind(utc_now()?)
    .bind(&id)
    .bind(expected_row_version)
    .execute(&pool)
    .await?;
    if result.rows_affected() != 1 {
        return Err(conflict_or_not_found(&pool, &id).await?);
    }
    Ok(())
}

pub async fn library_restore(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    let pool = state.pool().await?;
    let now = utc_now()?;
    let result = sqlx::query(
        "UPDATE libraries SET deleted_at = NULL, purge_after = NULL, updated_at = ?, row_version = row_version + 1 WHERE id = ? AND deleted_at IS NOT NULL AND purge_after > ?",
    )
    .bind(&now)
    .bind(&id)
    .bind(&now)
    .execute(&pool)
    .await?;
    if result.rows_affected() != 1 {
        let exists: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM libraries WHERE id = ? AND deleted_at IS NOT NULL",
        )
        .bind(&id)
        .fetch_one(&pool)
        .await?;
        if exists == 0 {
            return Err(not_found());
        }
        return Err(AppError::new(
            "LIBRARY_PURGE_EXPIRED",
            "O prazo de restauração desta biblioteca terminou.",
        ));
    }
    Ok(())
}

pub async fn library_delete_permanently(
    state: tauri::State<'_, AppState>,
    id: String,
    confirmation_name: String,
) -> AppResult<()> {
    let pool = state.pool().await?;
    let name = sqlx::query_scalar::<_, String>(
        "SELECT name FROM libraries WHERE id = ? AND deleted_at IS NOT NULL",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(not_found)?;
    if confirmation_name != name {
        return Err(AppError::new(
            "CONFIRMATION_NAME_MISMATCH",
            "Digite o nome exato da biblioteca para confirmar a exclusão.",
        ));
    }

    let mut related_paths = vec![library_directory_path(&id)];
    let monster_ids =
        sqlx::query_scalar::<_, String>("SELECT id FROM monsters WHERE library_id = ?")
            .bind(&id)
            .fetch_all(&pool)
            .await?;
    related_paths.extend(
        monster_ids
            .iter()
            .map(|monster_id| format!("images/monsters/{monster_id}")),
    );
    let mut transaction = pool.begin().await?;
    let result = sqlx::query("DELETE FROM libraries WHERE id = ? AND deleted_at IS NOT NULL")
        .bind(&id)
        .execute(&mut *transaction)
        .await?;
    if result.rows_affected() != 1 {
        let _ = transaction.rollback().await;
        return Err(not_found());
    }
    transaction.commit().await?;
    for relative_path in related_paths {
        cleanup_or_enqueue(&pool, state.app_data_dir(), &relative_path).await?;
    }
    Ok(())
}

pub async fn run_startup_maintenance(pool: &SqlitePool, app_data_dir: &Path) -> AppResult<()> {
    process_cleanup_tasks(pool, app_data_dir).await?;
    let last_purge =
        sqlx::query_scalar::<_, String>("SELECT value FROM app_meta WHERE key = 'last_purge_at'")
            .fetch_one(pool)
            .await?;
    let last_purge =
        OffsetDateTime::parse(&last_purge, &Rfc3339).unwrap_or(OffsetDateTime::UNIX_EPOCH);
    let now = OffsetDateTime::now_utc();
    if now - last_purge < Duration::hours(24) {
        return Ok(());
    }

    let expired = sqlx::query_scalar::<_, String>(
        "SELECT id FROM libraries WHERE purge_after IS NOT NULL AND purge_after <= ?",
    )
    .bind(format_time(now)?)
    .fetch_all(pool)
    .await?;
    if !expired.is_empty() {
        let mut transaction = pool.begin().await?;
        for id in &expired {
            sqlx::query("INSERT OR IGNORE INTO file_cleanup_tasks (relative_path, created_at) VALUES (?, ?)")
                .bind(library_directory_path(id))
                .bind(format_time(now)?)
                .execute(&mut *transaction)
                .await?;
            sqlx::query("DELETE FROM libraries WHERE id = ? AND purge_after <= ?")
                .bind(id)
                .bind(format_time(now)?)
                .execute(&mut *transaction)
                .await?;
        }
        transaction.commit().await?;
    }

    sqlx::query("UPDATE app_meta SET value = ? WHERE key = 'last_purge_at'")
        .bind(format_time(now)?)
        .execute(pool)
        .await?;
    process_cleanup_tasks(pool, app_data_dir).await
}

async fn process_cleanup_tasks(pool: &SqlitePool, app_data_dir: &Path) -> AppResult<()> {
    let tasks = sqlx::query_as::<_, (i64, String)>(
        "SELECT id, relative_path FROM file_cleanup_tasks ORDER BY id",
    )
    .fetch_all(pool)
    .await?;
    for (id, relative_path) in tasks {
        if let Some(path) = safe_app_path(app_data_dir, &relative_path) {
            let removal = if path.is_dir() {
                fs::remove_dir_all(path)
            } else {
                fs::remove_file(path)
            };
            match removal {
                Ok(()) => {
                    sqlx::query("DELETE FROM file_cleanup_tasks WHERE id = ?")
                        .bind(id)
                        .execute(pool)
                        .await?;
                }
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    sqlx::query("DELETE FROM file_cleanup_tasks WHERE id = ?")
                        .bind(id)
                        .execute(pool)
                        .await?;
                }
                Err(error) => {
                    log::warn!("Falha na tarefa de limpeza local {}: {}", id, error.kind())
                }
            }
        } else {
            log::error!(
                "Tarefa de limpeza local recusada por caminho inválido: {}",
                id
            );
            sqlx::query("DELETE FROM file_cleanup_tasks WHERE id = ?")
                .bind(id)
                .execute(pool)
                .await?;
        }
    }
    Ok(())
}

async fn cleanup_or_enqueue(
    pool: &SqlitePool,
    app_data_dir: &Path,
    relative_path: &str,
) -> AppResult<()> {
    let Some(path) = safe_app_path(app_data_dir, relative_path) else {
        return Err(AppError::internal(
            "UNSAFE_STORAGE_PATH",
            "O caminho local da biblioteca não é válido.",
        ));
    };
    if !path.exists() {
        return Ok(());
    }
    if let Err(error) = fs::remove_dir_all(&path) {
        log::warn!(
            "A biblioteca foi removida do banco; limpeza de arquivo adiada ({})",
            error.kind()
        );
        sqlx::query(
            "INSERT OR IGNORE INTO file_cleanup_tasks (relative_path, created_at) VALUES (?, ?)",
        )
        .bind(relative_path)
        .bind(utc_now()?)
        .execute(pool)
        .await?;
    }
    Ok(())
}

fn safe_app_path(root: &Path, relative_path: &str) -> Option<PathBuf> {
    let relative = Path::new(relative_path);
    if relative.is_absolute()
        || relative
            .components()
            .any(|component| !matches!(component, std::path::Component::Normal(_)))
    {
        return None;
    }
    Some(root.join(relative))
}

async fn library_get_by_id(
    pool: &SqlitePool,
    app_data_dir: &Path,
    id: &str,
) -> AppResult<LibraryDto> {
    let query = format!("{LIBRARY_SELECT} WHERE l.id = ? AND l.deleted_at IS NULL");
    let row = sqlx::query_as::<_, LibraryRow>(&query)
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(not_found)?;
    to_dto(row, app_data_dir)
}

fn to_dto(row: LibraryRow, app_data_dir: &Path) -> AppResult<LibraryDto> {
    let image_data_url = row.image_path.as_deref().and_then(|relative_path| {
        let thumbnail_path = relative_path
            .strip_suffix("cover.webp")
            .map(|prefix| format!("{prefix}thumb.webp"))?;
        let path = safe_app_path(app_data_dir, &thumbnail_path)?;
        match fs::read(path) {
            Ok(bytes) => Some(format!("data:image/webp;base64,{}", STANDARD.encode(bytes))),
            Err(error) => {
                log::warn!(
                    "Capa da biblioteca indisponível ({}): {}",
                    row.id,
                    error.kind()
                );
                None
            }
        }
    });
    Ok(LibraryDto {
        id: row.id,
        system_code: row.system_code,
        system_name: row.system_name,
        name: row.name,
        image_data_url,
        active_monster_count: row.active_monster_count,
        total_monster_count: row.total_monster_count,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        purge_after: row.purge_after,
        row_version: row.row_version,
    })
}

async fn validate_system(pool: &SqlitePool, system_code: &str) -> AppResult<()> {
    let enabled: Option<i64> = sqlx::query_scalar("SELECT enabled FROM systems WHERE code = ?")
        .bind(system_code)
        .fetch_optional(pool)
        .await?;
    if enabled == Some(1) {
        Ok(())
    } else {
        Err(AppError::new(
            "SYSTEM_NOT_FOUND",
            "Selecione um sistema disponível.",
        ))
    }
}

fn validate_name(name: String) -> AppResult<String> {
    let name = name.trim().to_owned();
    let length = name.chars().count();
    if !(1..=120).contains(&length) {
        return Err(AppError::new(
            "LIBRARY_NAME_INVALID",
            "O nome deve ter de 1 a 120 caracteres.",
        ));
    }
    Ok(name)
}

fn normalize_sort_name(name: &str) -> String {
    let normalized: String = name
        .trim()
        .nfd()
        .filter(|character| !is_combining_mark(*character))
        .flat_map(char::to_lowercase)
        .collect();
    normalized.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn format_time(value: OffsetDateTime) -> AppResult<String> {
    value.format(&Rfc3339).map_err(|_| {
        AppError::internal(
            "DATETIME_FORMAT_FAILED",
            "Não foi possível gerar o horário UTC.",
        )
    })
}

fn library_image_path(id: &str) -> String {
    format!("images/libraries/{id}/cover.webp")
}
fn library_directory_path(id: &str) -> String {
    format!("images/libraries/{id}")
}
fn not_found() -> AppError {
    AppError::new(
        "LIBRARY_NOT_FOUND",
        "A biblioteca não foi encontrada ou já foi removida.",
    )
}
fn conflict() -> AppError {
    AppError::new(
        "CONFLICT_ROW_VERSION",
        "A biblioteca foi alterada em outra operação. Recarregue os dados e tente novamente.",
    )
}

async fn conflict_or_not_found(pool: &SqlitePool, id: &str) -> AppResult<AppError> {
    let exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM libraries WHERE id = ?")
        .bind(id)
        .fetch_one(pool)
        .await?;
    Ok(if exists == 0 { not_found() } else { conflict() })
}

#[cfg(test)]
mod tests {
    use super::{normalize_sort_name, validate_name};

    #[test]
    fn library_name_trims_and_enforces_character_count() {
        assert_eq!(validate_name("  Dragões  ".into()).unwrap(), "Dragões");
        assert!(validate_name("   ".into()).is_err());
        assert!(validate_name("x".repeat(121)).is_err());
        assert!(validate_name("🧌".repeat(120)).is_ok());
    }

    #[test]
    fn sort_name_ignores_accents_case_and_repeated_spaces() {
        assert_eq!(normalize_sort_name("  Dragões   Azuis "), "dragoes azuis");
        assert_eq!(normalize_sort_name("ÁRVORE"), "arvore");
    }
}
