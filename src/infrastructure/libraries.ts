import { invoke, isTauri } from '@tauri-apps/api/core';

export type SystemCode = 'add2e' | 'shadowlords3e';

export interface Library {
  id: string;
  systemCode: SystemCode;
  systemName: string;
  name: string;
  imageDataUrl: string | null;
  activeMonsterCount: number;
  totalMonsterCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  purgeAfter: string | null;
  rowVersion: number;
}

interface LibraryInput {
  name: string;
  systemCode: SystemCode;
  imageDataUrl?: string | null;
}

const STORAGE_KEY = 'bmd.stage2.libraries';
let memoryLibraries: Library[] = [];

function readBrowserLibraries(): Library[] {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as Library[]) : memoryLibraries;
  } catch {
    return memoryLibraries;
  }
}

function writeBrowserLibraries(libraries: Library[]): void {
  memoryLibraries = libraries;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(libraries));
  } catch {
    // Vitest and restricted browser contexts use the in-memory fallback.
  }
}

function browserSystemName(code: SystemCode): string {
  return code === 'add2e' ? 'AD&D 2ª Edição' : 'Shadowlords Mini System 3E';
}

function browserSortName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function sortLibraries(libraries: Library[]): Library[] {
  return [...libraries].sort((a, b) => browserSortName(a.name).localeCompare(browserSortName(b.name), 'pt-BR') || a.createdAt.localeCompare(b.createdAt));
}

function browserCreate(input: LibraryInput): Library {
  const name = input.name.trim();
  if (!name || [...name].length > 120) throw { code: 'LIBRARY_NAME_INVALID', message: 'O nome deve ter de 1 a 120 caracteres.' };
  const now = new Date().toISOString();
  const library: Library = {
    id: crypto.randomUUID(), systemCode: input.systemCode, systemName: browserSystemName(input.systemCode), name,
    imageDataUrl: input.imageDataUrl ?? null, activeMonsterCount: 0, totalMonsterCount: 0,
    createdAt: now, updatedAt: now, deletedAt: null, purgeAfter: null, rowVersion: 1,
  };
  writeBrowserLibraries([...readBrowserLibraries(), library]);
  return library;
}

export async function listLibraries(): Promise<Library[]> {
  return isTauri() ? invoke<Library[]>('library_list') : sortLibraries(readBrowserLibraries().filter((item) => !item.deletedAt));
}

export function updateBrowserLibraryMonsterCounts(id: string, activeMonsterCount: number, totalMonsterCount: number): void {
  if (isTauri()) return;
  writeBrowserLibraries(readBrowserLibraries().map((item) => item.id === id ? { ...item, activeMonsterCount, totalMonsterCount } : item));
}

export async function listTrashedLibraries(): Promise<Library[]> {
  return isTauri() ? invoke<Library[]>('library_trash_list') : readBrowserLibraries().filter((item) => !!item.deletedAt && !!item.purgeAfter && item.purgeAfter > new Date().toISOString());
}

export async function createLibrary(input: LibraryInput): Promise<Library> {
  return isTauri()
    ? invoke<Library>('library_create', { name: input.name, systemCode: input.systemCode, imageDataUrl: input.imageDataUrl ?? null })
    : browserCreate(input);
}

export async function updateLibrary(id: string, input: LibraryInput, rowVersion: number, removeImage: boolean): Promise<Library> {
  if (isTauri()) return invoke<Library>('library_update', {
    id, name: input.name, systemCode: input.systemCode, imageDataUrl: input.imageDataUrl ?? null,
    removeImage, expectedRowVersion: rowVersion,
  });
  const current = readBrowserLibraries().find((item) => item.id === id);
  if (!current) throw { code: 'LIBRARY_NOT_FOUND', message: 'Biblioteca não encontrada.' };
  if (current.rowVersion !== rowVersion) throw { code: 'CONFLICT_ROW_VERSION', message: 'A biblioteca foi alterada. Recarregue os dados e tente novamente.' };
  if (current.totalMonsterCount && current.systemCode !== input.systemCode) throw { code: 'LIBRARY_SYSTEM_LOCKED', message: 'O sistema não pode ser alterado depois que a biblioteca recebeu monstros.' };
  const updated = { ...current, name: input.name.trim(), systemCode: input.systemCode, systemName: browserSystemName(input.systemCode), imageDataUrl: removeImage ? null : input.imageDataUrl ?? current.imageDataUrl, updatedAt: new Date().toISOString(), rowVersion: rowVersion + 1 };
  writeBrowserLibraries(readBrowserLibraries().map((item) => item.id === id ? updated : item));
  return updated;
}

export async function moveLibraryToTrash(item: Library): Promise<void> {
  if (isTauri()) return invoke('library_move_to_trash', { id: item.id, expectedRowVersion: item.rowVersion });
  const now = new Date();
  const library = { ...item, deletedAt: now.toISOString(), purgeAfter: new Date(now.getTime() + 30 * 86400000).toISOString(), updatedAt: now.toISOString(), rowVersion: item.rowVersion + 1 };
  writeBrowserLibraries(readBrowserLibraries().map((entry) => entry.id === item.id ? library : entry));
}

export async function restoreLibrary(id: string): Promise<void> {
  if (isTauri()) return invoke('library_restore', { id });
  const current = readBrowserLibraries().find((item) => item.id === id && item.deletedAt);
  if (!current) throw { code: 'LIBRARY_NOT_FOUND', message: 'Biblioteca não encontrada na lixeira.' };
  if (!current.purgeAfter || current.purgeAfter <= new Date().toISOString()) throw { code: 'LIBRARY_PURGE_EXPIRED', message: 'O prazo de restauração desta biblioteca terminou.' };
  writeBrowserLibraries(readBrowserLibraries().map((item) => item.id === id ? { ...item, deletedAt: null, purgeAfter: null, rowVersion: item.rowVersion + 1 } : item));
}

export async function deleteLibraryPermanently(id: string, confirmationName: string): Promise<void> {
  if (isTauri()) return invoke('library_delete_permanently', { id, confirmationName });
  writeBrowserLibraries(readBrowserLibraries().filter((item) => item.id !== id || !item.deletedAt || item.name !== confirmationName));
  if (readBrowserLibraries().some((item) => item.id === id)) throw { code: 'CONFIRMATION_NAME_MISMATCH', message: 'Digite o nome exato da biblioteca para confirmar.' };
}
