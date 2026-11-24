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
export type UtcDateTime = string;

/**
 * Contrato v1 para fichas de monstros AD&D 2a Edicao.
 */
export interface Add2EMonster {
  id: Uuid;
  libraryId: Uuid;
  systemCode: 'add2e';
  schemaKey: 'add2e.monster';
  schemaVersion: 1;
  name: string;
  editorialCategory: string | null;
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
  auxiliaryTables: AuxiliaryTable[];
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
  activityPeriods: {
    code: 'day' | 'night' | 'twilight' | 'dawn' | 'dusk' | 'any' | 'continuous' | 'seasonal' | 'special' | 'other';
    other: TextOrNull;
  }[];
  activityNotes: TextOrNull;
  diet: string;
  treasure: string;
  quantityEncounter: string;
  size: string;
  morale: string;
  profileNotes: string | null;
  statistics: Statistics;
}
export interface Statistics {
  type: 'add2e';
  intelligence: string;
  alignment: string;
  armorClass: string;
  movement: string;
  hitDice: string;
  thac0: string;
  attacksPerRound: string;
  damagePerAttack: string;
  specialAttacks: string;
  specialDefenses: string;
  magicResistance: string;
  experienceValue: string;
  psionics: Psionics | null;
}
export interface Psionics {
  level: string;
  disciplinesSciencesDevotions: string;
  attackDefenseModes: string;
  powerScore: string;
  psps: string;
  powers: string;
}
export interface AuxiliaryTable {
  id: Uuid;
  title: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  columns: {
    header: string;
    alignment: 'left' | 'center' | 'right';
  }[];
  /**
   * @maxItems 200
   */
  rows: string[][];
  notes: TextOrNull;
  sortOrder: number;
}
export interface Source {
  id: Uuid;
  title: string;
  entry: string | null;
  page: string | null;
  notes: string | null;
  sortOrder: number;
}
