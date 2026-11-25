import type { Add2EMonster } from '../generated/add2e-monster';
import type { ShadowlordsMonster } from '../generated/shadowlords3e-monster';
import type { Library } from '../infrastructure/libraries';
import type { PortableLibrary, PortableMonster, PortableMonsterEnvelope, PortableProfile, PortableSource } from './types';

type InternalMonster = Add2EMonster | ShadowlordsMonster;
type JsonObject = Record<string, unknown>;

function codeOther(value: { code: string; other: string | null }): { code: string; other: string | null } { return { code: value.code === 'deserts' ? 'desert' : value.code, other: value.other }; }
function source(value: { title: string; entry: string | null; page: string | null; notes: string | null }): PortableSource { return { title: value.title, entry: value.entry, page: value.page, notes: value.notes }; }
function image(value: { path: string; mediaType: string; width: number; height: number } | null, path: string): PortableMonster['image'] { return value ? { path, mediaType: value.mediaType as 'image/jpeg' | 'image/png' | 'image/webp', width: value.width, height: value.height } : null; }

function commonProfile(profile: JsonObject, statistics: JsonObject): PortableProfile {
  return {
    label: String(profile.label), kind: String(profile.kind), isPrimary: Boolean(profile.isPrimary),
    climates: (profile.climates as { code: string; other: string | null }[]).map(codeOther),
    terrains: (profile.terrains as { code: string; other: string | null }[]).map(codeOther),
    climateTerrainNotes: profile.climateTerrainNotes ?? null,
    frequency: codeOther(profile.frequency as { code: string; other: string | null }),
    organization: profile.organization, activityPeriods: (profile.activityPeriods as { code: string; other: string | null }[]).map(codeOther),
    activityNotes: profile.activityNotes ?? null, diet: profile.diet, quantityEncounter: profile.quantityEncounter,
    size: profile.size, morale: profile.morale, treasure: profile.treasure, profileNotes: profile.profileNotes ?? null, statistics,
  } as PortableProfile;
}

function add2eProfile(profile: Add2EMonster['profiles'][number]): PortableProfile {
  const s = profile.statistics;
  return commonProfile(profile as unknown as JsonObject, {
    type: 'add2e', intelligence: s.intelligence, alignment: s.alignment, armorClass: s.armorClass, movement: s.movement,
    hitDice: s.hitDice, thac0: s.thac0, attacksPerRound: s.attacksPerRound, damagePerAttack: s.damagePerAttack,
    specialAttacks: s.specialAttacks, specialDefenses: s.specialDefenses, magicResistance: s.magicResistance,
    experienceValue: s.experienceValue, psionics: s.psionics,
  });
}

function shadowlordsProfile(profile: ShadowlordsMonster['profiles'][number]): PortableProfile {
  const s = profile.statistics;
  const sourceProfile = profile as unknown as JsonObject;
  const statistics: JsonObject = {
    type: 'shadowlords3e', attributes: { ...s.attributes }, hitPoints: s.hitPoints, defense: { ...s.defense },
    damageReductions: s.damageReductions.map(({ source, value, damageTypes, usesMode, uses, notes }) => ({ source, value, damageTypes: [...damageTypes], usesMode, uses, notes })),
    attacks: s.attacks.map(({ name, attackFormula, attackNotes, damageFormula, damageType, range, usageInterval, notes }) => ({ name, attackFormula, attackNotes, damageFormula, damageType, range, usageInterval, notes })),
    activeDefense: { ...s.activeDefense }, skills: s.skills.map(({ name, modifier, notes }) => ({ name, modifier, notes })), movement: s.movement,
    traits: s.traits.map(({ name, category, summary, details, uses, recharge }) => ({ name, category, summary, details, uses, recharge })),
    spells: s.spells.map(({ name, mode, castingSkill, pvCost, uses, recharge, notes }) => ({ name, mode, castingSkill, pvCost, uses, recharge, notes })),
    specialsSummary: s.specialsSummary, dragon: s.dragon ? structuredClone(s.dragon) : null,
  };
  const mapped = commonProfile(sourceProfile, statistics);
  mapped.specialDefensesSummary = sourceProfile.specialDefensesSummary ?? null;
  mapped.magicProtectionSummary = sourceProfile.magicProtectionSummary ?? null;
  return mapped;
}

export function mapAdd2eMonster(monster: Add2EMonster, imagePath = 'images/monster/main.webp'): PortableMonsterEnvelope {
  const portable: PortableMonster = {
    name: monster.name, editorialCategory: monster.editorialCategory, status: monster.status === 'archived' ? 'archived' : 'active',
    image: image(monster.image, imagePath), narratives: { ...monster.narratives }, profiles: monster.profiles.map(add2eProfile),
    auxiliaryTables: monster.auxiliaryTables.map(({ title, columns, rows, notes }) => ({ title, columns: columns.map(({ header, alignment }) => ({ header, alignment })), rows: rows.map((row) => [...row]), notes })),
    sources: monster.sources.map(source),
  };
  return { format: 'biblioteca-de-monstros-digital.add2e.monster', formatVersion: 1, kind: 'monster', systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1, monster: portable };
}

export function mapShadowlordsMonster(monster: ShadowlordsMonster, imagePath = 'images/monster/main.webp'): PortableMonsterEnvelope {
  const portable: PortableMonster = {
    name: monster.name, descriptors: [...monster.descriptors], dragonModuleEnabled: monster.dragonModuleEnabled,
    status: monster.status === 'archived' ? 'archived' : 'active', image: image(monster.image, imagePath), narratives: { ...monster.narratives },
    profiles: monster.profiles.map(shadowlordsProfile), sources: monster.sources.map(source),
  };
  return { format: 'biblioteca-de-monstros-digital.shadowlords3e.monster', formatVersion: 1, kind: 'monster', systemCode: 'shadowlords3e', schemaKey: 'shadowlords3e.monster', schemaVersion: 1, monster: portable };
}

export function mapLibrary(library: Library, imagePath = 'images/library/cover.webp'): PortableLibrary {
  return { format: 'biblioteca-de-monstros-digital.library', formatVersion: 1, kind: 'library', systemCode: library.systemCode, schemaKey: `${library.systemCode}.monster`, schemaVersion: 1, library: { name: library.name, image: library.imageDataUrl ? { path: imagePath, mediaType: 'image/webp', width: 1, height: 1 } : null } };
}

export function mapMonster(monster: InternalMonster, imagePath = 'images/monster/main.webp'): PortableMonsterEnvelope {
  return monster.systemCode === 'add2e' ? mapAdd2eMonster(monster, imagePath) : mapShadowlordsMonster(monster, imagePath);
}
