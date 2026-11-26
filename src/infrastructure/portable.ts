import type { SystemCode } from './libraries';
import { cancelPortableImport, executePortableImport, getPortableImportReport, inspectPortableFile } from '../portable/package-import';

export type ImportInspection = { packageKind: 'library' | 'monster'; systemCode: SystemCode; schemaKey: string; schemaVersion: number; libraryName: string | null; monsterCount: number; activeCount: number; archivedCount: number; imageCount: number; compressedBytes: number; uncompressedBytes: number; sameZipImportedBefore: boolean; previousImportAt: string | null; warnings: string[]; errors: string[]; monstersPreview: Array<{ sourceName: string; finalName: string; status: 'active' | 'archived' }> };
export type ImportProgress = { phase: 'validating-package' | 'checking-files' | 'preparing-images' | 'importing-records' | 'finalizing' | 'completed'; completed: number | null; total: number | null; message: string };
export type ImportReport = { operationId: string; importedMonsterCount: number; renamedMonsterCount: number; warningCount: number; createdLibraryId: string | null; targetLibraryId: string | null; openedMonsterId: string | null; warnings: string[] };
export type ImportOptions = { planId: string; targetLibraryId?: string; createLibrary?: boolean };

export async function inspectPackage(file: File, targetLibraryId?: string): Promise<{ planId: string; inspection: ImportInspection }> { return inspectPortableFile(file, targetLibraryId); }
export async function importLibrary(options: ImportOptions): Promise<ImportReport> { return executePortableImport(options, 'library'); }
export async function importMonster(options: ImportOptions): Promise<ImportReport> { return executePortableImport(options, 'monster'); }
export async function cancelImport(planId: string): Promise<void> { cancelPortableImport(planId); }
export async function getImportReport(operationId: string): Promise<ImportReport> {
  const report = getPortableImportReport(operationId);
  if (!report) throw { code: 'IMPORT_REPORT_NOT_FOUND', message: 'O relatório não foi encontrado nesta sessão.' };
  return report;
}
