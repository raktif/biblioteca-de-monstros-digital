use std::{path::PathBuf, time::Duration};

use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
};
use time::{OffsetDateTime, format_description::well_known::Rfc3339};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    libraries,
};

static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

pub struct AppState {
    app_data_dir: PathBuf,
    pool: Mutex<Option<SqlitePool>>,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            pool: Mutex::new(None),
        }
    }

    pub fn app_data_dir(&self) -> &PathBuf {
        &self.app_data_dir
    }

    pub async fn pool(&self) -> AppResult<SqlitePool> {
        let mut guard = self.pool.lock().await;
        if let Some(pool) = guard.as_ref() {
            return Ok(pool.clone());
        }

        let database_dir = self.app_data_dir.join("data");
        let directories = [
            database_dir.clone(),
            self.app_data_dir.join("images/libraries"),
            self.app_data_dir.join("images/monsters"),
            self.app_data_dir.join("staging/imports"),
            self.app_data_dir.join("staging/exports"),
            self.app_data_dir.join("staging/images"),
            self.app_data_dir.join("backups/import-journals"),
            self.app_data_dir.join("logs"),
        ];
        for directory in &directories {
            std::fs::create_dir_all(directory)?;
        }

        let database_path = database_dir.join("library.db");
        let options = SqliteConnectOptions::new()
            .filename(&database_path)
            .create_if_missing(true)
            .foreign_keys(true)
            .journal_mode(SqliteJournalMode::Wal)
            .busy_timeout(Duration::from_secs(5));
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await?;

        if database_path.exists() {
            let migration_table_exists: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = '_sqlx_migrations'",
            )
            .fetch_one(&pool)
            .await?;
            if migration_table_exists > 0 {
                let applied_migrations: i64 =
                    sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE success = 1")
                        .fetch_one(&pool)
                        .await?;
                if applied_migrations > 0 && applied_migrations < MIGRATOR.iter().len() as i64 {
                    let backup_path = database_dir.join("library.db.backup-before-migration");
                    if backup_path.exists() {
                        std::fs::remove_file(&backup_path)?;
                    }
                    let escaped_path = backup_path.to_string_lossy().replace('\'', "''");
                    sqlx::query(&format!("VACUUM INTO '{escaped_path}'"))
                        .execute(&pool)
                        .await?;
                }
            }
        }

        MIGRATOR.run(&pool).await?;
        let installation_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT OR IGNORE INTO app_meta (key, value) VALUES ('installation_id', ?)")
            .bind(installation_id)
            .execute(&pool)
            .await?;
        sqlx::query("INSERT OR IGNORE INTO app_meta (key, value) VALUES ('last_purge_at', '1970-01-01T00:00:00Z')")
            .execute(&pool)
            .await?;

        libraries::run_startup_maintenance(&pool, &self.app_data_dir).await?;
        log::info!("Banco local inicializado e migrações aplicadas.");
        *guard = Some(pool.clone());
        Ok(pool)
    }

    pub async fn run_maintenance(&self) -> AppResult<()> {
        let pool = self.pool().await?;
        libraries::run_startup_maintenance(&pool, &self.app_data_dir).await
    }
}

pub fn utc_now() -> AppResult<String> {
    OffsetDateTime::now_utc().format(&Rfc3339).map_err(|_| {
        AppError::internal(
            "DATETIME_FORMAT_FAILED",
            "Não foi possível gerar o horário UTC.",
        )
    })
}

#[cfg(test)]
mod tests {
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

    #[tokio::test]
    async fn initial_migration_seeds_supported_systems_and_constraints() {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(
                SqliteConnectOptions::new()
                    .filename(":memory:")
                    .foreign_keys(true),
            )
            .await
            .unwrap();
        super::MIGRATOR.run(&pool).await.unwrap();
        let systems: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM systems WHERE enabled = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(systems, 2);

        let bad_system = sqlx::query("INSERT INTO libraries (id, system_code, name, sort_name, created_at, updated_at) VALUES ('x', 'unknown', 'Test', 'test', 'now', 'now')")
            .execute(&pool)
            .await;
        assert!(bad_system.is_err());

        let library_id = "4e5ac62a-29d5-4b2e-89a7-6ff2d2e0c75a";
        sqlx::query("INSERT INTO libraries (id, system_code, name, sort_name, created_at, updated_at) VALUES (?, 'shadowlords3e', 'Biblioteca Shadowlords', 'biblioteca shadowlords', '2026-11-24T00:00:00Z', '2026-11-24T00:00:00Z')")
            .bind(library_id)
            .execute(&pool)
            .await
            .unwrap();
        let mut document: serde_json::Value = serde_json::from_str(include_str!(
            "../../fixtures/shadowlords3e/valid-monster.json"
        ))
        .unwrap();
        document["libraryId"] = serde_json::json!(library_id);
        document["rowVersion"] = serde_json::json!(1);
        sqlx::query("INSERT INTO monsters (id, library_id, name, sort_name, status, schema_key, schema_version, document_json, content_hash, created_at, updated_at, row_version) VALUES (?, ?, ?, ?, 'active', 'shadowlords3e.monster', 1, ?, ?, ?, ?, 1)")
            .bind(document["id"].as_str().unwrap())
            .bind(library_id)
            .bind(document["name"].as_str().unwrap())
            .bind("vigia de junco")
            .bind(serde_json::to_string(&document).unwrap())
            .bind(document["contentHash"].as_str().unwrap())
            .bind(document["createdAt"].as_str().unwrap())
            .bind(document["updatedAt"].as_str().unwrap())
            .execute(&pool)
            .await
            .expect("migration must allow Shadowlords monster documents");
    }
}
