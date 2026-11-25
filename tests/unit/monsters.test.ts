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

    const createdDocument = created.document as Add2EMonster;
    expect(createdDocument.libraryId).toBe(library.id);
    expect(createdDocument.id).not.toBe(source.id);
    expect(createdDocument.profiles).toEqual(source.profiles);
    expect(createdDocument.auxiliaryTables).toEqual(source.auxiliaryTables);
    expect(createdDocument.sources).toEqual(source.sources);
    expect(createdDocument.profiles[0].statistics.psionics).toEqual(source.profiles[0].statistics.psionics);
    expect((await getMonster(createdDocument.id)).document).toEqual(createdDocument);

    const archived = await setMonsterArchived(createdDocument.id, true, createdDocument.rowVersion ?? 1);
    expect(archived.document.status).toBe('archived');
    await moveMonsterToTrash(createdDocument.id, archived.document.rowVersion ?? 2);
    expect(await listMonsters(library.id, 'trashed')).toHaveLength(1);
    await restoreMonster(createdDocument.id);
    expect((await getMonster(createdDocument.id)).document.status).toBe('archived');
    await moveMonsterToTrash(createdDocument.id, (await getMonster(createdDocument.id)).document.rowVersion ?? 3);
    await deleteMonsterPermanently(createdDocument.id, createdDocument.name);
    expect(await listMonsters(library.id, 'all')).toHaveLength(0);
  });
});
