mod database;
mod error;
mod images;
mod libraries;
mod monster_validation;
mod monsters;
#[allow(dead_code)]
mod portable;

use std::path::PathBuf;

use database::AppState;
use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInfo {
    environment: &'static str,
    app_version: &'static str,
}

#[tauri::command]
async fn app_initialize(state: tauri::State<'_, AppState>) -> Result<RuntimeInfo, error::AppError> {
    state.pool().await?;
    Ok(RuntimeInfo {
        environment: "desktop",
        app_version: env!("CARGO_PKG_VERSION"),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .max_file_size(2 * 1024 * 1024)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5))
                .targets([tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("biblioteca-monstros-digital".into()),
                    },
                )])
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let app_data_dir: PathBuf = app.path().app_data_dir()?;
            app.manage(AppState::new(app_data_dir));
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let period = std::time::Duration::from_secs(60 * 60);
                let start = tokio::time::Instant::now() + period;
                let mut interval = tokio::time::interval_at(start, period);
                loop {
                    interval.tick().await;
                    if let Some(state) = app_handle.try_state::<AppState>() {
                        if let Err(error) = state.run_maintenance().await {
                            log::error!(
                                "Manutenção local falhou: {} [{}]",
                                error.code,
                                error.correlation_id
                            );
                        }
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_initialize,
            libraries::library_list,
            libraries::library_get,
            libraries::library_create,
            libraries::library_update,
            libraries::library_move_to_trash,
            libraries::library_restore,
            libraries::library_delete_permanently,
            libraries::library_trash_list,
            monsters::monster_list,
            monsters::monster_get,
            monsters::monster_create,
            monsters::monster_update,
            monsters::monster_set_archived,
            monsters::monster_move_to_trash,
            monsters::monster_restore,
            monsters::monster_delete_permanently,
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar Biblioteca de Monstros Digital");
}
