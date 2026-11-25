export type MonsterSystemCode = 'add2e' | 'shadowlords3e';

export function supportsMonsterEditor(systemCode: MonsterSystemCode): boolean {
  return systemCode === 'add2e' || systemCode === 'shadowlords3e';
}
