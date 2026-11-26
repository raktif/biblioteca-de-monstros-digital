import { describe, expect, it } from 'vitest';
import { filterMonsterRows, monsterFilterOptions, normalizeMonsterSearch } from '../../src/app/MonsterBrowser';
import { add2eActivityOptions, add2eTerrainOptions } from '../../src/domain/add2e-vocabularies';
import { activityOptions, terrainOptions } from '../../src/domain/shadowlords-vocabularies';
import type { MonsterSummary } from '../../src/infrastructure/monsters';

describe('normalização da busca da listagem', () => {
  it('oferece nos picklists todos os valores dos campos do sistema, mesmo sem monstros que os usem', () => {
    expect(monsterFilterOptions('add2e', 'terrain').map(([code]) => code)).toEqual(add2eTerrainOptions.map(([code]) => code));
    expect(monsterFilterOptions('add2e', 'activity').map(([code]) => code)).toEqual(add2eActivityOptions.map(([code]) => code));
    expect(monsterFilterOptions('shadowlords3e', 'terrain').map(([code]) => code)).toEqual(terrainOptions.map(([code]) => code));
    expect(monsterFilterOptions('shadowlords3e', 'activity').map(([code]) => code)).toEqual(activityOptions.map(([code]) => code));
  });

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
