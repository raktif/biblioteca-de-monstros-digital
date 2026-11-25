import { describe, expect, it } from 'vitest';
import add2eFixture from '../../fixtures/add2e/valid-monster.json';
import shadowlordsFixture from '../../fixtures/shadowlords3e/valid-monster.json';
import type { Add2EMonster } from '../../src/generated/add2e-monster';
import type { ShadowlordsMonster } from '../../src/generated/shadowlords3e-monster';
import { mapAdd2eMonster, mapShadowlordsMonster } from '../../src/portable/mappers';
import { validatePortableMonster } from '../../src/portable/validation';

describe('mappers de exportação portáteis', () => {
  it('mapeia AD&D explicitamente, sem identidade persistida', () => {
    const envelope = mapAdd2eMonster(add2eFixture as Add2EMonster);
    expect(validatePortableMonster(envelope)).toEqual({ valid: true, issues: [] });
    expect(JSON.stringify(envelope)).not.toMatch(/libraryId|contentHash|rowVersion|sortOrder|createdAt|updatedAt/);
  });

  it('mapeia Shadowlords e normaliza o alias de terreno', () => {
    const input = structuredClone(shadowlordsFixture) as ShadowlordsMonster;
    input.profiles[0].terrains[0].code = 'deserts';
    const envelope = mapShadowlordsMonster(input);
    expect(envelope.monster.profiles[0].terrains[0].code).toBe('desert');
    expect(validatePortableMonster(envelope)).toEqual({ valid: true, issues: [] });
  });
});
