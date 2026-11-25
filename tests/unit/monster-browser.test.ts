import { describe, expect, it } from 'vitest';
import { filterMonsterRows, normalizeMonsterSearch } from '../../src/app/MonsterBrowser';
import type { MonsterSummary } from '../../src/infrastructure/monsters';

describe('normalização da busca da listagem', () => {
  it('ignora acentos, caixa e espaços repetidos', () => {
    expect(normalizeMonsterSearch('  DRAGÃO   AZUL ')).toBe('dragao azul');
    expect(normalizeMonsterSearch('Dragao Azul')).toBe('dragao azul');
  });

  it('filtra, ordena e entrega o primeiro lote visual em um acervo de 5.000 registros', () => {
    const rows = Array.from({ length: 5_000 }, (_, index) => ({
      id: `id-${String(index).padStart(5, '0')}`, libraryId: 'library', name: index % 100 === 0 ? `Dragão ${index}` : `Criatura ${index}`,
      editorialCategory: null, status: 'active' as const, imageDataUrl: null,
      updatedAt: '2026-11-25T00:00:00Z', createdAt: `2026-11-${String(index % 28 + 1).padStart(2, '0')}T00:00:00Z`, rowVersion: 1,
      terrains: index % 2 ? ['deserts'] : ['underground'], activityPeriods: index % 3 ? ['night'] : ['day'],
    })) satisfies MonsterSummary[];
    const started = performance.now();
    const matching = filterMonsterRows(rows, 'dragao', ['deserts', 'underground'], ['night'], 'asc');
    const firstPage = matching.slice(0, 100);
    expect(firstPage).toHaveLength(33);
    expect(firstPage.every((row) => row.name.toLowerCase().includes('dragão'))).toBe(true);
    expect(performance.now() - started).toBeLessThan(300);
  });
});
