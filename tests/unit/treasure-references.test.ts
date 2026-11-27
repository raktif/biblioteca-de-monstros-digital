import { describe, expect, it } from 'vitest';
import { treasureCatalogs } from '../../src/domain/treasure-catalogs';
import { parseTreasureReferences } from '../../src/domain/treasure-references';

describe('referências de tesouro', () => {
  it('reconhece letras separadas por vírgula ou hífen e multiplicadores', () => {
    expect(parseTreasureReferences('H-I; V x 4')).toEqual([
      { kind: 'reference', value: 'H', code: 'H', multiplier: null },
      { kind: 'text', value: '-' },
      { kind: 'reference', value: 'I', code: 'I', multiplier: null },
      { kind: 'text', value: '; ' },
      { kind: 'reference', value: 'V x 4', code: 'V', multiplier: 4 },
    ]);
  });

  it('preserva palavras e valores legados sem convertê-los em letras', () => {
    expect(parseTreasureReferences('Individual: pequeno')).toEqual([{ kind: 'text', value: 'Individual: pequeno' }]);
  });

  it('mantém catálogos separados e as correções editoriais confirmadas', () => {
    expect(treasureCatalogs.add2e.entries.G.components.gold?.presence).toEqual({ kind: 'percent', value: 50 });
    expect(treasureCatalogs.add2e.entries.Z.components.silver?.amount).toBe('100');
    expect(treasureCatalogs.add2e.entries.B.components.magic?.amount).toBe('Arma ou Armadura');
    expect(treasureCatalogs.add2e.entries.A.components.gold?.presence.kind).toBe('percent');
    expect(treasureCatalogs.shadowlords3e.entries.A.components.gold?.presence).toEqual({ kind: 'roll-under', dice: '3d6', target: 9 });
  });
});
