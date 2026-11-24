import { invoke, isTauri } from '@tauri-apps/api/core';
import type { Add2EMonster } from '../generated/add2e-monster';
import { validateAdd2eMonster } from '../domain/validation';

export type MonsterStatus = 'active' | 'archived' | 'trashed';
export interface MonsterSummary {
  id: string;
  libraryId: string;
  name: string;
  editorialCategory: string | null;
  status: MonsterStatus;
  imageDataUrl: string | null;
  updatedAt: string;
  rowVersion: number;
}
export interface MonsterRecord { document: Add2EMonster; imageDataUrl: string | null }
interface StoredMonster { document: Add2EMonster; imageDataUrl: string | null; previousStatus: 'active' | 'archived' | null }
type MonsterInput = Add2EMonster;

const STORAGE_KEY = 'bmd.stage3.monsters';
let memoryMonsters: StoredMonster[] = [];

function readBrowserMonsters(): StoredMonster[] {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as StoredMonster[] : memoryMonsters;
  } catch { return memoryMonsters; }
}

function writeBrowserMonsters(monsters: StoredMonster[]): void {
  memoryMonsters = monsters;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(monsters)); } catch { /* in-memory fallback */ }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key.normalize('NFC'))}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(typeof value === 'string' ? value.normalize('NFC') : value);
}

