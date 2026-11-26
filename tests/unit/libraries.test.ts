import { describe, expect, it } from 'vitest';
import {
  createLibrary, deleteLibraryPermanently, listLibraries, listTrashedLibraries,
  moveLibraryToTrash, restoreLibrary, updateLibrary,
} from '../../src/infrastructure/libraries';

describe('bibliotecas no adaptador de navegador', () => {
  it('cria, ordena e lista bibliotecas ativas', async () => {
    const zebra = await createLibrary({ name: '  Zênite  ', systemCode: 'add2e' });
    const acai = await createLibrary({ name: 'Árvore', systemCode: 'shadowlords3e' });
    expect(zebra.name).toBe('Zênite');
    expect((await listLibraries()).map((item) => item.id)).toEqual([acai.id, zebra.id]);
    expect((await listTrashedLibraries())).toHaveLength(0);
  });

  it('moves a library to trash, restores it and supports exact-name deletion', async () => {
    const library = await createLibrary({ name: 'Ruínas Antigas', systemCode: 'add2e' });
    await moveLibraryToTrash(library);
    expect(await listLibraries()).toHaveLength(2);
    expect((await listTrashedLibraries()).map((item) => item.id)).toContain(library.id);
    await restoreLibrary(library.id);
    expect((await listLibraries()).some((item) => item.id === library.id)).toBe(true);
    await moveLibraryToTrash({ ...library, rowVersion: 2 });
    await expect(deleteLibraryPermanently(library.id, 'ruínas antigas')).rejects.toMatchObject({ code: 'CONFIRMATION_NAME_MISMATCH' });
    await deleteLibraryPermanently(library.id, library.name);
    expect((await listTrashedLibraries()).some((item) => item.id === library.id)).toBe(false);
  });

  it('persists the cover crop when a library is reopened', async () => {
    const library = await createLibrary({ name: `Recorte ${crypto.randomUUID()}`, systemCode: 'shadowlords3e', cropX: 50, cropY: 50 });
    await updateLibrary(library.id, { name: library.name, systemCode: library.systemCode, cropX: 28, cropY: 74 }, library.rowVersion, false);
    const reopened = (await listLibraries()).find((item) => item.id === library.id);
    expect(reopened).toMatchObject({ cropX: 28, cropY: 74 });
  });
});
