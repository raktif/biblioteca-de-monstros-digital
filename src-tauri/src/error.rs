use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: &'static str,
    pub message: String,
    pub correlation_id: String,
}

pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            correlation_id: Uuid::new_v4().to_string(),
        }
    }

    pub fn internal(code: &'static str, message: impl Into<String>) -> Self {
        let error = Self::new(code, message);
        log::error!("{} [{}]", error.code, error.correlation_id);
        error
    }
}

impl From<std::io::Error> for AppError {
    fn from(_: std::io::Error) -> Self {
        Self::internal(
            "FILE_OPERATION_FAILED",
            "Não foi possível acessar os arquivos locais.",
        )
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        log::error!("Falha SQLite: {error}");
        Self::internal(
            "DB_OPERATION_FAILED",
            "Não foi possível concluir a operação no banco de dados.",
        )
    }
}

impl From<sqlx::migrate::MigrateError> for AppError {
    fn from(error: sqlx::migrate::MigrateError) -> Self {
        log::error!("Falha em migração SQLite: {error}");
        Self::internal(
            "DB_MIGRATION_FAILED",
            "Não foi possível preparar o banco de dados local.",
        )
    }
}
