import { describe, expect, it } from 'vitest';
import add2eFixture from '../../fixtures/add2e/valid-monster.json';
import shadowlordsFixture from '../../fixtures/shadowlords3e/valid-monster.json';
import {
  validateAdd2eMonster,
  validateMonster,
  validateShadowlordsMonster,
} from '../../src/domain/validation';

const clone = <T>(value: T): T => structuredClone(value);

describe('contrato de monstro AD&D 2ª Edição', () => {
  it('aceita a fixture válida e mantém estatísticas como expressões textuais', () => {
    expect(validateAdd2eMonster(add2eFixture)).toEqual({ valid: true, issues: [] });
    expect(add2eFixture.profiles[0].statistics.hitDice).toBe('2+1');
  });

  it('rejeita propriedades desconhecidas para não descartar dados silenciosamente', () => {
    const monster = { ...clone(add2eFixture), extraData: true };
    const result = validateAdd2eMonster(monster);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.includes('propriedade não reconhecida'))).toBe(true);
  });

  it('exige exatamente um perfil marcado como principal', () => {
    const monster = clone(add2eFixture);
    monster.profiles[0].isPrimary = false;
    expect(validateAdd2eMonster(monster).issues).toContain(
      '/profiles: deve haver exatamente um perfil marcado como principal.',
    );
  });
});

describe('contrato de monstro Shadowlords', () => {
  it('aceita a fixture válida', () => {
    expect(validateShadowlordsMonster(shadowlordsFixture)).toEqual({ valid: true, issues: [] });
  });

  it('rejeita atributos fora do intervalo permitido', () => {
    const monster = clone(shadowlordsFixture);
    monster.profiles[0].statistics.attributes.for = 4;
    expect(validateShadowlordsMonster(monster).valid).toBe(false);
  });

  it('exige ataque no perfil principal', () => {
    const monster = clone(shadowlordsFixture);
    monster.profiles[0].statistics.attacks = [];
    expect(validateShadowlordsMonster(monster).issues).toContain(
      '/profiles/0/statistics/attacks: o perfil principal precisa ter ao menos um ataque.',
    );
  });

  it('exige os campos de Defesa Ativa quando ela está habilitada', () => {
    const monster = clone(shadowlordsFixture);
    monster.profiles[0].statistics.activeDefense = {
      enabled: true,
      formula: null,
      cost: null,
      restrictions: null,
      notes: null,
    };
    expect(validateShadowlordsMonster(monster).valid).toBe(false);
  });

  it('exige explicação ao usar o tipo de RD "outro"', () => {
    const monster = clone(shadowlordsFixture);
    (monster.profiles[0].statistics as unknown as { damageReductions: unknown }).damageReductions = [
      {
        id: 'ef1c5893-ffdd-47ca-8d87-caf6d37bf10f',
        source: 'Proteção especial',
        value: 2,
        damageTypes: ['other'],
        usesMode: 'unlimited',
        uses: null,
        notes: null,
        sortOrder: 0,
      },
    ];
    expect(validateShadowlordsMonster(monster).valid).toBe(false);
  });

  it('confere a Defesa Final contra a soma dos componentes', () => {
    const monster = clone(shadowlordsFixture);
    monster.profiles[0].statistics.defense.final = 12;
    expect(validateShadowlordsMonster(monster).issues).toContain(
      '/profiles/0/statistics/defense/final: deve corresponder à soma dos componentes (11).',
    );
  });

  it('rejeita módulo dracônico incompleto', () => {
    const monster = clone(shadowlordsFixture);
    monster.dragonModuleEnabled = true;
    expect(validateShadowlordsMonster(monster).issues).toContain(
      '/profiles: o módulo dracônico exige exatamente um perfil com dados para cada idade: Filhote, Jovem, Adulto, Antigo e Ancião.',
    );
  });

  it('aceita o conjunto fechado das cinco idades dracônicas', () => {
    const monster = clone(shadowlordsFixture);
    const baseProfile = monster.profiles[0];
    const categories = ['hatchling', 'young', 'adult', 'old', 'ancient'] as const;
    monster.dragonModuleEnabled = true;
    monster.profiles = categories.map((ageCategory, index) => {
      const profile = clone(baseProfile);
      profile.id = `4930b572-acb8-4552-bb85-a88d4e26d0a${index + 1}`;
      profile.kind = 'age';
      profile.label = ageCategory;
      profile.isPrimary = index === 2;
      profile.sortOrder = index;
      (profile.statistics as unknown as { dragon: unknown }).dragon = {
        ageCategory,
        breath: {
          name: 'Sopro elemental',
          shape: 'line',
          element: 'Eletricidade',
          damage: '4d6+2',
          area: 'Linha de 30 m',
          saveAttribute: 'AGI',
          difficulty: 14,
          successEffect: 'Metade do dano',
          activeDefenseAllowed: false,
          frequency: 'Uma vez a cada três rodadas',
          actionRestrictions: 'Substitui as demais ações ofensivas.'
        },
        maxPhysicalAttacksPerRound: 2,
        maxBitesPerRound: 1,
        airbornePhysicalAttackLimit: 1,
        notes: null,
      };
      return profile;
    });

    expect(validateShadowlordsMonster(monster)).toEqual({ valid: true, issues: [] });
  });

  it('valida pelo discriminador do sistema', () => {
    expect(validateMonster(add2eFixture).valid).toBe(true);
    expect(validateMonster(shadowlordsFixture).valid).toBe(true);
    expect(validateMonster({ systemCode: 'unknown' })).toEqual({
      valid: false,
      issues: ['/systemCode: sistema não reconhecido.'],
    });
  });
});
