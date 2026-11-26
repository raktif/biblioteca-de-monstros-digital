import { unzipSync } from 'fflate';
import { createLibrary, deleteLibraryPermanently, listLibraries, moveLibraryToTrash, type Library } from '../infrastructure/libraries';
import { createMonster, deleteMonsterPermanently, listMonsters, moveMonsterToTrash, setMonsterArchived, type MonsterDocument, type MonsterRecord } from '../infrastructure/monsters';
import type { ImportInspection, ImportReport } from '../infrastructure/portable';
import { mapPortableMonster } from './import-mappers';
import { validatePackageInventory, type PackageEntry } from './package-security';
import { resolveImportedName } from './name-collision';
import { assertPortableLibrary, assertPortableManifest, assertPortableMonster } from './validation';
import type { PortableLibrary, PortableManifest, PortableMonsterEnvelope } from './types';

type PackageMonster = { envelope: PortableMonsterEnvelope; sourceName: string; finalName: string; status: 'active' | 'archived'; imageDataUrl: string | null };
type ImportPlan = { manifest: PortableManifest; library: PortableLibrary | null; monsters: PackageMonster[]; files: Map<string, Uint8Array>; finalLibraryName: string | null };

const plans = new Map<string, ImportPlan>();
const reports = new Map<string, ImportReport>();

