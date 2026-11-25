import { invoke, isTauri } from '@tauri-apps/api/core';
import type { SystemCode } from './libraries';

export type ImportInspection = { packageKind: 'library' | 'monster'; systemCode: SystemCode; schemaKey: string; schemaVersion: number; libraryName: string | null; monsterCount: number; activeCount: number; archivedCount: number; imageCount: number; compressedBytes: number; uncompressedBytes: number; sameZipImportedBefore: boolean; previousImportAt: string | null; warnings: string[]; errors: string[]; monstersPreview: Array<{ sourceName: string; finalName: string; status: 'active' | 'archived' }> };
export type ImportProgress = { phase: 'validating-package' | 'checking-files' | 'preparing-images' | 'importing-records' | 'finalizing' | 'completed'; completed: number | null; total: number | null; message: string };
export type ImportReport = { operationId: string; importedMonsterCount: number; renamedMonsterCount: number; warningCount: number; createdLibraryId: string | null; targetLibraryId: string | null; openedMonsterId: string | null; warnings: string[] };
export type ImportOptions = { planId: string; targetLibraryId?: string; createLibrary?: boolean };

function desktopOnly(): never { throw { code: 'DESKTOP_REQUIRED', message: 'A importação e a exportação estão disponíveis somente no aplicativo desktop.' }; }
export async function inspectPackage(path: string): Promise<ImportInspection> { return isTauri() ? invoke<ImportInspection>('import_package_inspect', { path }) : desktopOnly(); }
export async function importLibrary(options: ImportOptions): Promise<ImportReport> { return isTauri() ? invoke<ImportReport>('import_library_execute', options) : desktopOnly(); }
export async function importMonster(options: ImportOptions): Promise<ImportReport> { return isTauri() ? invoke<ImportReport>('import_monster_execute', options) : desktopOnly(); }
export async function cancelImport(planId: string): Promise<void> { if (isTauri()) await invoke('import_package_cancel', { planId }); else desktopOnly(); }
export async function getImportReport(operationId: string): Promise<ImportReport> { return isTauri() ? invoke<ImportReport>('import_report_get', { operationId }) : desktopOnly(); }
