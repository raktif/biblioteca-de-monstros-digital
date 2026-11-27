import { validateAdd2eSchema, validateShadowlordsSchema } from '../generated/ajv-domain-validators';
import { activityOptions, climateOptions, dietOptions, frequencyOptions, organizationOptions, sizeOptions, terrainOptions, traitCategoryOptions } from './shadowlords-vocabularies';

export interface ContractValidation {
  valid: boolean;
  issues: string[];
}

function similarity(left: string, right: string): number {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const a = normalize(left);
  const b = normalize(right);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - row[b.length] / Math.max(a.length, b.length, 1);
}

function validateWithSchema(
  validator: typeof validateAdd2eSchema,
  value: unknown,
): ContractValidation {
  const valid = validator(value);
  const issues = (validator.errors ?? []).map((error) => {
    const path = error.instancePath || '/';
    if (error.keyword === 'enum') {
      const segments = path.split('/').filter(Boolean);
      const field = segments.at(-1) ?? 'campo';
      const received = segments.reduce<unknown>((current, segment) => {
        if (Array.isArray(current)) return current[Number(segment)];
        if (typeof current === 'object' && current !== null) return (current as Record<string, unknown>)[segment];
        return undefined;
      }, value);
      const fieldLabels: Record<string, string> = { organization: 'organização', category: 'categoria da característica', kind: 'tipo do perfil', code: 'código', status: 'estado', ageCategory: 'faixa etária', damageType: 'tipo de dano', mode: 'modo', shape: 'formato', attribute: 'atributo' };
      const vocabulary = error.params.allowedValues as unknown[] | undefined;
      const knownOptions = [activityOptions, climateOptions, dietOptions, frequencyOptions, organizationOptions, sizeOptions, terrainOptions, traitCategoryOptions]
        .flatMap((options) => options as readonly (readonly [unknown, string])[])
        .filter(([code]) => vocabulary?.includes(code));
      const options = knownOptions.length === vocabulary?.length
        ? knownOptions.map(([code, label]) => ({ code: String(code), label }))
        : (vocabulary ?? []).map((code) => ({ code: String(code), label: String(code) }));
      const allowed = options.map(({ code, label }) => `${label} (código: ${code})`).join('; ');
      const suggestions = options
        .map((option) => ({ ...option, score: Math.max(similarity(String(received), option.code), similarity(String(received), option.label)) }))
        .filter((option) => option.score >= 0.7)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      const suggestion = suggestions.length ? ` Sugestão${suggestions.length > 1 ? 'ões' : ''} (similaridade ≥ 70%): ${suggestions.map(({ code, label }) => `${label} — use o código “${code}”`).join('; ')}.` : '';
      return `${path}: ${fieldLabels[field] ?? field} recebeu “${String(received)}”, que não é válido.${suggestion}${allowed ? ` Valores aceitos (use o código): ${allowed}.` : ''}`;
    }
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
