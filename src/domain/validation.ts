import { validateAdd2eSchema, validateShadowlordsSchema } from '../generated/ajv-domain-validators';

export interface ContractValidation {
  valid: boolean;
  issues: string[];
}

function validateWithSchema(
  validator: typeof validateAdd2eSchema,
  value: unknown,
): ContractValidation {
  const valid = validator(value);
  const issues = (validator.errors ?? []).map((error) => {
    const path = error.instancePath || '/';
    const messages: Record<string, string> = {
      additionalProperties: 'propriedade não reconhecida.',
      const: 'valor incompatível com o contrato.',
      enum: 'valor fora do vocabulário permitido.',
      maxItems: 'quantidade de itens acima do limite.',
      maxLength: 'texto acima do limite de caracteres.',
      maximum: 'valor acima do limite permitido.',
      minItems: 'quantidade de itens abaixo do mínimo.',
      minLength: 'texto abaixo do mínimo de caracteres.',
      minimum: 'valor abaixo do limite permitido.',
      pattern: 'formato inválido.',
      required: 'campo obrigatório ausente.',
      type: 'tipo de valor inválido.',
      uniqueItems: 'a lista contém itens repetidos.',
    };
    return `${path}: ${messages[error.keyword] ?? 'valor inválido.'}`;
  });

  return { valid, issues };
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function profilesOf(value: unknown): Record<string, unknown>[] {
  const monster = object(value);
  return Array.isArray(monster?.profiles)
    ? monster.profiles.map(object).filter((profile) => profile !== null)
    : [];
}

function primaryProfileIssues(profiles: Record<string, unknown>[]): string[] {
  const primaryCount = profiles.filter((profile) => profile.isPrimary === true).length;
  return primaryCount === 1
    ? []
    : ['/profiles: deve haver exatamente um perfil marcado como principal.'];
}

export function validateAdd2eMonster(value: unknown): ContractValidation {
  const result = validateWithSchema(validateAdd2eSchema, value);
  const profiles = profilesOf(value);
  result.issues.push(...primaryProfileIssues(profiles));
  for (const [tableIndex, tableValue] of (object(value)?.auxiliaryTables as unknown[] ?? []).entries()) {
    const table = object(tableValue);
    if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) continue;
    for (const [rowIndex, row] of table.rows.entries()) {
      if (Array.isArray(row) && row.length !== table.columns.length) {
        result.issues.push(`/auxiliaryTables/${tableIndex}/rows/${rowIndex}: a quantidade de células deve corresponder ao número de colunas.`);
      }
    }
  }
  result.valid = result.issues.length === 0;
  return result;
}

const dragonAgeCategories = ['hatchling', 'young', 'adult', 'old', 'ancient'] as const;

export function validateShadowlordsMonster(value: unknown): ContractValidation {
  const result = validateWithSchema(validateShadowlordsSchema, value);
  const monster = object(value);
  const profiles = profilesOf(value);
  result.issues.push(...primaryProfileIssues(profiles));

  for (const [index, profile] of profiles.entries()) {
    const statistics = object(profile.statistics);
    if (!statistics) continue;

    const attacks = Array.isArray(statistics.attacks) ? statistics.attacks : [];
    if (profile.isPrimary === true && attacks.length === 0) {
      result.issues.push(`/profiles/${index}/statistics/attacks: o perfil principal precisa ter ao menos um ataque.`);
    }

    const defense = object(statistics.defense);
    if (defense) {
      const bonuses = ['natural', 'armorBonus', 'shieldBonus', 'magicBonus', 'otherBonus'];
      if (bonuses.every((key) => Number.isInteger(defense[key])) && Number.isInteger(defense.final)) {
        const expected = bonuses.reduce((sum, key) => sum + Number(defense[key]), 0);
        if (defense.final !== expected) {
          result.issues.push(`/profiles/${index}/statistics/defense/final: deve corresponder à soma dos componentes (${expected}).`);
        }
      }
    }
  }

  const ageProfiles = profiles.filter((profile) => profile.kind === 'age');
  const dragonProfiles = profiles.filter((profile) => object(profile.statistics)?.dragon != null);
  if (monster?.dragonModuleEnabled === true) {
    const categories = ageProfiles.map((profile) => object(object(profile.statistics)?.dragon)?.ageCategory);
    const complete = categories.length === dragonAgeCategories.length
      && dragonAgeCategories.every((category) => categories.filter((value) => value === category).length === 1)
      && ageProfiles.every((profile) => object(object(profile.statistics)?.dragon) !== null);
    if (!complete) {
      result.issues.push('/profiles: o módulo dracônico exige exatamente um perfil com dados para cada idade: Filhote, Jovem, Adulto, Antigo e Ancião.');
    }
    if (dragonProfiles.length !== ageProfiles.length) {
      result.issues.push('/profiles: apenas perfis etários podem conter dados dracônicos.');
    }
  } else if (ageProfiles.length > 0 || dragonProfiles.length > 0) {
    result.issues.push('/profiles: perfis etários e dados dracônicos exigem o módulo dracônico habilitado.');
  }

  result.valid = result.issues.length === 0;
  return result;
}

export function validateMonster(value: unknown): ContractValidation {
  const systemCode = object(value)?.systemCode;
  if (systemCode === 'add2e') return validateAdd2eMonster(value);
  if (systemCode === 'shadowlords3e') return validateShadowlordsMonster(value);
  return { valid: false, issues: ['/systemCode: sistema não reconhecido.'] };
}
