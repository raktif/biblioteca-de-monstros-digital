import type { Add2EMonster } from '../generated/add2e-monster';
import type { ShadowlordsMonster } from '../generated/shadowlords3e-monster';
import type { PortableMonsterEnvelope } from './types';

type JsonObject = Record<string, any>;
export type IdentityFactory = () => string;
export type ImportContext = { libraryId: string; now: string; createId?: IdentityFactory; imagePath?: string | null };

function id(context: ImportContext): string { return (context.createId ?? (() => crypto.randomUUID()))(); }
function restoreCode(value: any): any { if (Array.isArray(value)) return value.map(restoreCode); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restoreCode(item)])); return value === 'desert' ? 'deserts' : value; }
function baseDocument(envelope: PortableMonsterEnvelope, context: ImportContext): JsonObject {
  const monster = restoreCode(envelope.monster) as JsonObject;
  const monsterId = id(context);
  const result: JsonObject = { ...monster, id: monsterId, libraryId: context.libraryId, systemCode: envelope.systemCode, schemaKey: envelope.schemaKey, schemaVersion: envelope.schemaVersion, status: monster.status, createdAt: context.now, updatedAt: context.now, rowVersion: 1, image: context.imagePath ? { ...(monster.image ?? {}), path: context.imagePath } : null };
  result.profiles = (monster.profiles ?? []).map((profile: JsonObject) => ({ ...profile, id: id(context), sortOrder: 0 }));
  result.profiles.forEach((profile: JsonObject, index: number) => { profile.sortOrder = index; });
  result.sources = (monster.sources ?? []).map((source: JsonObject, index: number) => ({ ...source, id: id(context), sortOrder: index }));
  return result;
}

export function mapPortableAdd2e(envelope: PortableMonsterEnvelope, context: ImportContext): Add2EMonster {
  const result = baseDocument(envelope, context);
  result.auxiliaryTables = (result.auxiliaryTables ?? []).map((table: JsonObject, index: number) => ({ ...table, id: id(context), sortOrder: index }));
  return result as Add2EMonster;
}

export function mapPortableShadowlords(envelope: PortableMonsterEnvelope, context: ImportContext): ShadowlordsMonster {
  const result = baseDocument(envelope, context);
  for (const profile of result.profiles as JsonObject[]) {
    const stats = profile.statistics as JsonObject;
    for (const key of ['damageReductions', 'attacks', 'skills', 'traits', 'spells']) stats[key] = (stats[key] ?? []).map((item: JsonObject, index: number) => ({ ...item, id: id(context), sortOrder: index }));
  }
  return result as ShadowlordsMonster;
}

export function mapPortableMonster(envelope: PortableMonsterEnvelope, context: ImportContext): Add2EMonster | ShadowlordsMonster { return envelope.systemCode === 'add2e' ? mapPortableAdd2e(envelope, context) : mapPortableShadowlords(envelope, context); }
