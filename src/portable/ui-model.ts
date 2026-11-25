import type { ImportInspection, ImportProgress } from '../infrastructure/portable';

export const phaseLabels: Record<ImportProgress['phase'], string> = { 'validating-package': 'Validando pacote', 'checking-files': 'Verificando arquivos', 'preparing-images': 'Preparando imagens', 'importing-records': 'Importando fichas', finalizing: 'Finalizando', completed: 'Concluído' };
export type RenamePreview = { sourceName: string; finalName: string; renamed: boolean; status: 'active' | 'archived' };
export function buildRenamePreview(inspection: ImportInspection): RenamePreview[] { return inspection.monstersPreview.map((item) => ({ ...item, renamed: item.sourceName !== item.finalName })); }
export function progressLabel(progress: ImportProgress): string { return phaseLabels[progress.phase]; }
