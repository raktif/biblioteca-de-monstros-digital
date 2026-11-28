import { validateAdd2ePortable, validateManifestPortable, validateLibraryPortable, validateShadowlordsPortable } from '../generated/ajv-portable-validators';
import { formatValidationErrors } from '../domain/validation-messages';
import type { PortableMonsterEnvelope, PortableManifest, PortableLibrary } from './types';

export interface PortableValidation { valid: boolean; issues: string[] }

const validateAdd2e = validateAdd2ePortable;
const validateShadowlords = validateShadowlordsPortable;
const validateLibrary = validateLibraryPortable;
const validateManifest = validateManifestPortable;

function issuesOf(errors: typeof validateAdd2e.errors, value: unknown): string[] {
  return formatValidationErrors(errors, value);
}

function semanticMonster(value: unknown): string[] {
  const envelope = value as Partial<PortableMonsterEnvelope>;
  const monster = envelope.monster as Record<string, unknown> | undefined;
  const profiles = Array.isArray(monster?.profiles) ? monster.profiles as Record<string, unknown>[] : [];
  const issues: string[] = [];
  if (profiles.filter((profile) => profile.isPrimary === true).length !== 1) issues.push('/monster/profiles: deve haver exatamente um perfil principal.');
  for (const [index, profile] of profiles.entries()) {
    const statistics = profile.statistics as Record<string, unknown> | undefined;
    if (envelope.systemCode === 'shadowlords3e' && statistics) {
      const defense = statistics.defense as Record<string, unknown> | undefined;
      if (defense) {
        const parts = ['natural', 'armorBonus', 'shieldBonus', 'magicBonus', 'otherBonus'];
        const values = parts.map((key) => defense[key]);
        if (values.every((item) => Number.isInteger(item)) && defense.final !== values.reduce<number>((sum, item) => sum + Number(item), 0)) issues.push(`/monster/profiles/${index}/statistics/defense/final: deve corresponder à soma dos componentes.`);
      }
    }
  }
  return issues;
}

export function validatePortableMonster(value: unknown): PortableValidation {
  const validator = (value as { systemCode?: string })?.systemCode === 'add2e' ? validateAdd2e : validateShadowlords;
  const valid = validator(value);
  const issues = [...issuesOf(validator.errors, value), ...semanticMonster(value)];
  return { valid: valid && issues.length === 0, issues };
}

export function validatePortableLibrary(value: unknown): PortableValidation {
  const valid = validateLibrary(value);
  return { valid: valid && !validateLibrary.errors?.length, issues: issuesOf(validateLibrary.errors, value) };
}

export function validatePortableManifest(value: unknown): PortableValidation {
  const valid = validateManifest(value);
  return { valid: valid && !validateManifest.errors?.length, issues: issuesOf(validateManifest.errors, value) };
}

export function assertPortableMonster(value: unknown): asserts value is PortableMonsterEnvelope {
  const result = validatePortableMonster(value);
  if (!result.valid) throw new Error(result.issues.join('\n'));
}

export function assertPortableLibrary(value: unknown): asserts value is PortableLibrary {
  const result = validatePortableLibrary(value);
  if (!result.valid) throw new Error(result.issues.join('\n'));
}

export function assertPortableManifest(value: unknown): asserts value is PortableManifest {
  const result = validatePortableManifest(value);
  if (!result.valid) throw new Error(result.issues.join('\n'));
}
