import type { MonsterSystemCode } from './monster-systems';

export type TreasureCode = 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L'|'M'|'N'|'O'|'P'|'Q'|'R'|'S'|'T'|'U'|'V'|'W'|'X'|'Y'|'Z';
export type TreasureScope = 'lair' | 'individual';

export type TreasurePresence =
  | { kind: 'always' }
  | { kind: 'percent'; value: number }
  | { kind: 'roll-under'; dice: '3d6'; target: number };

export interface TreasureComponent {
  amount: string;
  presence: TreasurePresence;
}

export interface TreasureEntry {
  code: TreasureCode;
  scope: TreasureScope;
  components: Record<string, TreasureComponent | undefined>;
}

export interface TreasureCatalog {
  systemCode: MonsterSystemCode;
  title: string;
  scopeLabels: Record<TreasureScope, string>;
  columns: Record<TreasureScope, readonly { key: string; label: string }[]>;
  entries: Record<TreasureCode, TreasureEntry>;
}

const always = (amount: string): TreasureComponent => ({ amount, presence: { kind: 'always' } });
const percent = (amount: string, value: number): TreasureComponent => ({ amount, presence: { kind: 'percent', value } });
const roll = (amount: string, target: number): TreasureComponent => ({ amount, presence: { kind: 'roll-under', dice: '3d6', target } });

const add2eColumns = [
  { key: 'copper', label: 'Cobre' }, { key: 'silver', label: 'Prata' }, { key: 'gold', label: 'Ouro' },
  { key: 'platinumElectrum', label: 'Platina ou Electrum' }, { key: 'gems', label: 'Gemas' },
  { key: 'art', label: 'Objetos de arte' }, { key: 'magic', label: 'Item mágico' },
] as const;

const add2eEntries = {
  A: { scope: 'lair', components: { copper: percent('1.000–3.000', 25), silver: percent('200–2.000', 30), gold: percent('1.000–6.000', 40), platinumElectrum: percent('300–1.800', 35), gems: percent('10–40', 60), art: percent('2–12', 50), magic: percent('Quaisquer 3', 30) } },
  B: { scope: 'lair', components: { copper: percent('1.000–6.000', 50), silver: percent('1.000–3.000', 25), gold: percent('200–2.000', 25), platinumElectrum: percent('100–1.000', 25), gems: percent('1–8', 30), art: percent('1–4', 20), magic: percent('Arma ou Armadura', 10) } },
  C: { scope: 'lair', components: { copper: percent('1.000–10.000', 20), silver: percent('1.000–6.000', 30), platinumElectrum: percent('100–600', 10), gems: percent('1–6', 25), art: percent('1–3', 20), magic: percent('Quaisquer 2', 10) } },
  D: { scope: 'lair', components: { copper: percent('1.000–6.000', 10), silver: percent('1.000–10.000', 15), gold: percent('1.000–3.000', 50), platinumElectrum: percent('100–600', 15), gems: percent('1–10', 30), art: percent('1–6', 25), magic: percent('Quaisquer 2 + 1 poção', 15) } },
  E: { scope: 'lair', components: { copper: percent('1.000–6.000', 5), silver: percent('1.000–10.000', 25), gold: percent('1.000–4.000', 25), platinumElectrum: percent('300–1.800', 25), gems: percent('1–12', 15), art: percent('1–6', 10), magic: percent('Quaisquer 3 + 1 pergaminho', 25) } },
  F: { scope: 'lair', components: { silver: percent('3.000–18.000', 10), gold: percent('1.000–6.000', 40), platinumElectrum: percent('1.000–4.000', 15), gems: percent('2–20', 20), art: percent('1–8', 10), magic: percent('Quaisquer 5 exceto armas', 30) } },
  G: { scope: 'lair', components: { gold: percent('2.000–20.000', 50), platinumElectrum: percent('1.000–10.000', 50), gems: percent('3–18', 30), art: percent('1–6', 25), magic: percent('Quaisquer 5', 35) } },
  H: { scope: 'lair', components: { copper: percent('3.000–18.000', 25), silver: percent('2.000–20.000', 40), gold: percent('2.000–20.000', 55), platinumElectrum: percent('1.000–8.000', 40), gems: percent('3–30', 50), art: percent('2–20', 50), magic: percent('Quaisquer 6', 15) } },
  I: { scope: 'lair', components: { platinumElectrum: percent('100–600', 30), gems: percent('2–12', 55), art: percent('2–8', 50), magic: percent('Qualquer 1', 15) } },
  J: { scope: 'individual', components: { copper: always('3–24') } },
  K: { scope: 'individual', components: { silver: always('3–18') } },
  L: { scope: 'individual', components: { platinumElectrum: always('2–12') } },
  M: { scope: 'individual', components: { gold: always('2–8') } },
  N: { scope: 'individual', components: { platinumElectrum: always('1–6') } },
  O: { scope: 'individual', components: { copper: always('10–40'), silver: always('10–30') } },
  P: { scope: 'individual', components: { silver: always('10–60'), platinumElectrum: always('1–20') } },
  Q: { scope: 'individual', components: { gems: always('1–4') } },
  R: { scope: 'individual', components: { gold: always('2–20'), platinumElectrum: always('10–60'), gems: always('2–8'), art: always('1–3') } },
  S: { scope: 'individual', components: { magic: always('1–8 poções') } },
  T: { scope: 'individual', components: { magic: always('1–4 pergaminhos') } },
  U: { scope: 'individual', components: { gems: percent('2–16', 90), art: percent('1–6', 80), magic: percent('Qualquer 1', 70) } },
  V: { scope: 'individual', components: { magic: always('Quaisquer 2') } },
  W: { scope: 'individual', components: { gold: always('5–30'), platinumElectrum: always('1–8'), gems: percent('2–16', 60), art: percent('1–8', 50), magic: percent('Quaisquer 2', 60) } },
  X: { scope: 'individual', components: { magic: always('Quaisquer 2 poções') } },
  Y: { scope: 'individual', components: { gold: always('200–1.100') } },
  Z: { scope: 'individual', components: { copper: always('100–300'), silver: always('100'), gold: always('100–600'), platinumElectrum: always('100–400'), gems: percent('1–6', 55), art: percent('2–12', 50), magic: percent('Quaisquer 3', 50) } },
} satisfies Record<TreasureCode, Omit<TreasureEntry, 'code'>>;

