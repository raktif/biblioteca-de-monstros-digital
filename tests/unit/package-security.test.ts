import { describe, expect, it } from 'vitest';
import { validatePackageInventory } from '../../src/portable/package-security';
import { buildManifest } from '../../src/portable/manifest';

const manifest = () => buildManifest({ packageKind: 'monster', systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1, exportedAt: '2026-11-25T12:00:00Z', generatorVersion: '0.1.0', libraries: 0, monsters: 1, activeMonsters: 1, archivedMonsters: 0, images: 0, files: [{ path: 'monster.json', role: 'monster-data', mediaType: 'application/json', size: 12, sha256: 'a'.repeat(64) }] });

describe('leitor seguro de pacotes', () => {
  it('aceita inventário correspondente ao manifesto', () => {
    expect(validatePackageInventory(manifest(), [{ path: 'manifest.json', size: 100, compressedSize: 80, mediaType: 'application/json' }, { path: 'monster.json', size: 12, compressedSize: 10, mediaType: 'application/json' }], 90)).toEqual({ valid: true, issues: [] });
  });

  it('rejeita Zip Slip, duplicidade e arquivo não listado', () => {
    const result = validatePackageInventory(manifest(), [{ path: 'manifest.json', size: 100, compressedSize: 80, mediaType: 'application/json' }, { path: '../monster.json', size: 12, compressedSize: 10, mediaType: 'application/json' }, { path: 'monster.json', size: 12, compressedSize: 10, mediaType: 'application/json' }, { path: 'MONSTER.JSON', size: 12, compressedSize: 10, mediaType: 'application/json' }, { path: 'extra.bin', size: 1, compressedSize: 1, mediaType: 'application/octet-stream' }], 90);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['PACKAGE_PATH_UNSAFE', 'PACKAGE_DUPLICATE_PATH', 'PACKAGE_FILE_UNLISTED']));
  });
});
