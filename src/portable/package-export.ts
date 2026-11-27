import { zipSync } from 'fflate';
import type { Library } from '../infrastructure/libraries';
import { getMonster, listMonsters, type MonsterRecord } from '../infrastructure/monsters';
import { listLibraries } from '../infrastructure/libraries';
import { buildManifest } from './manifest';
import { mapLibrary, mapMonster } from './mappers';
import type { PortableImageRef, PortableManifest } from './types';

type FileEntry = { path: string; role: PortableManifest['files'][number]['role']; mediaType: string; bytes: Uint8Array };

function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

function parseDataUrl(value: string): { mediaType: string; bytes: Uint8Array } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i.exec(value);
  if (!match) throw new Error('A imagem armazenada não tem um formato compatível com o pacote portátil.');
  const binary = atob(match[2]);
  return { mediaType: match[1].toLowerCase(), bytes: Uint8Array.from(binary, (char) => char.charCodeAt(0)) };
}

async function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap !== 'function') throw new Error('Não foi possível determinar as dimensões da imagem para exportação.');
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const result = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return result;
}

function slug(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'monstro';
}

function extension(mediaType: string): string { return mediaType === 'image/jpeg' ? 'jpg' : mediaType.slice('image/'.length); }

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function packageBytes(kind: 'library' | 'monster', systemCode: Library['systemCode'], entries: FileEntry[], monsters: MonsterRecord[], libraryCount: number): Promise<Uint8Array> {
  const files = await Promise.all(entries.map(async (entry) => ({ path: entry.path, role: entry.role, mediaType: entry.mediaType, size: entry.bytes.length, sha256: await sha256(entry.bytes) })));
  const manifest = buildManifest({ packageKind: kind, systemCode, schemaKey: `${systemCode}.monster`, schemaVersion: 1, exportedAt: new Date().toISOString(), generatorVersion: '1.0.0', libraries: libraryCount, monsters: monsters.length, activeMonsters: monsters.filter((item) => item.document.status === 'active').length, archivedMonsters: monsters.filter((item) => item.document.status === 'archived').length, images: entries.filter((item) => item.role.endsWith('-image')).length, files });
  const zipFiles: Record<string, Uint8Array> = { 'manifest.json': encodeJson(manifest) };
  for (const entry of entries) zipFiles[entry.path] = entry.bytes;
  return zipSync(zipFiles, { level: 6 });
}

async function portableMonsterFiles(records: MonsterRecord[]): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  for (const [index, record] of records.entries()) {
    if (record.document.image && !record.imageDataUrl) throw new Error(`A imagem de “${record.document.name}” não pôde ser lida para exportação.`);
    const image = record.imageDataUrl ? parseDataUrl(record.imageDataUrl) : null;
    const imagePath = image ? `images/monsters/${String(index + 1).padStart(6, '0')}.${extension(image.mediaType)}` : 'images/monster/main.webp';
    const envelope = mapMonster(record.document, imagePath);
    const number = String(index + 1).padStart(6, '0');
    entries.push({ path: `monsters/${number}--${slug(record.document.name)}.monster.json`, role: 'monster-data', mediaType: 'application/json', bytes: encodeJson(envelope) });
    if (record.imageDataUrl) {
      if (!image) throw new Error('A imagem do monstro não pôde ser preparada para exportação.');
      const dimensions = record.document.image ? { width: record.document.image.width, height: record.document.image.height } : await imageDimensions(record.imageDataUrl);
      const reference: PortableImageRef = { path: imagePath, mediaType: image.mediaType as PortableImageRef['mediaType'], ...dimensions };
      envelope.monster.image = reference;
      entries[entries.length - 1].bytes = encodeJson(envelope);
      entries.push({ path: imagePath, role: 'monster-image', mediaType: image.mediaType, bytes: image.bytes });
    }
  }
  return entries;
}

export async function buildMonsterPackage(monsterId: string): Promise<Uint8Array> {
  const record = await getMonster(monsterId);
  const entries = await portableMonsterFiles([record]);
  return packageBytes('monster', record.document.systemCode, entries, [record], 0);
}

export async function buildLibraryPackage(library: Library): Promise<Uint8Array> {
  const [active, archived] = await Promise.all([listMonsters(library.id, 'active'), listMonsters(library.id, 'archived')]);
  const records = await Promise.all([...active, ...archived].map(({ id }) => getMonster(id)));
  const entries: FileEntry[] = [];
  const portableLibrary = mapLibrary(library);
  if (library.imageDataUrl) {
    const image = parseDataUrl(library.imageDataUrl);
    const dimensions = await imageDimensions(library.imageDataUrl);
    const imagePath = `images/library/cover.${extension(image.mediaType)}`;
    const reference: PortableImageRef = { path: imagePath, mediaType: image.mediaType as PortableImageRef['mediaType'], ...dimensions };
    portableLibrary.library.image = reference;
    entries.push({ path: imagePath, role: 'library-image', mediaType: image.mediaType, bytes: image.bytes });
  }
  entries.push({ path: 'library.json', role: 'library-data', mediaType: 'application/json', bytes: encodeJson(portableLibrary) });
  entries.push(...await portableMonsterFiles(records));
  return packageBytes('library', library.systemCode, entries, records, 1);
}

type SaveFilePicker = (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<{ name: string; createWritable: () => Promise<{ write: (data: Uint8Array) => Promise<void>; close: () => Promise<void> }> }>;

export async function downloadPackage(bytes: Uint8Array, filename: string): Promise<string | null> {
  const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (!picker) throw new Error('A janela para salvar arquivos não está disponível neste ambiente.');
  let handle: Awaited<ReturnType<SaveFilePicker>>;
  try {
    handle = await picker.call(window, { suggestedName: filename, types: [{ description: 'Pacote ZIP', accept: { 'application/zip': ['.zip'] } }] });
  } catch (reason) {
    if ((reason as { name?: string })?.name === 'AbortError') return null;
    throw reason;
  }
  const file = await handle.createWritable();
  try {
    await file.write(bytes);
    await file.close();
  } catch (reason) {
    try { await file.close(); } catch { /* preserve the original write error */ }
    throw reason;
  }
  return handle.name;
}

export async function exportLibrary(libraryId: string): Promise<string | null> {
  const library = (await listLibraries()).find((item) => item.id === libraryId);
  if (!library) throw new Error('A biblioteca selecionada não está disponível para exportação.');
  const bytes = await buildLibraryPackage(library);
  return downloadPackage(bytes, `${slug(library.name)}.library.zip`);
}

export async function exportMonster(monsterId: string): Promise<string | null> {
  const record = await getMonster(monsterId);
  const bytes = await buildMonsterPackage(monsterId);
  return downloadPackage(bytes, `${slug(record.document.name)}.monster.zip`);
}
