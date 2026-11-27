import type { SystemCode } from './libraries';
import { cancelPortableImport, executePortableImportBatch, inspectPortableFile } from '../portable/package-import';

export type ImportInspection = { packageKind: 'library' | 'monster'; systemCode: SystemCode; schemaKey: string; schemaVersion: number; libraryName: string | null; monsterCount: number; activeCount: number; archivedCount: number; imageCount: number; compressedBytes: number; uncompressedBytes: number; sameZipImportedBefore: boolean; previousImportAt: string | null; warnings: string[]; errors: string[]; monstersPreview: Array<{ sourceName: string; finalName: string; status: 'active' | 'archived' }> };
export type ImportProgress = { phase: 'validating-package' | 'checking-files' | 'preparing-images' | 'importing-records' | 'finalizing' | 'completed'; completed: number | null; total: number | null; message: string };
export type ImportReport = { operationId: string; importedMonsterCount: number; renamedMonsterCount: number; warningCount: number; createdLibraryId: string | null; targetLibraryId: string | null; openedMonsterId: string | null; warnings: string[]; importedMonsterIds?: string[] };

export async function inspectPackage(file: File, targetLibraryId?: string): Promise<{ planId: string; inspection: ImportInspection }> { return inspectPortableFile(file, targetLibraryId); }
export async function importPackageBatch(items: Array<{ planId: string; targetLibraryId?: string; createLibrary?: boolean }>, kind: 'library' | 'monster'): Promise<ImportReport> { return executePortableImportBatch(items, kind); }
export async function cancelImport(planId: string): Promise<void> { cancelPortableImport(planId); }