function mediaTypeFor(path: string): string {
  if (path.toLowerCase().endsWith('.json')) return 'application/json';
  if (path.toLowerCase().endsWith('.jpg') || path.toLowerCase().endsWith('.jpeg')) return 'image/jpeg';
  if (path.toLowerCase().endsWith('.png')) return 'image/png';
  if (path.toLowerCase().endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function dataUrl(mediaType: string, bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return `data:${mediaType};base64,${btoa(binary)}`;
}

function parseJson(files: Map<string, Uint8Array>, path: string): unknown {
  const bytes = files.get(path);
  if (!bytes) throw new Error(`PACKAGE_FILE_MISSING: ${path}`);
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error(`PACKAGE_JSON_INVALID: ${path}`); }
}

function imageDataUrl(image: { path: string; mediaType: string } | null, files: Map<string, Uint8Array>): string | null {
  if (!image) return null;
  const bytes = files.get(image.path);
  if (!bytes) throw new Error(`PACKAGE_IMAGE_MISSING: ${image.path}`);
  if (!bytes.length || bytes.length > 16 * 1024 * 1024) throw new Error(`PACKAGE_IMAGE_INVALID: ${image.path}`);
  return dataUrl(image.mediaType, bytes);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertImagesExist(planManifest: PortableManifest, value: PortableLibrary | PortableMonsterEnvelope, files: Map<string, Uint8Array>) {
  const image = 'library' in value ? value.library.image : value.monster.image;
  if (!image) return;
  const declaration = planManifest.files.find((entry) => entry.path === image.path);
  if (!declaration || !declaration.role.endsWith('-image') || declaration.mediaType !== image.mediaType) throw new Error(`PACKAGE_IMAGE_INVALID: ${image.path}`);
  const bytes = files.get(image.path);
  if (!bytes || bytes.length !== declaration.size) throw new Error(`PACKAGE_IMAGE_INVALID: ${image.path}`);
  if (image.mediaType === 'image/png' && !(bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)) throw new Error(`PACKAGE_IMAGE_INVALID: ${image.path}`);
  if (image.mediaType === 'image/jpeg' && !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) throw new Error(`PACKAGE_IMAGE_INVALID: ${image.path}`);
  if (image.mediaType === 'image/webp' && !(new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP')) throw new Error(`PACKAGE_IMAGE_INVALID: ${image.path}`);
}

export async function inspectPortableFile(file: File, targetLibraryId?: string): Promise<{ planId: string; inspection: ImportInspection }> {
  if (!file.name.toLowerCase().endsWith('.zip')) throw new Error('Selecione um arquivo ZIP.');
  if (file.size > 2 * 1024 ** 3) throw new Error('O pacote excede o limite de 2 GiB.');
  const compressed = new Uint8Array(await file.arrayBuffer());
  const inventory: PackageEntry[] = [];
  let extracted: Record<string, Uint8Array>;
  try {
    extracted = unzipSync(compressed, { filter: (entry) => {
      const path = entry.name;
      if (path.endsWith('/')) throw new Error('PACKAGE_PATH_UNSAFE: diretórios não são permitidos no ZIP.');
      const mediaType = mediaTypeFor(path);
      const limit = mediaType === 'application/json' ? 5 * 1024 ** 2 : 16 * 1024 ** 2;
      if (!path || path.length > 512 || path.startsWith('/') || path.includes('\\') || path.includes('\0') || path.split('/').some((part) => !part || part === '.' || part === '..') || path.split('/').length > 8) throw new Error(`PACKAGE_PATH_UNSAFE: ${path}`);
      if (entry.originalSize > limit || entry.originalSize <= 0) throw new Error(`PACKAGE_FILE_TOO_LARGE: ${path}`);
      if (entry.compression !== 0 && entry.compression !== 8) throw new Error(`PACKAGE_COMPRESSION_UNSUPPORTED: ${path}`);
      inventory.push({ path, size: entry.originalSize, compressedSize: entry.size, mediaType });
      return true;
    } });
  } catch (error) {
    throw error instanceof Error ? error : new Error('O ZIP está corrompido ou usa uma compressão não suportada.');
  }
  const files = new Map(Object.entries(extracted));
  const manifest = parseJson(files, 'manifest.json');
  assertPortableManifest(manifest);
  const typedManifest = manifest as PortableManifest;
  const declarations = new Map(typedManifest.files.map((entry) => [entry.path, entry]));
  for (const entry of inventory) {
    const declaration = declarations.get(entry.path);
    if (declaration) entry.mediaType = declaration.mediaType;
  }
  const security = validatePackageInventory(typedManifest, inventory, file.size);
  if (!security.valid) throw new Error(security.issues.map((issue) => issue.message).join('\n'));
  for (const declaration of typedManifest.files) {
    const bytes = files.get(declaration.path);
    if (!bytes || await sha256(bytes) !== declaration.sha256) throw new Error(`O hash do arquivo ${declaration.path} não corresponde ao manifesto.`);
  }

  let library: PortableLibrary | null = null;
  const monsters: PackageMonster[] = [];
  if (typedManifest.packageKind === 'library') {
    const libraryEntry = typedManifest.files.find((entry) => entry.role === 'library-data');
    if (!libraryEntry) throw new Error('O pacote não contém os dados da biblioteca.');
    const value = parseJson(files, libraryEntry.path);
    assertPortableLibrary(value);
    library = value as PortableLibrary;
    if (library.systemCode !== typedManifest.systemCode || library.schemaKey !== typedManifest.schemaKey) throw new Error('O sistema da biblioteca diverge do manifesto.');
    assertImagesExist(typedManifest, library, files);
  }
  const monsterEntries = typedManifest.files.filter((entry) => entry.role === 'monster-data');
  for (const entry of monsterEntries) {
    const value = parseJson(files, entry.path);
    assertPortableMonster(value);
    const envelope = value as PortableMonsterEnvelope;
    if (envelope.systemCode !== typedManifest.systemCode || envelope.schemaKey !== typedManifest.schemaKey) throw new Error(`O sistema do monstro em ${entry.path} diverge do manifesto.`);
    assertImagesExist(typedManifest, envelope, files);
    monsters.push({ envelope, sourceName: envelope.monster.name, finalName: envelope.monster.name, status: envelope.monster.status, imageDataUrl: imageDataUrl(envelope.monster.image, files) });
  }
  if (monsters.length !== typedManifest.counts.monsters) throw new Error('A quantidade de monstros diverge do manifesto.');

  const targetRows = targetLibraryId ? await listMonsters(targetLibraryId, 'all') : [];
  const reserved = targetRows.map((row) => row.name);
  for (const monster of monsters) {
    monster.finalName = resolveImportedName(monster.sourceName, reserved);
    reserved.push(monster.finalName);
  }
  const libraries = await listLibraries();
  const finalLibraryName = library ? resolveImportedName(library.library.name, libraries.map((item) => item.name)) : null;
  const planId = crypto.randomUUID();
  plans.set(planId, { manifest: typedManifest, library, monsters, files, finalLibraryName });
  return {
    planId,
    inspection: {
      packageKind: typedManifest.packageKind,
      systemCode: typedManifest.systemCode,
      schemaKey: typedManifest.schemaKey,
      schemaVersion: typedManifest.schemaVersion,
      libraryName: library?.library.name ?? null,
      monsterCount: monsters.length,
      activeCount: monsters.filter((monster) => monster.status === 'active').length,
      archivedCount: monsters.filter((monster) => monster.status === 'archived').length,
      imageCount: typedManifest.counts.images,
      compressedBytes: file.size,
      uncompressedBytes: typedManifest.totalUncompressedBytes,
      sameZipImportedBefore: false,
      previousImportAt: null,
      warnings: [],
      errors: [],
      monstersPreview: monsters.map(({ sourceName, finalName, status }) => ({ sourceName, finalName, status })),
    },
  };
}

export function cancelPortableImport(planId: string): void { plans.delete(planId); }

export async function executePortableImport(options: { planId: string; targetLibraryId?: string; createLibrary?: boolean }, expectedKind: 'library' | 'monster'): Promise<ImportReport> {
  const plan = plans.get(options.planId);
  if (!plan) throw new Error('O pacote expirou. Selecione-o novamente para inspecionar.');
  if (plan.manifest.packageKind !== expectedKind) throw new Error(`Este pacote é do tipo ${plan.manifest.packageKind}; abra o fluxo de importação correspondente.`);
  plans.delete(options.planId);
  let createdLibrary: Library | null = null;
  const createdMonsters: MonsterRecord[] = [];
  let libraryId = options.targetLibraryId;
  try {
    if (plan.manifest.packageKind === 'library') {
      if (!plan.library || options.createLibrary === false) throw new Error('A importação de biblioteca precisa criar uma nova biblioteca.');
      const cover = imageDataUrl(plan.library.library.image, plan.files);
      createdLibrary = await createLibrary({ name: plan.finalLibraryName ?? plan.library.library.name, systemCode: plan.manifest.systemCode, imageDataUrl: cover });
      libraryId = createdLibrary.id;
    }
    if (!libraryId) throw new Error('Selecione uma biblioteca de destino para importar os monstros.');
    for (const item of plan.monsters) {
      const envelope = structuredClone(item.envelope);
      envelope.monster.name = item.finalName;
      const now = new Date().toISOString();
      const document = mapPortableMonster(envelope, { libraryId, now });
      document.image = null;
      document.contentHash = '0'.repeat(64);
      document.rowVersion = 1;
      if (document.systemCode === 'shadowlords3e') {
        for (const profile of document.profiles) {
          profile.specialDefensesSummary ||= 'Não informado';
          profile.magicProtectionSummary ||= 'Não informado';
          if (profile.statistics.activeDefense.enabled && !profile.statistics.activeDefense.restrictions) profile.statistics.activeDefense.restrictions = 'Não especificado';
        }
      }
      const importedImage = imageDataUrl(item.envelope.monster.image, plan.files);
      let record = await createMonster(libraryId, document as MonsterDocument, importedImage);
      if (item.status === 'archived') record = await setMonsterArchived(record.document.id, true, record.document.rowVersion ?? 1);
      createdMonsters.push(record);
    }
    const report: ImportReport = {
      operationId: crypto.randomUUID(),
      importedMonsterCount: createdMonsters.length,
      renamedMonsterCount: plan.monsters.filter((item) => item.sourceName !== item.finalName).length,
      warningCount: 0,
      createdLibraryId: createdLibrary?.id ?? null,
      targetLibraryId: libraryId,
      openedMonsterId: createdMonsters[0]?.document.id ?? null,
      warnings: [],
    };
    reports.set(report.operationId, report);
    return report;
  } catch (error) {
    const cleanupErrors: string[] = [];
    if (createdLibrary) {
      try {
        await moveLibraryToTrash(createdLibrary);
        await deleteLibraryPermanently(createdLibrary.id, createdLibrary.name);
      } catch { cleanupErrors.push(createdLibrary.name); }
    } else {
      for (const record of createdMonsters.reverse()) {
        try {
          await moveMonsterToTrash(record.document.id, record.document.rowVersion ?? 1);
          await deleteMonsterPermanently(record.document.id, record.document.name);
        } catch { cleanupErrors.push(record.document.name); }
      }
    }
    const detail = error instanceof Error ? error.message : 'A importação não foi concluída.';
    if (cleanupErrors.length) throw new Error(`${detail}\nNão foi possível desfazer estes registros: ${cleanupErrors.join(', ')}.`);
    throw error;
  }
}

export function getPortableImportReport(operationId: string): ImportReport | null { return reports.get(operationId) ?? null; }
