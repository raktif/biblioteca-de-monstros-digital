import type { PortableManifest } from './types';

export const PACKAGE_LIMITS = {
  libraryCompressedBytes: 2 * 1024 ** 3,
  libraryUncompressedBytes: 4 * 1024 ** 3,
  libraryEntries: 25_000,
  libraryMonsters: 10_000,
  individualCompressedBytes: 32 * 1024 ** 2,
  individualUncompressedBytes: 64 * 1024 ** 2,
  individualEntries: 10,
  jsonBytes: 5 * 1024 ** 2,
  libraryJsonBytes: 1 * 1024 ** 2,
  imageBytes: 16 * 1024 ** 2,
  pathLength: 512,
  maxDepth: 8,
} as const;

export type PackageEntry = { path: string; size: number; compressedSize: number; mediaType: string; role?: string; encrypted?: boolean; symbolicLink?: boolean };
export type PackageSecurityIssue = { code: string; path?: string; message: string };
export type PackageSecurityResult = { valid: boolean; issues: PackageSecurityIssue[] };

function normalizedPath(path: string): string {
  return path.normalize('NFC').replaceAll('\\', '/').toLocaleLowerCase('en-US');
}

function pathIssue(path: string): PackageSecurityIssue | null {
  const normalized = path.normalize('NFC');
  const segments = normalized.split('/');
  if (!normalized || normalized.length > PACKAGE_LIMITS.pathLength || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.includes('\\') || segments.some((segment) => segment === '..' || segment === '') || normalized.includes('\0')) return { code: 'PACKAGE_PATH_UNSAFE', path, message: 'O caminho do pacote não é seguro.' };
  if (segments.length > PACKAGE_LIMITS.maxDepth) return { code: 'PACKAGE_PATH_DEPTH_EXCEEDED', path, message: 'A profundidade do caminho excede o limite.' };
  return null;
}

export function validatePackageInventory(manifest: PortableManifest, entries: PackageEntry[], compressedBytes: number): PackageSecurityResult {
  const issues: PackageSecurityIssue[] = [];
  const isLibrary = manifest.packageKind === 'library';
  const maxCompressed = isLibrary ? PACKAGE_LIMITS.libraryCompressedBytes : PACKAGE_LIMITS.individualCompressedBytes;
  const maxUncompressed = isLibrary ? PACKAGE_LIMITS.libraryUncompressedBytes : PACKAGE_LIMITS.individualUncompressedBytes;
  const maxEntries = isLibrary ? PACKAGE_LIMITS.libraryEntries : PACKAGE_LIMITS.individualEntries;
  if (compressedBytes > maxCompressed) issues.push({ code: 'PACKAGE_TOO_LARGE', message: 'O tamanho comprimido excede o limite.' });
  if (entries.length > maxEntries) issues.push({ code: 'PACKAGE_ENTRY_LIMIT_EXCEEDED', message: 'A quantidade de entradas excede o limite.' });
  const seen = new Set<string>();
  for (const entry of entries) {
    const unsafe = pathIssue(entry.path);
    if (unsafe) issues.push(unsafe);
    const key = normalizedPath(entry.path);
    if (seen.has(key)) issues.push({ code: 'PACKAGE_DUPLICATE_PATH', path: entry.path, message: 'Há entradas duplicadas ou equivalentes no pacote.' });
    seen.add(key);
    if (entry.encrypted) issues.push({ code: 'PACKAGE_ENCRYPTED', path: entry.path, message: 'Pacotes criptografados não são aceitos.' });
    if (entry.symbolicLink) issues.push({ code: 'PACKAGE_LINK_UNSAFE', path: entry.path, message: 'Links simbólicos não são aceitos.' });
    if (entry.size > (entry.mediaType === 'application/json' ? PACKAGE_LIMITS.jsonBytes : PACKAGE_LIMITS.imageBytes)) issues.push({ code: 'PACKAGE_FILE_TOO_LARGE', path: entry.path, message: 'O arquivo excede o limite permitido.' });
  }
  const uncompressedBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  if (uncompressedBytes > maxUncompressed) issues.push({ code: 'PACKAGE_UNCOMPRESSED_LIMIT_EXCEEDED', message: 'O tamanho descompactado excede o limite.' });
  const manifestEntries = new Map(manifest.files.map((file) => [normalizedPath(file.path), file]));
  for (const entry of entries) {
    if (normalizedPath(entry.path) === 'manifest.json') continue;
    const declared = manifestEntries.get(normalizedPath(entry.path));
    if (!declared) issues.push({ code: 'PACKAGE_FILE_UNLISTED', path: entry.path, message: 'O arquivo não está listado no manifesto.' });
    else if (declared.size !== entry.size) issues.push({ code: 'PACKAGE_SIZE_MISMATCH', path: entry.path, message: 'O tamanho diverge do manifesto.' });
  }
  for (const declared of manifest.files) if (!entries.some((entry) => normalizedPath(entry.path) === normalizedPath(declared.path))) issues.push({ code: 'PACKAGE_FILE_MISSING', path: declared.path, message: 'O arquivo listado não existe no pacote.' });
  if (manifest.counts.files !== manifest.files.length) issues.push({ code: 'MANIFEST_COUNTS_INVALID', message: 'counts.files não corresponde ao inventário.' });
  if (manifest.counts.images !== manifest.files.filter((file) => file.role.endsWith('-image')).length) issues.push({ code: 'MANIFEST_COUNTS_INVALID', message: 'counts.images não corresponde às imagens.' });
  if (manifest.totalUncompressedBytes !== manifest.files.reduce((sum, file) => sum + file.size, 0)) issues.push({ code: 'MANIFEST_COUNTS_INVALID', message: 'totalUncompressedBytes não corresponde ao manifesto.' });
  if (isLibrary && manifest.counts.libraries !== 1) issues.push({ code: 'MANIFEST_COUNTS_INVALID', message: 'Pacote de biblioteca deve declarar uma biblioteca.' });
  if (!isLibrary && (manifest.counts.libraries !== 0 || manifest.counts.monsters !== 1)) issues.push({ code: 'MANIFEST_COUNTS_INVALID', message: 'Pacote individual deve declarar exatamente um monstro.' });
  return { valid: issues.length === 0, issues };
}
