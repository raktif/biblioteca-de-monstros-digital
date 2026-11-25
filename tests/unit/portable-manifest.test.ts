import { describe, expect, it } from 'vitest';
import { buildManifest } from '../../src/portable/manifest';
import { validatePortableManifest } from '../../src/portable/validation';

describe('manifesto de exportação portátil', () => {
  it('calcula contagens e bytes a partir do inventário', () => {
    const manifest = buildManifest({ packageKind: 'monster', systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1, exportedAt: '2026-11-25T12:00:00Z', generatorVersion: '0.1.0', libraries: 0, monsters: 1, activeMonsters: 1, archivedMonsters: 0, images: 0, files: [{ path: 'monster.json', role: 'monster-data', mediaType: 'application/json', size: 12, sha256: 'a'.repeat(64) }] });
    expect(manifest.counts).toEqual({ libraries: 0, monsters: 1, activeMonsters: 1, archivedMonsters: 0, images: 0, files: 1 });
    expect(manifest.totalUncompressedBytes).toBe(12);
    expect(validatePortableManifest(manifest)).toEqual({ valid: true, issues: [] });
  });
});