const shadowlordsLairColumns = [
  { key: 'copper', label: 'Cobre (PC)' }, { key: 'silver', label: 'Prata (PP)' }, { key: 'gold', label: 'Ouro (PO)' },
  { key: 'gems', label: 'Gemas' }, { key: 'art', label: 'Objetos de arte' }, { key: 'magicSet', label: 'Magia / conjunto' },
] as const;
const shadowlordsIndividualColumns = [
  { key: 'copper', label: 'Cobre (PC)' }, { key: 'silver', label: 'Prata (PP)' }, { key: 'gold', label: 'Ouro (PO)' },
  { key: 'gems', label: 'Gemas' }, { key: 'art', label: 'Objetos de arte' }, { key: 'potions', label: 'Poções' },
  { key: 'scrolls', label: 'Pergaminhos' }, { key: 'otherMagic', label: 'Outros itens mágicos' },
] as const;

const shadowlordsEntries = {
  A: { scope: 'lair', components: { copper: roll('250–750', 8), silver: roll('50–500', 8), gold: roll('250–1.500', 9), gems: roll('3–10', 11), art: roll('1–3', 10), magicSet: roll('1–2 itens gerais', 8) } },
  B: { scope: 'lair', components: { copper: roll('250–1.500', 10), silver: roll('250–750', 8), gold: roll('50–500', 8), gems: roll('1–2', 8), art: roll('1', 7), magicSet: roll('1 arma ou armadura encantada', 6) } },
  C: { scope: 'lair', components: { copper: roll('250–2.500', 7), silver: roll('250–1.500', 8), gems: roll('1–2', 8), art: roll('1', 7), magicSet: roll('1 item geral', 6) } },
  D: { scope: 'lair', components: { copper: roll('250–1.500', 6), silver: roll('250–2.500', 7), gold: roll('250–750', 10), gems: roll('1–3', 8), art: roll('1–2', 8), magicSet: roll('1 item geral + 1 poção', 7) } },
  E: { scope: 'lair', components: { copper: roll('250–1.500', 5), silver: roll('250–2.500', 8), gold: roll('250–1.000', 8), gems: roll('1–3', 7), art: roll('1–2', 6), magicSet: roll('1 item geral + 1 pergaminho', 8) } },
  F: { scope: 'lair', components: { silver: roll('750–4.500', 6), gold: roll('250–1.500', 9), gems: roll('1–5', 7), art: roll('1–2', 6), magicSet: roll('1–2 itens sem armas', 8) } },
  G: { scope: 'lair', components: { gold: roll('250–2.500', 10), gems: roll('1–5', 8), art: roll('1–2', 8), magicSet: roll('1–2 itens gerais', 9) } },
  H: { scope: 'lair', components: { copper: roll('750–4.500', 8), silver: roll('500–5.000', 9), gold: roll('500–5.000', 10), gems: roll('1–8', 10), art: roll('1–5', 10), magicSet: roll('1–3 itens gerais', 7) } },
  I: { scope: 'lair', components: { gold: roll('15–90', 8), gems: roll('1–3', 10), art: roll('1–2', 10), magicSet: roll('1 item geral', 7) } },
  J: { scope: 'individual', components: { copper: always('1–6') } },
  K: { scope: 'individual', components: { silver: always('1–5') } },
  L: { scope: 'individual', components: { silver: always('1–3') } },
  M: { scope: 'individual', components: { gold: always('1–2') } },
  N: { scope: 'individual', components: { gold: always('1–3') } },
  O: { scope: 'individual', components: { copper: always('3–10'), silver: always('3–8') } },
  P: { scope: 'individual', components: { silver: always('3–20') } },
  Q: { scope: 'individual', components: { gems: always('1–2') } },
  R: { scope: 'individual', components: { gold: always('1–5'), gems: always('1–2'), art: always('1') } },
  S: { scope: 'individual', components: { potions: always('1–2') } },
  T: { scope: 'individual', components: { scrolls: always('1–2') } },
  U: { scope: 'individual', components: { gems: roll('1–4', 14), art: roll('1–2', 13), otherMagic: roll('1 item geral', 12) } },
  V: { scope: 'individual', components: { otherMagic: always('1 item geral') } },
  W: { scope: 'individual', components: { gold: always('2–8'), gems: roll('1–4', 11), art: roll('1–2', 10), otherMagic: roll('1 item geral', 11) } },
  X: { scope: 'individual', components: { potions: always('1') } },
  Y: { scope: 'individual', components: { gold: always('50–275') } },
  Z: { scope: 'individual', components: { copper: always('25–75'), silver: always('100'), gold: always('25–150'), gems: roll('1–2', 10), art: roll('1–3', 10), otherMagic: roll('1 item geral', 10) } },
} satisfies Record<TreasureCode, Omit<TreasureEntry, 'code'>>;

