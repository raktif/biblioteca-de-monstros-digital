import type { ErrorObject } from 'ajv';
import { activityOptions, climateOptions, dietOptions, frequencyOptions, organizationOptions, sizeOptions, terrainOptions, traitCategoryOptions } from './shadowlords-vocabularies';

const labels: Record<string, string> = {
  profiles: 'perfil', activityPeriods: 'período de atividade', other: 'detalhe', climates: 'clima', terrains: 'terreno',
  organization: 'organização', category: 'categoria da característica', kind: 'tipo do perfil', code: 'código', status: 'estado',
  ageCategory: 'faixa etária', damageType: 'tipo de dano', mode: 'modo', shape: 'formato', attribute: 'atributo',
  frequency: 'frequência', diet: 'dieta', size: 'porte', morale: 'moral', statistics: 'estatísticas', traits: 'características',
  attacks: 'ataques', spells: 'magias', skills: 'perícias', defense: 'defesa', final: 'valor final', hitPoints: 'pontos de vida',
  name: 'nome', description: 'descrição', summary: 'resumo', details: 'detalhes', sources: 'fontes', narratives: 'narrativas',
  quantityEncounter: 'quantidade encontrada', treasure: 'tesouro', special: 'especial', dragon: 'dados dracônicos',
};

function readablePath(path: string, missingProperty?: string): string {
  const parts = path.split('/').filter(Boolean);
  if (missingProperty) parts.push(missingProperty);
  const readable = parts.map((part) => {
    if (/^\d+$/.test(part)) return `${Number(part) + 1}`;
    const label = labels[part] ?? part.replace(/([a-z])([A-Z])/g, '$1 $2').toLocaleLowerCase();
    if (part === 'profiles') return label;
    return label;
  });
  let result = '';
  parts.forEach((part, index) => {
    if (/^\d+$/.test(part)) result += ` ${readable[index]}`;
    else result += `${result ? ' › ' : ''}${readable[index]}`;
  });
  return result || 'Ficha';
}

function valueAtPath(value: unknown, path: string): unknown {
  return path.split('/').filter(Boolean).reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) return current[Number(segment)];
    if (typeof current === 'object' && current !== null) return (current as Record<string, unknown>)[segment];
    return undefined;
  }, value);
}

function similarity(left: string, right: string): number {
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const a = normalize(left);
  const b = normalize(right);
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
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

function enumMessage(error: ErrorObject, value: unknown, path: string): string {
  const segments = error.instancePath.split('/').filter(Boolean);
  const received = segments.reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) return current[Number(segment)];
    if (typeof current === 'object' && current !== null) return (current as Record<string, unknown>)[segment];
    return undefined;
  }, value);
  const allowedValues = (error.params as { allowedValues?: unknown[] }).allowedValues ?? [];
  const optionSets = [activityOptions, climateOptions, dietOptions, frequencyOptions, organizationOptions, sizeOptions, terrainOptions, traitCategoryOptions];
  const known = optionSets.flatMap((options) => options as readonly (readonly [unknown, string])[]).filter(([code]) => allowedValues.includes(code));
  const options = known.length === allowedValues.length
    ? known.map(([code, label]) => ({ code: String(code), label }))
    : allowedValues.map((code) => ({ code: String(code), label: String(code) }));
  const matches = options.map((option) => ({ ...option, score: Math.max(similarity(String(received), option.code), similarity(String(received), option.label)) }))
    .filter((option) => option.score >= 0.7).sort((a, b) => b.score - a.score).slice(0, 3);
  const suggestion = matches.length ? ` Sugestão: ${matches.map(({ code, label }) => `${label} — use o código “${code}”`).join('; ')}.` : '';
  const all = options.map(({ code, label }) => `${label} (código: ${code})`).join('; ');
  return `${path}: “${String(received)}” não é um valor aceito.${suggestion} Valores aceitos (use o código): ${all}.`;
}

export function formatValidationError(error: ErrorObject, value: unknown, prefix = ''): string | null {
  // AJV's `if` error only reports that a conditional schema branch failed; the
  // actionable cause is emitted separately at the exact field that failed.
  if (error.keyword === 'if') return null;
  const fullPath = `${prefix}${error.instancePath}`;
  const path = readablePath(fullPath, error.keyword === 'required' ? (error.params as { missingProperty?: string }).missingProperty : undefined);
  const params = error.params as Record<string, unknown>;
  if (error.keyword === 'enum') return enumMessage(error, value, path);
  if (error.keyword === 'type') {
    const typeLabels: Record<string, string> = { string: 'texto', integer: 'número inteiro', number: 'número', boolean: 'sim ou não', object: 'objeto', array: 'lista', null: 'vazio' };
    const expectedTypes = Array.isArray(params.type) ? params.type.map(String) : [String(params.type ?? 'valor válido')];
    const expected = expectedTypes.map((type) => typeLabels[type] ?? type).join(' ou ');
    const actual = valueAtPath(value, fullPath);
    const actualType = actual === null ? 'null' : Array.isArray(actual) ? 'array' : typeof actual;
    const received = actual === undefined ? 'nenhum valor' : actual === null ? 'vazio' : typeLabels[actualType] ?? actualType;
    return `${path}: esperado ${expected}; foi recebido ${received}. Corrija o valor deste campo.`;
  }
  if (error.keyword === 'required') return `${path}: este campo é obrigatório. Preencha-o para continuar.`;
  if (error.keyword === 'additionalProperties') return `${path}: este campo não é reconhecido neste formato. Remova-o ou confira o nome da propriedade.`;
  if (error.keyword === 'const') return `${path}: este campo deve conter o valor “${String(params.allowedValue)}”.`;
  if (error.keyword === 'anyOf' || error.keyword === 'oneOf') return `${path}: o valor não corresponde a nenhum formato aceito. Confira o tipo e a estrutura deste campo.`;
  if (error.keyword === 'minLength') return `${path}: o texto está vazio ou curto demais; informe pelo menos ${String(params.limit)} caractere(s).`;
  if (error.keyword === 'maxLength') return `${path}: o texto é longo demais; use no máximo ${String(params.limit)} caracteres.`;
  if (error.keyword === 'minimum' || error.keyword === 'exclusiveMinimum') return `${path}: o valor precisa ser maior${error.keyword === 'exclusiveMinimum' ? '' : ' ou igual'} a ${String(params.limit)}.`;
  if (error.keyword === 'maximum' || error.keyword === 'exclusiveMaximum') return `${path}: o valor precisa ser menor${error.keyword === 'exclusiveMaximum' ? '' : ' ou igual'} a ${String(params.limit)}.`;
  if (error.keyword === 'minItems') return `${path}: adicione pelo menos ${String(params.limit)} item(ns).`;
  if (error.keyword === 'maxItems') return `${path}: a lista aceita no máximo ${String(params.limit)} item(ns).`;
  if (error.keyword === 'uniqueItems') return `${path}: há itens repetidos; remova as duplicatas.`;
  if (error.keyword === 'pattern') return `${path}: o formato do valor não é válido. Confira o padrão esperado para este campo.`;
  return `${path}: não foi possível validar este valor. Confira o conteúdo e o formato do campo.`;
}

export function formatValidationErrors(errors: ErrorObject[] | null | undefined, value: unknown, prefix = ''): string[] {
  return (errors ?? []).map((error) => formatValidationError(error, value, prefix)).filter((message): message is string => message !== null);
}