function withHash(document: Add2EMonster): Add2EMonster {
  const copy = structuredClone(document) as Add2EMonster;
  const hashInput = { ...copy } as Record<string, unknown>;
  delete hashInput.contentHash; delete hashInput.updatedAt; delete hashInput.rowVersion;
  if (hashInput.image && typeof hashInput.image === 'object') {
    const image = { ...(hashInput.image as Record<string, unknown>) };
    delete image.path;
    hashInput.image = image;
  }
  // The browser adapter is a UI prototype; native Rust computes SHA-256 for persisted desktop records.
  let hash = 2166136261;
  for (const char of canonical(hashInput)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  copy.contentHash = hash.toString(16).padStart(8, '0').repeat(8);
  return copy;
}

function getBrowserLibrary(id: string): { systemCode: string; deletedAt: string | null } {
  try {
    const stored = globalThis.localStorage?.getItem('bmd.stage2.libraries');
    const library = stored ? (JSON.parse(stored) as { id: string; systemCode: string; deletedAt: string | null }[]).find((item) => item.id === id) : undefined;
    if (library) return library;
  } catch { /* use no mock parent when browser storage is unavailable */ }
  return { systemCode: 'add2e', deletedAt: null };
}

function summary(item: StoredMonster): MonsterSummary {
  return {
    id: item.document.id, libraryId: item.document.libraryId, name: item.document.name,
    editorialCategory: item.document.editorialCategory, status: item.document.status,
    imageDataUrl: item.imageDataUrl, updatedAt: item.document.updatedAt,
    rowVersion: item.document.rowVersion ?? 1,
  };
}

export async function listMonsters(libraryId: string, status: MonsterStatus | 'all' = 'active'): Promise<MonsterSummary[]> {
  if (isTauri()) return invoke<MonsterSummary[]>('monster_list', { libraryId, status });
  return readBrowserMonsters().filter((item) => item.document.libraryId === libraryId && (status === 'all' || item.document.status === status)).map(summary).sort((a, b) => a.name.normalize('NFD').localeCompare(b.name.normalize('NFD'), 'pt-BR'));
}

export async function getMonster(id: string): Promise<MonsterRecord> {
  if (isTauri()) return invoke<MonsterRecord>('monster_get', { id });
  const item = readBrowserMonsters().find((candidate) => candidate.document.id === id && candidate.document.status !== 'trashed');
  if (!item) throw { code: 'MONSTER_NOT_FOUND', message: 'Monstro não encontrado.' };
  return { document: structuredClone(item.document), imageDataUrl: item.imageDataUrl };
}

export async function createMonster(libraryId: string, document: MonsterInput, imageDataUrl: string | null): Promise<MonsterRecord> {
  const validation = validateAdd2eMonster(document);
  if (!validation.valid) throw { code: 'MONSTER_SCHEMA_INVALID', message: validation.issues.join('\n') };
  if (isTauri()) return invoke<MonsterRecord>('monster_create', { libraryId, document, imageDataUrl });
  const library = getBrowserLibrary(libraryId);
  if (library.deletedAt) throw { code: 'LIBRARY_NOT_FOUND', message: 'A biblioteca está na lixeira.' };
  if (library.systemCode !== 'add2e') throw { code: 'MONSTER_SYSTEM_MISMATCH', message: 'Esta etapa aceita fichas AD&D 2ª Edição.' };
  const now = new Date().toISOString();
  const saved = withHash({ ...document, id: crypto.randomUUID(), libraryId, systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1, status: 'active', image: null, createdAt: now, updatedAt: now, rowVersion: 1 });
  writeBrowserMonsters([...readBrowserMonsters(), { document: saved, imageDataUrl, previousStatus: null }]);
  return { document: structuredClone(saved), imageDataUrl };
}

export async function updateMonster(id: string, document: MonsterInput, imageDataUrl: string | null, removeImage: boolean, expectedRowVersion: number): Promise<MonsterRecord> {
  const validation = validateAdd2eMonster(document);
  if (!validation.valid) throw { code: 'MONSTER_SCHEMA_INVALID', message: validation.issues.join('\n') };
  if (isTauri()) return invoke<MonsterRecord>('monster_update', { id, document, imageDataUrl, removeImage, expectedRowVersion });
  const items = readBrowserMonsters();
  const current = items.find((item) => item.document.id === id && item.document.status !== 'trashed');
  if (!current) throw { code: 'MONSTER_NOT_FOUND', message: 'Monstro não encontrado.' };
  if ((current.document.rowVersion ?? 1) !== expectedRowVersion) throw { code: 'CONFLICT_ROW_VERSION', message: 'A ficha foi alterada. Recarregue e tente novamente.' };
  const now = new Date().toISOString();
  const saved = withHash({ ...document, id, libraryId: current.document.libraryId, status: current.document.status, image: null, createdAt: current.document.createdAt, updatedAt: now, rowVersion: expectedRowVersion + 1 });
  const preview = removeImage ? null : imageDataUrl ?? current.imageDataUrl;
  writeBrowserMonsters(items.map((item) => item.document.id === id ? { ...item, document: saved, imageDataUrl: preview } : item));
  return { document: structuredClone(saved), imageDataUrl: preview };
}

export async function setMonsterArchived(id: string, archived: boolean, expectedRowVersion: number): Promise<MonsterRecord> {
  if (isTauri()) return invoke<MonsterRecord>('monster_set_archived', { id, archived, expectedRowVersion });
  const items = readBrowserMonsters();
  const current = items.find((item) => item.document.id === id && item.document.status !== 'trashed');
  if (!current) throw { code: 'MONSTER_NOT_FOUND', message: 'Monstro não encontrado.' };
  if ((current.document.rowVersion ?? 1) !== expectedRowVersion) throw { code: 'CONFLICT_ROW_VERSION', message: 'A ficha foi alterada. Recarregue e tente novamente.' };
  const document = withHash({ ...current.document, status: archived ? 'archived' : 'active', updatedAt: new Date().toISOString(), rowVersion: expectedRowVersion + 1 });
  writeBrowserMonsters(items.map((item) => item.document.id === id ? { ...item, document } : item));
  return { document, imageDataUrl: current.imageDataUrl };
}

export async function moveMonsterToTrash(id: string, expectedRowVersion: number): Promise<void> {
  if (isTauri()) return invoke('monster_move_to_trash', { id, expectedRowVersion });
  const items = readBrowserMonsters();
  const current = items.find((item) => item.document.id === id && item.document.status !== 'trashed');
  if (!current) throw { code: 'MONSTER_NOT_FOUND', message: 'Monstro não encontrado.' };
  if ((current.document.rowVersion ?? 1) !== expectedRowVersion) throw { code: 'CONFLICT_ROW_VERSION', message: 'A ficha foi alterada. Recarregue e tente novamente.' };
  const now = new Date().toISOString();
  const document = withHash({ ...current.document, status: 'trashed', updatedAt: now, rowVersion: expectedRowVersion + 1 });
  writeBrowserMonsters(items.map((item) => item.document.id === id ? { ...item, document, previousStatus: current.document.status === 'trashed' ? 'active' : current.document.status } : item));
}

export async function restoreMonster(id: string): Promise<void> {
  if (isTauri()) return invoke('monster_restore', { id });
  const items = readBrowserMonsters();
  const current = items.find((item) => item.document.id === id && item.document.status === 'trashed');
  if (!current) throw { code: 'MONSTER_NOT_FOUND', message: 'Monstro não encontrado na lixeira.' };
  const document = withHash({ ...current.document, status: current.previousStatus ?? 'active', updatedAt: new Date().toISOString(), rowVersion: (current.document.rowVersion ?? 1) + 1 });
  writeBrowserMonsters(items.map((item) => item.document.id === id ? { ...item, document, previousStatus: null } : item));
}

export async function deleteMonsterPermanently(id: string, confirmationName: string): Promise<void> {
  if (isTauri()) return invoke('monster_delete_permanently', { id, confirmationName });
  const items = readBrowserMonsters();
  const target = items.find((item) => item.document.id === id && item.document.status === 'trashed');
  if (!target) throw { code: 'MONSTER_NOT_FOUND', message: 'Mova o monstro para a lixeira primeiro.' };
  if (target.document.name !== confirmationName) throw { code: 'CONFIRMATION_NAME_MISMATCH', message: 'Digite o nome exato do monstro para confirmar.' };
  writeBrowserMonsters(items.filter((item) => item.document.id !== id));
}
