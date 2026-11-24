/* Gerado automaticamente dos schemas JSON. Não editar manualmente. */

export type Uuid = string;
export type Hash = string;
export type Climate = {
  code:
    | 'arctic'
    | 'subarctic'
    | 'cold'
    | 'temperate'
    | 'subtropical'
    | 'tropical'
    | 'hot'
    | 'arid'
    | 'any'
    | 'extraplanar'
    | 'special'
    | 'other';
  other: TextOrNull;
};
export type TextOrNull = string | null;
export type Terrain = {
  code:
    | 'underground'
    | 'plains'
    | 'forest'
    | 'jungle'
    | 'hills'
    | 'mountains'
    | 'swamp'
    | 'desert'
    | 'coast'
    | 'freshwater'
    | 'ocean'
    | 'aquatic'
    | 'urban'
    | 'ruins'
    | 'wilderness'
    | 'aerial'
    | 'space'
    | 'extraplanar'
    | 'any'
    | 'special'
    | 'other';
  other: TextOrNull;
};
export type ActivityPeriod = {
  code: 'day' | 'night' | 'twilight' | 'dawn' | 'dusk' | 'any' | 'continuous' | 'seasonal' | 'special' | 'other';
  other: TextOrNull;
};
export type DamageReduction = {
  id: Uuid;
  source: string;
  value: number;
  /**
   * @minItems 1
   */
  damageTypes: (
    | 'slashing'
    | 'piercing'
    | 'bludgeoning'
    | 'fire'
    | 'cold'
    | 'electricity'
    | 'acid'
    | 'poison'
    | 'magic'
    | 'physical'
    | 'all'
    | 'other'
  )[];
  usesMode: 'limited' | 'unlimited' | 'special';
  uses: number | null;
  notes: string | null;
  sortOrder: number;
};
export type ActiveDefense = {
  enabled: boolean;
  formula: TextOrNull;
  cost: TextOrNull;
  restrictions: TextOrNull;
  notes: TextOrNull;
};
export type UtcDateTime = string;

/**
 * Contrato v1 para fichas de monstros Shadowlords Mini System 3E.
 */
export interface ShadowlordsMonster {
  id: Uuid;
  libraryId: Uuid;
  systemCode: 'shadowlords3e';
  schemaKey: 'shadowlords3e.monster';
  schemaVersion: 1;
  name: string;
  /**
   * @maxItems 6
   */
  descriptors: string[];
  dragonModuleEnabled: boolean;
  status: 'active' | 'archived' | 'trashed';
  image: Image | null;
  narratives: Narratives;
  /**
   * @minItems 1
   */
  profiles: Profile[];
  /**
   * @maxItems 10
   */
  sources: Source[];
  contentHash: Hash;
  createdAt: UtcDateTime;
  updatedAt: UtcDateTime;
  rowVersion?: number;
}
export interface Image {
  path: string;
  mediaType: 'image/webp';
  width: number;
  height: number;
  sha256: Hash;
}
export interface Narratives {
  description: string;
  combat: string;
  habitatSociety: string;
  ecology: string;
  tactics: string | null;
  variations: string | null;
  additionalNotes: string | null;
}
export interface Profile {
  id: Uuid;
  label: string;
  kind: 'primary' | 'variant' | 'leader' | 'chief' | 'shaman' | 'form' | 'caste' | 'age' | 'other';
  isPrimary: boolean;
  sortOrder: number;
  /**
   * @minItems 1
   */
  climates: Climate[];
  /**
   * @minItems 1
   */
  terrains: Terrain[];
  climateTerrainNotes: TextOrNull;
  frequency: {
    code: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'unique' | 'variable' | 'other';
    other: TextOrNull;
  };
  organization: string;
  /**
   * @minItems 1
   */
  activityPeriods: ActivityPeriod[];
  activityNotes: TextOrNull;
  diet: string;
  quantityEncounter: string;
  size: string;
  morale: string;
  treasure: string;
  specialDefensesSummary: string;
  magicProtectionSummary: string;
  profileNotes: string | null;
  statistics: Statistics;
}
export interface Statistics {
  type: 'shadowlords3e';
  attributes: Attributes;
  hitPoints: number;
  defense: Defense;
  damageReductions: DamageReduction[];
  attacks: Attack[];
  activeDefense: ActiveDefense;
  skills: Skill[];
  movement: string;
  traits: Trait[];
  spells: Spell[];
  specialsSummary: string;
  dragon: Dragon | null;
}
export interface Attributes {
  for: number;
  agi: number;
  sau: number;
  int: number;
  sab: number;
  per: number;
}
export interface Defense {
  natural: number;
  armorBonus: number;
  shieldBonus: number;
  magicBonus: number;
  otherBonus: number;
  otherDescription: TextOrNull;
  final: number;
}
export interface Attack {
  id: Uuid;
  name: string;
  attackFormula: string;
  attackNotes: string | null;
  damageFormula: string;
  /**
   * @minItems 1
   */
  damageTypes: (
    | 'slashing'
    | 'piercing'
    | 'bludgeoning'
    | 'fire'
    | 'cold'
    | 'electricity'
    | 'acid'
    | 'poison'
    | 'magic'
    | 'physical'
    | 'all'
    | 'other'
  )[];
  range: string;
  maxUsesPerRound: number | null;
  notes: string | null;
  sortOrder: number;
}
export interface Skill {
  id: Uuid;
  name: string;
  modifier: number;
  notes: TextOrNull;
  sortOrder: number;
}
export interface Trait {
  id: Uuid;
  name: string;
  category:
    | 'special'
    | 'sense'
    | 'immunity'
    | 'resistance'
    | 'weakness'
    | 'innate_power'
    | 'tactic'
    | 'reaction'
    | 'aura'
    | 'other';
  summary: string;
  details: string | null;
  uses: TextOrNull;
  recharge: TextOrNull;
  sortOrder: number;
}
export interface Spell {
  id: Uuid;
  name: string;
  mode: 'spell' | 'innate' | 'item' | 'special';
  castingSkill: TextOrNull;
  pvCost: number | null;
  uses: TextOrNull;
  recharge: TextOrNull;
  notes: string;
  sortOrder: number;
}
export interface Dragon {
  ageCategory: 'hatchling' | 'young' | 'adult' | 'old' | 'ancient';
  breath: Breath;
  maxPhysicalAttacksPerRound: number;
  maxBitesPerRound: number;
  airbornePhysicalAttackLimit: number;
  notes: string | null;
}
export interface Breath {
  name: string;
  shape: 'line' | 'cone' | 'cloud' | 'other';
  element: string;
  damage: string;
  area: string;
  saveAttribute: 'FOR' | 'AGI' | 'SAÚ' | 'INT' | 'SAB' | 'PER' | 'other';
  difficulty: number;
  successEffect: string;
  activeDefenseAllowed: boolean;
  frequency: string;
  actionRestrictions: string;
}
export interface Source {
  id: Uuid;
  title: string;
  entry: string | null;
  page: string | null;
  notes: string | null;
  sortOrder: number;
}
