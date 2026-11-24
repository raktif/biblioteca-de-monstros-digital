import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/add2e/valid-monster.json';
import type { Add2EMonster } from '../../src/generated/add2e-monster';
import { createLibrary } from '../../src/infrastructure/libraries';
import {
  createMonster, deleteMonsterPermanently, getMonster, listMonsters,
  moveMonsterToTrash, restoreMonster, setMonsterArchived,
} from '../../src/infrastructure/monsters';

describe('fichas AD&D no adaptador de navegador', () => {
  it('faz round-trip de perfis, psionismo, tabela e referências e percorre o ciclo de vida', async () => {
    const library = await createLibrary({ name: `Biblioteca de teste ${crypto.randomUUID()}`, systemCode: 'add2e' });
    const source = structuredClone(fixture) as Add2EMonster;
    const created = await createMonster(library.id, source, null);

    expect(created.document.libraryId).toBe(library.id);
    expect(created.document.id).not.toBe(source.id);
    expect(created.document.profiles).toEqual(source.profiles);
    expect(created.document.auxiliaryTables).toEqual(source.auxiliaryTables);
    expect(created.document.sources).toEqual(source.sources);
    expect(created.document.profiles[0].statistics.psionics).toEqual(source.profiles[0].statistics.psionics);
    expect((await getMonster(created.document.id)).document).toEqual(created.document);

    const archived = await setMonsterArchived(created.document.id, true, created.document.rowVersion ?? 1);
    expect(archived.document.status).toBe('archived');
    await moveMonsterToTrash(created.document.id, archived.document.rowVersion ?? 2);
    expect(await listMonsters(library.id, 'trashed')).toHaveLength(1);
    await restoreMonster(created.document.id);
    expect((await getMonster(created.document.id)).document.status).toBe('archived');
    await moveMonsterToTrash(created.document.id, (await getMonster(created.document.id)).document.rowVersion ?? 3);
    await deleteMonsterPermanently(created.document.id, created.document.name);
    expect(await listMonsters(library.id, 'all')).toHaveLength(0);
  });
});
