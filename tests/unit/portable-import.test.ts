import { describe, expect, it } from 'vitest';
import add2ePortable from '../../fixtures/add2e/valid-monster.json';
import shadowlordsPortable from '../../fixtures/shadowlords3e/valid-monster.json';
import { resolveImportedName } from '../../src/portable/name-collision';
import { mapPortableAdd2e, mapPortableShadowlords } from '../../src/portable/import-mappers';
import type { PortableMonsterEnvelope } from '../../src/portable/types';

const ids = (() => { let next = 0; return () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`; })();
const strip = (value: any): any => Array.isArray(value) ? value.map(strip) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => !['id', 'libraryId', 'schemaKey', 'schemaVersion', 'rowVersion', 'contentHash', 'createdAt', 'updatedAt', 'sortOrder'].includes(key)).map(([key, item]) => [key, strip(item)])) : value;

describe('importadores portáteis', () => {
  it('resolve colisões de nomes com sufixos determinísticos e limite', () => {
    expect(resolveImportedName('Goblin', ['Goblin', 'Goblin - Importado', 'Goblin - Importado (2)'])).toBe('Goblin - Importado (3)');
    expect(resolveImportedName('Árvore', ['arvore'])).toBe('Árvore - Importado');
    expect(resolveImportedName('x'.repeat(120), ['x'.repeat(120)]).endsWith('Importado')).toBe(true);
  });

  it('recria a árvore de identidade AD&D e restaura desert', () => {
    const envelope = { format: 'biblioteca-de-monstros-digital.add2e.monster', formatVersion: 1, kind: 'monster', systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1, monster: strip(add2ePortable) } as unknown as PortableMonsterEnvelope;
    const result = mapPortableAdd2e(envelope, { libraryId: 'library', now: '2026-11-25T12:00:00Z', createId: ids });
    expect(result.id).toBeTruthy(); expect(result.libraryId).toBe('library'); expect(result.profiles[0].sortOrder).toBe(0); expect(result.sources[0].id).toBeTruthy();
  });

  it('recria IDs de entidades filhas Shadowlords', () => {
    const envelope = { format: 'biblioteca-de-monstros-digital.shadowlords3e.monster', formatVersion: 1, kind: 'monster', systemCode: 'shadowlords3e', schemaKey: 'shadowlords3e.monster', schemaVersion: 1, monster: strip(shadowlordsPortable) } as unknown as PortableMonsterEnvelope;
    const result = mapPortableShadowlords(envelope, { libraryId: 'library', now: '2026-11-25T12:00:00Z', createId: ids });
    expect(result.profiles[0].statistics.attacks[0].id).toBeTruthy(); expect(result.profiles[0].statistics.attacks[0].sortOrder).toBe(0);
  });
});
