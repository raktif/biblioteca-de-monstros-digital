import type { PortableManifest } from './types';

export type ManifestFile = PortableManifest['files'][number];

export function buildManifest(input: Omit<PortableManifest, 'format' | 'formatVersion' | 'kind' | 'generator' | 'counts' | 'totalUncompressedBytes'> & { files: ManifestFile[]; activeMonsters: number; archivedMonsters: number; libraries: number; monsters: number; images: number; generatorVersion: string }): PortableManifest {
  const files = input.files;
  return { format: 'biblioteca-de-monstros-digital.package', formatVersion: 1, kind: 'package-manifest', packageKind: input.packageKind, systemCode: input.systemCode, schemaKey: input.schemaKey, schemaVersion: input.schemaVersion, exportedAt: input.exportedAt, generator: { name: 'Biblioteca de Monstros Digital', version: input.generatorVersion }, counts: { libraries: input.libraries, monsters: input.monsters, activeMonsters: input.activeMonsters, archivedMonsters: input.archivedMonsters, images: input.images, files: files.length }, totalUncompressedBytes: files.reduce((sum, file) => sum + file.size, 0), files };
}