function withCodes(entries: Record<TreasureCode, Omit<TreasureEntry, 'code'>>): Record<TreasureCode, TreasureEntry> {
  return Object.fromEntries(Object.entries(entries).map(([code, entry]) => [code, { code, ...entry }])) as Record<TreasureCode, TreasureEntry>;
}

export const treasureCatalogs: Record<MonsterSystemCode, TreasureCatalog> = {
  add2e: {
    systemCode: 'add2e', title: 'Tabela 84 — Tipos de Tesouros',
    scopeLabels: { lair: 'Tesouro de covil', individual: 'Tesouro individual ou de pequeno covil' },
    columns: { lair: add2eColumns, individual: add2eColumns }, entries: withCodes(add2eEntries),
  },
  shadowlords3e: {
    systemCode: 'shadowlords3e', title: 'Tabela de Tesouros Shadowlords',
    scopeLabels: { lair: 'Tesouro de covil', individual: 'Tesouro individual ou reserva limitada' },
    columns: { lair: shadowlordsLairColumns, individual: shadowlordsIndividualColumns }, entries: withCodes(shadowlordsEntries),
  },
};

export function formatTreasurePresence(presence: TreasurePresence): string {
  if (presence.kind === 'always') return 'Sempre';
  if (presence.kind === 'percent') return `${presence.value}%`;
  return `${presence.dice} ≤ ${presence.target}`;
}
