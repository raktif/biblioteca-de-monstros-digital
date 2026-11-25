import Ajv2020 from 'ajv/dist/2020.js';
import add2eSchema from '../../schemas/portable/v1/add2e-monster.schema.json';
import commonSchema from '../../schemas/portable/v1/common.schema.json';
import librarySchema from '../../schemas/portable/v1/library.schema.json';
import manifestSchema from '../../schemas/portable/v1/manifest.schema.json';
import shadowlordsSchema from '../../schemas/portable/v1/shadowlords3e-monster.schema.json';
import type { PortableMonsterEnvelope, PortableManifest, PortableLibrary } from './types';

export interface PortableValidation { valid: boolean; issues: string[] }

const ajv = new Ajv2020({ allErrors: true, strict: true, formats: { 'date-time': true } });
ajv.addSchema(commonSchema);
const validateAdd2e = ajv.compile(add2eSchema);
const validateShadowlords = ajv.compile(shadowlordsSchema);
const validateLibrary = ajv.compile(librarySchema);
const validateManifest = ajv.compile(manifestSchema);

function issuesOf(errors: typeof validateAdd2e.errors): string[] {
  return (errors ?? []).map((error) => `${error.instancePath || '/'}: ${error.message ?? 'valor inválido.'}`);
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
  const issues = [...issuesOf(validator.errors), ...semanticMonster(value)];
  return { valid: valid && issues.length === 0, issues };
}

export function validatePortableLibrary(value: unknown): PortableValidation {
  const valid = validateLibrary(value);
  return { valid: valid && !validateLibrary.errors?.length, issues: issuesOf(validateLibrary.errors) };
}

export function validatePortableManifest(value: unknown): PortableValidation {
  const valid = validateManifest(value);
  return { valid: valid && !validateManifest.errors?.length, issues: issuesOf(validateManifest.errors) };
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
