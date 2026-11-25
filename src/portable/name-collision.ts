export function normalizeImportedName(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR'); }

function truncateGraphemes(value: string, max: number): string { return [...value].slice(0, Math.max(0, max)).join('').trimEnd(); }

export function resolveImportedName(original: string, reserved: Iterable<string>, suffixWord = 'Importado', maxLength = 120): string {
  const used = new Set([...reserved].map(normalizeImportedName));
  const candidate = (index: number) => {
    const suffix = index === 0 ? '' : index === 1 ? ` - ${suffixWord}` : ` - ${suffixWord} (${index})`;
    return `${truncateGraphemes(original, maxLength - [...suffix].length)}${suffix}`.trim();
  };
  for (let index = 0; index < 100_000; index += 1) {
    const value = candidate(index);
    if (!used.has(normalizeImportedName(value))) return value;
  }
  throw new Error('NAME_RESOLUTION_FAILED');
}
