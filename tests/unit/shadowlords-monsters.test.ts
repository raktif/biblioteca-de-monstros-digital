import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/shadowlords3e/valid-monster.json';
import type { ShadowlordsMonster } from '../../src/generated/shadowlords3e-monster';
import { createLibrary } from '../../src/infrastructure/libraries';
import { createMonster, deleteMonsterPermanently, getMonster, listMonsters, moveMonsterToTrash, restoreMonster } from '../../src/infrastructure/monsters';

describe('fichas Shadowlords no adaptador de navegador', () => {
  it('faz round-trip da ficha Bugbear e permite criar uma ficha de biblioteca Shadowlords', async () => {
    const library = await createLibrary({ name: `Biblioteca Shadowlords ${crypto.randomUUID()}`, systemCode: 'shadowlords3e' });
    const created = await createMonster(library.id, structuredClone(fixture) as ShadowlordsMonster, null);
    const saved = created.document as ShadowlordsMonster;

    expect(saved.systemCode).toBe('shadowlords3e');
    expect(saved.libraryId).toBe(library.id);
    expect(saved.profiles).toHaveLength(2);
    expect(saved.profiles[0].statistics.defense.final).toBe(11);
    expect(saved.profiles[0].statistics.damageReductions[0].value).toBe(2);
    expect(saved.profiles[0].statistics.attacks[0].damageFormula).toBe('1d6+1');
    expect(saved.profiles[0].statistics.skills[0].name).toBe('Rastreamento');
    expect(saved.profiles[0].statistics.traits[0].name).toBe('Visão no brejo');
    expect(saved.profiles[0].statistics.spells[0].name).toBe('Sinal de alerta');
    expect((await getMonster(saved.id)).document).toEqual(saved);

    await moveMonsterToTrash(saved.id, saved.rowVersion ?? 1);
    expect(await listMonsters(library.id, 'trashed')).toHaveLength(1);
    await restoreMonster(saved.id);
    expect((await getMonster(saved.id)).document.status).toBe('active');
    await moveMonsterToTrash(saved.id, (await getMonster(saved.id)).document.rowVersion ?? 3);
    await deleteMonsterPermanently(saved.id, saved.name);
    expect(await listMonsters(library.id, 'all')).toHaveLength(0);
  });
});
