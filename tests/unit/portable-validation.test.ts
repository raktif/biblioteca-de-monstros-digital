import { describe, expect, it } from 'vitest';
import add2eFixture from '../../fixtures/add2e/valid-monster.json';
import shadowlordsFixture from '../../fixtures/shadowlords3e/valid-monster.json';
import { validatePortableMonster } from '../../src/portable/validation';

function portableize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(portableize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !['id', 'libraryId', 'systemCode', 'schemaKey', 'schemaVersion', 'rowVersion', 'contentHash', 'createdAt', 'updatedAt', 'deletedAt', 'archivedAt', 'purgeAfter', 'sortOrder', 'imageSourcePath'].includes(key)).map(([key, item]) => [key, portableize(item)]));
  }
  return value;
}

describe('contratos portáteis BMD v1', () => {
  it('valida AD&D sem identidade persistida', () => {
    const monster = portableize(add2eFixture) as Record<string, unknown>;
    const result = validatePortableMonster({ format: 'biblioteca-de-monstros-digital.add2e.monster', formatVersion: 1, kind: 'monster', systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1, monster });
    expect(result).toEqual({ valid: true, issues: [] });
  });

  it('valida Shadowlords e rejeita identidade persistida', () => {
    const monster = portableize(shadowlordsFixture) as Record<string, unknown>;
    const valid = validatePortableMonster({ format: 'biblioteca-de-monstros-digital.shadowlords3e.monster', formatVersion: 1, kind: 'monster', systemCode: 'shadowlords3e', schemaKey: 'shadowlords3e.monster', schemaVersion: 1, monster });
    expect(valid.valid).toBe(true);
    const invalid = structuredClone(monster);
    invalid.id = 'não permitido';
    const rejected = validatePortableMonster({ format: 'biblioteca-de-monstros-digital.shadowlords3e.monster', formatVersion: 1, kind: 'monster', systemCode: 'shadowlords3e', schemaKey: 'shadowlords3e.monster', schemaVersion: 1, monster: invalid });
    expect(rejected.valid).toBe(false);
  });
});
