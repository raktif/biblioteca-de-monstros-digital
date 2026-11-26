import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLibrary, listLibraries } from '../../src/infrastructure/libraries.ts';
import { listMonsters } from '../../src/infrastructure/monsters.ts';
import { executePortableImport, inspectPortableFile } from '../../src/portable/package-import.ts';
import { buildLibraryPackage, buildMonsterPackage } from '../../src/portable/package-export.ts';

const examples = path.resolve('docs/examples/import-export');
function exampleFile(name) {
  const bytes = readFileSync(path.join(examples, name));
  return new File([new Uint8Array(bytes)], name, { type: 'application/zip' });
}

describe('importação dos pacotes de exemplo', () => {
  it('inspeciona os quatro ZIPs de referência', async () => {
    const files = [
      'add2e-library-reference.zip',
      'add2e-monster-reference.zip',
      'shadowlords3e-library-reference.zip',
      'shadowlords3e-monster-reference.zip',
    ];
    const inspections = await Promise.all(files.map((name) => inspectPortableFile(exampleFile(name))));
    expect(inspections.map(({ inspection }) => [inspection.packageKind, inspection.systemCode, inspection.monsterCount])).toEqual([
      ['library', 'add2e', 1], ['monster', 'add2e', 1], ['library', 'shadowlords3e', 1], ['monster', 'shadowlords3e', 1],
    ]);
  });

  it('importa um pacote de biblioteca e mantém disponíveis os monstros', async () => {
    const peer = await createLibrary({ name: `Outra biblioteca AD&D ${crypto.randomUUID()}`, systemCode: 'add2e' });
    const otherSystem = await createLibrary({ name: `Biblioteca Shadowlords ${crypto.randomUUID()}`, systemCode: 'shadowlords3e' });
    const { planId, inspection } = await inspectPortableFile(exampleFile('add2e-library-reference.zip'));
    expect(inspection.errors).toEqual([]);
    const report = await executePortableImport({ planId, createLibrary: true }, 'library');
    const library = (await listLibraries()).find((item) => item.id === report.createdLibraryId);
    expect(library?.name).toBe('Biblioteca AD&D de Referência');
    expect(library?.activeMonsterCount).toBe(1);
    expect(library?.totalMonsterCount).toBe(1);
    expect((await listMonsters(library.id, 'active')).map((monster) => monster.name)).toEqual(['Bugbear']);
    expect(await listMonsters(peer.id, 'all')).toEqual([]);
    expect(await listMonsters(otherSystem.id, 'all')).toEqual([]);
  });

  it('importa um monstro individual no destino escolhido', async () => {
    const library = await createLibrary({ name: `Destino de importação ${crypto.randomUUID()}`, systemCode: 'add2e' });
    const peer = await createLibrary({ name: `Outro destino AD&D ${crypto.randomUUID()}`, systemCode: 'add2e' });
    const otherSystem = await createLibrary({ name: `Destino Shadowlords ${crypto.randomUUID()}`, systemCode: 'shadowlords3e' });
    const { planId } = await inspectPortableFile(exampleFile('add2e-monster-reference.zip'), library.id);
    const report = await executePortableImport({ planId, targetLibraryId: library.id }, 'monster');
    expect(report.importedMonsterCount).toBe(1);
    expect((await listMonsters(library.id, 'active')).map((monster) => monster.name)).toEqual(['Bugbear']);
    expect((await listMonsters(library.id, 'archived')).map((monster) => monster.name)).toEqual([]);
    expect(await listMonsters(peer.id, 'all')).toEqual([]);
    expect(await listMonsters(otherSystem.id, 'all')).toEqual([]);
  });

  it('gera ZIPs de exportação válidos para biblioteca e monstro', async () => {
    const library = await createLibrary({ name: `Origem exportação ${crypto.randomUUID()}`, systemCode: 'add2e' });
    const monsterImport = await inspectPortableFile(exampleFile('add2e-monster-reference.zip'), library.id);
    await executePortableImport({ planId: monsterImport.planId, targetLibraryId: library.id }, 'monster');
    const monster = (await listMonsters(library.id, 'active'))[0];
    const exportedMonster = await inspectPortableFile(new File([new Uint8Array(await buildMonsterPackage(monster.id))], 'monster.zip', { type: 'application/zip' }));
    const exportedLibrary = await inspectPortableFile(new File([new Uint8Array(await buildLibraryPackage(library))], 'library.zip', { type: 'application/zip' }));
    expect([exportedMonster.inspection.packageKind, exportedMonster.inspection.monsterCount]).toEqual(['monster', 1]);
    expect([exportedLibrary.inspection.packageKind, exportedLibrary.inspection.monsterCount]).toEqual(['library', 1]);
  });
});
