import { describe, expect, it } from 'vitest';
import { buildRenamePreview, phaseLabels, progressLabel } from '../../src/portable/ui-model';
import type { ImportInspection } from '../../src/infrastructure/portable';

const inspection = { monstersPreview: [{ sourceName: 'Goblin', finalName: 'Goblin - Importado', status: 'active' }], packageKind: 'library', systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1, libraryName: 'Teste', monsterCount: 1, activeCount: 1, archivedCount: 0, imageCount: 0, compressedBytes: 1, uncompressedBytes: 1, sameZipImportedBefore: false, previousImportAt: null, warnings: [], errors: [] } as ImportInspection;

describe('modelo da interface de importação', () => {
  it('marca renomeações sem permitir edição na prévia', () => { expect(buildRenamePreview(inspection)[0].renamed).toBe(true); });
  it('fornece rótulos para todas as fases', () => { expect(Object.keys(phaseLabels)).toHaveLength(6); expect(progressLabel({ phase: 'checking-files', completed: null, total: null, message: '' })).toBe('Verificando arquivos'); });
});
