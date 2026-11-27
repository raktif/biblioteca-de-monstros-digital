import type { TreasureCode } from './treasure-catalogs';

export type TreasureReferenceSegment =
  | { kind: 'text'; value: string }
  | { kind: 'reference'; value: string; code: TreasureCode; multiplier: number | null };

const referencePattern = /(?<![\p{L}\p{N}])([A-Z])(?:\s*(?:x|×)\s*(\d+))?(?![\p{L}\p{N}])/gu;

export function parseTreasureReferences(value: string): TreasureReferenceSegment[] {
  const segments: TreasureReferenceSegment[] = [];
  let cursor = 0;
  for (const match of value.matchAll(new RegExp(referencePattern.source, 'gu'))) {
    const index = match.index;
    if (index > cursor) segments.push({ kind: 'text', value: value.slice(cursor, index) });
    const multiplier = match[2] ? Number(match[2]) : null;
    segments.push({ kind: 'reference', value: match[0], code: match[1] as TreasureCode, multiplier });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) segments.push({ kind: 'text', value: value.slice(cursor) });
  return segments.length ? segments : [{ kind: 'text', value }];
}
