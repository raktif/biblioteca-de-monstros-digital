import { useEffect, useState, type FormEvent } from 'react';
import type { Attack, DamageReduction, Dragon, Profile, ShadowlordsMonster, Skill, Spell, Trait } from '../generated/shadowlords3e-monster';
import fixture from '../../fixtures/shadowlords3e/valid-monster.json';
import { validateShadowlordsMonster } from '../domain/validation';
import { LimitedMarkdown } from './LimitedMarkdown';
import { activityOptions, breathShapeOptions, climateOptions, damageTypeOptions, dietOptions, frequencyOptions, moraleOptions, organizationOptions, saveAttributeOptions, sizeOptions, spellModeOptions, terrainOptions, traitCategoryOptions } from '../domain/shadowlords-vocabularies';

type Props = {
  libraryId: string; initial?: ShadowlordsMonster; initialImage?: string | null;
  saving: boolean; serverError: string; onCancel: () => void;
  onSave: (document: ShadowlordsMonster, imageDataUrl: string | null, removeImage: boolean) => Promise<void>;
};

const ages = ['hatchling', 'young', 'adult', 'old', 'ancient'] as const;
const ageNames = ['Filhote', 'Jovem', 'Adulto', 'Antigo', 'Ancião'];
const id = () => crypto.randomUUID();
const kinds: [Profile['kind'], string][] = [['primary','Principal'],['variant','Variante'],['leader','Líder'],['chief','Chefe'],['shaman','Xamã'],['form','Forma'],['caste','Casta'],['age','Categoria etária'],['other','Outro']];
const blankAttack = (sortOrder: number): Attack => ({ id: id(), name: '', attackFormula: '', attackNotes: null, damageFormula: '', damageType: 'physical', range: '', usageInterval: '', notes: null, sortOrder });
const blankRd = (sortOrder: number): DamageReduction => ({ id: id(), source: '', value: 1, damageTypes: ['physical'], usesMode: 'unlimited', uses: null, notes: null, sortOrder });
const blankSkill = (sortOrder: number): Skill => ({ id: id(), name: '', modifier: 1, notes: null, sortOrder });
const blankTrait = (sortOrder: number): Trait => ({ id: id(), name: '', category: 'special', summary: '', details: null, uses: null, recharge: null, sortOrder });
const blankSpell = (sortOrder: number): Spell => ({ id: id(), name: '', mode: 'spell', castingSkill: null, pvCost: null, uses: null, recharge: null, notes: '', sortOrder });
const fieldNames: Record<string, string> = {
  name: 'Nome', label: 'Variante do monstro', kind: 'Tipo', climates: 'Climas', terrains: 'Terrenos',
  frequency: 'Frequência', organization: 'Organização', activityPeriods: 'Período de atividade', diet: 'Dieta',
  quantityEncounter: 'Quantidade por encontro', size: 'Tamanho', morale: 'Moral', treasure: 'Tesouro',
  hitPoints: 'Pontos de Vida', natural: 'Defesa Natural', shieldBonus: 'Escudo', source: 'Fonte', value: 'Valor',
  uses: 'Quantidade de usos', attacks: 'Ataques', attack: 'Ataque', attackFormula: 'Fórmula de ataque',
  damageFormula: 'Fórmula de dano', damageType: 'Tipo de dano', damageTypes: 'Tipos de dano', range: 'Área de alcance em metros',
  usageInterval: 'Intervalo de uso', modifier: 'Modificador', category: 'Categoria', mode: 'Tipo', pvCost: 'Custo em PV', other: 'Complemento',
  description: 'Descrição', combat: 'Combate', habitatSociety: 'Habitat e sociedade', ecology: 'Ecologia',
  element: 'Elemento', damage: 'Dano', area: 'Área', formula: 'Fórmula', cost: 'Custo', restrictions: 'Restrições',
  shape: 'Forma', saveAttribute: 'Atributo para resistência', difficulty: 'Dificuldade',
};

function explainIssue(issue: string): string {
  const separator = issue.indexOf(':');
  if (separator < 0) return issue.includes('perfil principal') ? 'O monstro precisa ter um perfil principal.' : 'Revise este dado do monstro.';
  const path = issue.slice(0, separator);
  const cause = issue.slice(separator + 1).trim();
  const key = path.split('/').at(-1) ?? '';
  const label = fieldNames[key] ?? 'Este campo';
  if (cause.includes('texto abaixo') || cause.includes('obrigatório ausente')) return `${label}: preencha este campo.`;
  if (cause.includes('valor abaixo') || cause.includes('valor acima')) return `${label}: escolha um valor dentro do intervalo permitido.`;
  if (cause.includes('fora do vocabulário')) return `${label}: selecione uma das opções disponíveis.`;
  if (cause.includes('texto acima')) return `${label}: reduza o texto para respeitar o limite de caracteres.`;
  if (cause.includes('itens abaixo')) return `${label}: selecione ao menos uma opção.`;
  if (cause.includes('tipo de valor')) return `${label}: informe um valor válido.`;
  return `${label}: revise o valor informado.`;
}

function blankProfile(): Profile {
  const profile = structuredClone((fixture as unknown as ShadowlordsMonster).profiles[0]);
  Object.assign(profile, { id: id(), label: '', kind: 'primary', isPrimary: true, sortOrder: 0,
    climates: [{ code: 'any', other: null }], terrains: [{ code: 'any', other: null }], climateTerrainNotes: null,
    frequency: { code: 'uncommon', other: null }, organization: 'group', activityPeriods: [{ code: 'any', other: null }],
    activityNotes: null, diet: 'none', quantityEncounter: '', size: 'medium', morale: 0, treasure: '',
    specialDefensesSummary: '', magicProtectionSummary: '', profileNotes: null });
  Object.assign(profile.statistics, { attributes: { for: 0, agi: 0, sau: 0, int: 0, sab: 0, per: 0 }, hitPoints: 1,
    defense: { natural: 10, armorBonus: 0, shieldBonus: 0, magicBonus: 0, otherBonus: 0, otherDescription: null, final: 10 },
    damageReductions: [], attacks: [blankAttack(0)], activeDefense: { enabled: false, formula: null, cost: null, restrictions: null, notes: null },
    skills: [], movement: '', traits: [], spells: [], specialsSummary: '', dragon: null });
  return profile;
}

function blankMonster(libraryId: string): ShadowlordsMonster {
  const template = structuredClone(fixture) as unknown as ShadowlordsMonster;
  const now = new Date().toISOString();
  return { ...template, id: id(), libraryId, name: '', descriptors: [], dragonModuleEnabled: false, image: null,
    narratives: { description: '', combat: '', habitatSociety: '', ecology: '', tactics: null, variations: null, additionalNotes: null },
    profiles: [blankProfile()], sources: [], contentHash: '0'.repeat(64), createdAt: now, updatedAt: now, rowVersion: 1 };
}

function dragonProfiles(base: Profile): Profile[] {
  return ages.map((ageCategory, sortOrder) => {
    const profile = structuredClone(base);
    profile.id = id(); profile.label = ageNames[sortOrder]; profile.kind = 'age'; profile.isPrimary = ageCategory === 'adult'; profile.sortOrder = sortOrder;
    profile.statistics.dragon = { ageCategory, breath: { name: 'Sopro', shape: 'line', element: '', damage: '', area: '', saveAttribute: 'FOR', difficulty: 13, successEffect: '', activeDefenseAllowed: false, frequency: '', actionRestrictions: '' }, maxPhysicalAttacksPerRound: 0, maxBitesPerRound: 0, airbornePhysicalAttackLimit: 0, notes: null };
    return profile;
  });
}

function enableDragonProfiles(profiles: Profile[]): Profile[] {
  const primary = profiles.find((p) => p.isPrimary) ?? profiles[0];
  const existing = new Map(profiles.filter((p) => p.statistics.dragon).map((p) => [p.statistics.dragon!.ageCategory, p]));
  const generated = dragonProfiles(primary);
  const agesWithData = ages.map((ageCategory, index) => existing.get(ageCategory) ?? generated[index]);
  const otherProfiles = profiles.filter((p) => p.kind !== 'age' && p.id !== primary.id).map((p) => ({ ...p, isPrimary: false }));
  return [...agesWithData, ...otherProfiles].map((p, sortOrder) => ({
    ...p,
    kind: agesWithData.some((age) => age.id === p.id) ? 'age' : p.kind,
    isPrimary: p.statistics.dragon?.ageCategory === 'adult',
    sortOrder,
  }));
}

export function ShadowlordsMonsterForm({ libraryId, initial, initialImage, saving, serverError, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState(() => initial ? structuredClone(initial) : blankMonster(libraryId));
  const [profileId, setProfileId] = useState(() => initial?.profiles.find((p) => p.isPrimary)?.id ?? initial?.profiles[0]?.id ?? '');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [imageError, setImageError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [primaryLabelEdited, setPrimaryLabelEdited] = useState(() => !!initial && (initial.profiles.find((p) => p.isPrimary)?.label ?? '') !== initial.name);
  const profile = draft.profiles.find((p) => p.id === profileId) ?? draft.profiles[0];
  const profileIndex = draft.profiles.findIndex((p) => p.id === profile.id);
  const stats = profile.statistics;
  const shownImage = imageDataUrl ?? (removeImage ? null : initialImage ?? null);

  const changeMonster = (fn: (value: ShadowlordsMonster) => ShadowlordsMonster) => setDraft((old) => fn(old));
  const changeProfile = (fn: (value: Profile) => Profile) => changeMonster((old) => ({ ...old, profiles: old.profiles.map((p) => p.id === profile.id ? fn(p) : p) }));
  const changeStats = (fn: (value: Profile['statistics']) => Profile['statistics']) => changeProfile((p) => ({ ...p, statistics: fn(p.statistics) }));
  const updateAttack = (attackId: string, changes: Partial<Attack>) => changeStats((s) => ({ ...s, attacks: s.attacks.map((x) => x.id === attackId ? { ...x, ...changes } : x) }));
  const updateRd = (rdId: string, changes: Partial<DamageReduction>) => changeStats((s) => ({ ...s, damageReductions: s.damageReductions.map((x) => x.id === rdId ? { ...x, ...changes } : x) }));
  const updateSkill = (skillId: string, changes: Partial<Skill>) => changeStats((s) => ({ ...s, skills: s.skills.map((x) => x.id === skillId ? { ...x, ...changes } : x) }));
  const updateTrait = (traitId: string, changes: Partial<Trait>) => changeStats((s) => ({ ...s, traits: s.traits.map((x) => x.id === traitId ? { ...x, ...changes } : x) }));
  const updateSpell = (spellId: string, changes: Partial<Spell>) => changeStats((s) => ({ ...s, spells: s.spells.map((x) => x.id === spellId ? { ...x, ...changes } : x) }));
  const updateDragon = (changes: Partial<Dragon>) => changeStats((s) => s.dragon ? ({ ...s, dragon: { ...s.dragon, ...changes } }) : s);
  const updateBreath = (changes: Partial<Dragon['breath']>) => changeStats((s) => s.dragon ? ({ ...s, dragon: { ...s.dragon, breath: { ...s.dragon.breath, ...changes } } }) : s);
  const updateSource = (sourceId: string, changes: Partial<ShadowlordsMonster['sources'][number]>) => changeMonster((old) => ({ ...old, sources: old.sources.map((x) => x.id === sourceId ? { ...x, ...changes } : x) }));
  const setAttribute = (key: keyof Profile['statistics']['attributes'], value: number) => changeStats((s) => ({ ...s, attributes: { ...s.attributes, [key]: value } }));
  const setDefense = (key: 'natural'|'armorBonus'|'shieldBonus'|'magicBonus'|'otherBonus', value: number) => changeStats((s) => ({ ...s, defense: { ...s.defense, [key]: value, final: s.defense.final + value - s.defense[key] } }));

  function addProfile() {
    const copy = structuredClone(profile); copy.id = id(); copy.label = `${profile.label} (cópia)`; copy.kind = 'variant'; copy.isPrimary = false; copy.sortOrder = draft.profiles.length;
    if (copy.statistics.dragon) copy.statistics.dragon = null;
    changeMonster((old) => ({ ...old, profiles: [...old.profiles, copy] })); setProfileId(copy.id);
  }
  function makePrimary() { changeMonster((old) => ({ ...old, profiles: old.profiles.map((p) => ({ ...p, isPrimary: p.id === profile.id })) })); }
  function moveProfile(delta: number) {
    const to = profile.sortOrder + delta; if (to < 0 || to >= draft.profiles.length) return;
    const profiles = [...draft.profiles]; [profiles[profile.sortOrder], profiles[to]] = [profiles[to], profiles[profile.sortOrder]];
    changeMonster((old) => ({ ...old, profiles: profiles.map((p, sortOrder) => ({ ...p, sortOrder })) }));
  }
  function removeProfile() {
    if (draft.profiles.length === 1) return;
    const profiles = draft.profiles.filter((p) => p.id !== profile.id).map((p, sortOrder) => ({ ...p, sortOrder }));
    if (!profiles.some((p) => p.isPrimary)) profiles[0].isPrimary = true;
    changeMonster((old) => ({ ...old, profiles })); setProfileId((profiles.find((p) => p.isPrimary) ?? profiles[0]).id);
  }
  function toggleDragon(enabled: boolean) {
    changeMonster((old) => ({ ...old, dragonModuleEnabled: enabled, profiles: enabled ? enableDragonProfiles(old.profiles) : old.profiles.map((p) => ({ ...p, kind: p.kind === 'age' ? 'variant' : p.kind, statistics: { ...p.statistics, dragon: null }, isPrimary: p.isPrimary || (p.kind === 'age' && p.statistics.dragon?.ageCategory === 'adult') })) }));
    setProfileId('');
  }
  async function loadImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setImageError('Selecione uma imagem JPEG, PNG ou WebP.'); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError('A imagem deve ter no máximo 10 MiB.'); return; }
    const reader = new FileReader(); reader.onload = () => { setImageDataUrl(String(reader.result)); setRemoveImage(false); setImageError(''); };
    reader.onerror = () => setImageError('Não foi possível ler a imagem.'); reader.readAsDataURL(file);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setHasSubmitted(true);
    const document: ShadowlordsMonster = { ...draft, name: draft.name.trim(), profiles: draft.profiles.map((p, sortOrder) => ({ ...p, label: p.label.trim(), sortOrder, statistics: { ...p.statistics, defense: { ...p.statistics.defense, final: p.statistics.defense.natural + p.statistics.defense.armorBonus + p.statistics.defense.shieldBonus + p.statistics.defense.magicBonus + p.statistics.defense.otherBonus } } })) };
    const result = validateShadowlordsMonster(document); setIssues(result.issues);
    if (!result.valid) { globalThis.document.getElementById('shadowlords-errors')?.focus(); return; }
    await onSave(document, imageDataUrl, removeImage);
  }

  const errorFor = (path: string) => { const issue = issues.find((item) => item.startsWith(`${path}:`)); return issue ? explainIssue(issue).replace(/^[^:]+:\s*/, '') : ''; };
  const fieldClass = (path?: string) => `monster-field${path && errorFor(path) ? ' invalid-field' : ''}`;
  const text = (label: string, value: string, onChange: (value: string) => void, maxLength = 240, path?: string) => <label className={fieldClass(path)}>{label}<input className={path && errorFor(path) ? 'invalid' : ''} aria-invalid={!!(path && errorFor(path))} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} />{path && errorFor(path) && <small className="field-error">{errorFor(path)}</small>}</label>;
  const area = (label: string, value: string | null, onChange: (value: string | null) => void, markdown = false, path?: string) => <label className={`${fieldClass(path)} full-field`}>{label}<textarea className={path && errorFor(path) ? 'invalid' : ''} aria-invalid={!!(path && errorFor(path))} rows={4} maxLength={50000} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />{path && errorFor(path) && <small className="field-error">{errorFor(path)}</small>}{markdown && value && <div className="markdown-preview"><span>Prévia</span><LimitedMarkdown source={value} /></div>}</label>;
  const number = (label: string, value: number, onChange: (value: number) => void, min = -10, max = 9999, path?: string) => <label className={fieldClass(path)}>{label}<input className={path && errorFor(path) ? 'invalid' : ''} aria-invalid={!!(path && errorFor(path))} type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />{path && errorFor(path) && <small className="field-error">{errorFor(path)}</small>}</label>;
  const select = <T extends string | number>(label: string, value: T, onChange: (value: T) => void, options: readonly (readonly [T, string])[], path?: string) => <label className={fieldClass(path)}>{label}<select className={path && errorFor(path) ? 'invalid' : ''} aria-invalid={!!(path && errorFor(path))} value={value} onChange={(e) => onChange((typeof value === 'number' ? Number(e.target.value) : e.target.value) as T)}>{options.map(([code, title]) => <option key={String(code)} value={code}>{title}</option>)}</select>{path && errorFor(path) && <small className="field-error">{errorFor(path)}</small>}</label>;
  const setProfileText = (key: 'quantityEncounter'|'treasure'|'specialDefensesSummary'|'magicProtectionSummary'|'climateTerrainNotes'|'activityNotes', value: string) => changeProfile((p) => ({ ...p, [key]: value || (key.endsWith('Notes') ? null : '') }));
  const setStatText = (key: 'movement'|'specialsSummary', value: string) => changeStats((s) => ({ ...s, [key]: value }));

  useEffect(() => {
    if (hasSubmitted) setIssues(validateShadowlordsMonster(draft).issues);
  }, [draft, hasSubmitted]);

  return <div className="monster-editor-overlay"><section className="monster-editor" role="dialog" aria-modal="true" aria-labelledby="shadowlords-title">
    <header className="monster-editor-header"><div><p className="kicker">SHADOWLORDS MINI SYSTEM 3E</p><h2 id="shadowlords-title">{initial ? 'Editar monstro' : 'Novo monstro'}</h2><p>A defesa final é calculada pelos seus componentes. Valores de ataque e dano permanecem como fórmulas.</p></div><button type="button" className="dialog-close" onClick={() => setConfirmClose(true)} aria-label="Fechar">×</button></header>
    {(issues.length > 0 || serverError) && <section id="shadowlords-errors" tabIndex={-1} className="monster-error-summary" role="alert"><strong>Revise os dados antes de salvar</strong>{serverError && <p>{serverError}</p>}{issues.length > 0 && <ul>{issues.slice(0, 12).map((issue) => <li key={issue}>{explainIssue(issue)}</li>)}</ul>}</section>}
    <form className="monster-form" onSubmit={(e) => void submit(e)}>
      <details open><summary>1. Identificação e imagem</summary><div className="form-grid">
        {text('Nome', draft.name, (value) => changeMonster((old) => ({ ...old, name: value, profiles: old.profiles.map((p) => p.isPrimary && !primaryLabelEdited ? { ...p, label: value } : p) })), 120, '/name')}
        {text('Descritores separados por vírgula', draft.descriptors.join(', '), (value) => changeMonster((old) => ({ ...old, descriptors: value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 6) })), 480)}
        <div className="monster-image-picker full-field"><div className="monster-image-preview">{shownImage ? <img src={shownImage} alt="Prévia do monstro" /> : <span aria-hidden="true">♧</span>}</div><div><strong>Imagem</strong><p>JPEG, PNG ou WebP · até 10 MiB</p><label className="upload-button">Escolher imagem<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void loadImage(e.target.files?.[0])} /></label>{initialImage && <button type="button" className="remove-image" onClick={() => { setRemoveImage(true); setImageDataUrl(null); }}>Remover imagem</button>}{imageError && <p className="form-error">{imageError}</p>}</div></div>
      </div></details>
      <details open><summary>2. Perfis e dados gerais</summary><div className="profile-toolbar"><div className="profile-tabs" role="tablist" aria-label="Perfis">{draft.profiles.map((p) => <button type="button" role="tab" aria-selected={p.id === profile.id} className={p.id === profile.id ? 'profile-tab selected' : 'profile-tab'} key={p.id} onClick={() => setProfileId(p.id)}>{p.label}{p.isPrimary ? ' ★' : ''}</button>)}</div><button type="button" className="secondary-button" onClick={addProfile}>Duplicar</button><button type="button" className="secondary-button" disabled={profile.isPrimary || draft.dragonModuleEnabled && !profile.statistics.dragon} onClick={makePrimary}>Definir principal</button><button type="button" className="secondary-button" disabled={draft.profiles.length <= 1 || draft.dragonModuleEnabled && !!profile.statistics.dragon} onClick={removeProfile}>Excluir perfil</button><button type="button" className="icon-button" onClick={() => moveProfile(-1)} aria-label="Mover perfil para cima">↑</button><button type="button" className="icon-button" onClick={() => moveProfile(1)} aria-label="Mover perfil para baixo">↓</button></div><div className="form-grid">
        {text('Variante do monstro', profile.label, (value) => { if (profile.isPrimary) setPrimaryLabelEdited(true); changeProfile((p) => ({ ...p, label: value })); }, 120, `/profiles/${profileIndex}/label`)}
        {select('Tipo', profile.kind, (value) => changeProfile((p) => ({ ...p, kind: value })), kinds, `/profiles/${profileIndex}/kind`)}
        <fieldset className={`choice-group${errorFor(`/profiles/${profileIndex}/climates`) ? ' invalid-field' : ''}`}><legend>Climas</legend><div className="choice-list">{climateOptions.map(([code, label]) => <label key={code}><input type="checkbox" checked={profile.climates.some((x) => x.code === code)} onChange={() => changeProfile((p) => ({ ...p, climates: p.climates.some((x) => x.code === code) ? p.climates.filter((x) => x.code !== code) : [...p.climates, { code, other: null }] }))} />{label}</label>)}</div>{errorFor(`/profiles/${profileIndex}/climates`) && <small className="field-error">{errorFor(`/profiles/${profileIndex}/climates`)}</small>}</fieldset>
        <fieldset className={`choice-group${errorFor(`/profiles/${profileIndex}/terrains`) ? ' invalid-field' : ''}`}><legend>Terrenos</legend><div className="choice-list terrain-choice-list">{terrainOptions.map(([code, label]) => <label key={code}><input type="checkbox" checked={profile.terrains.some((x) => x.code === code)} onChange={() => changeProfile((p) => ({ ...p, terrains: p.terrains.some((x) => x.code === code) ? p.terrains.filter((x) => x.code !== code) : [...p.terrains, { code, other: null }] }))} />{label}</label>)}</div>{errorFor(`/profiles/${profileIndex}/terrains`) && <small className="field-error">{errorFor(`/profiles/${profileIndex}/terrains`)}</small>}</fieldset>
        {select('Frequência', profile.frequency.code, (code) => changeProfile((p) => ({ ...p, frequency: { code, other: null } })), frequencyOptions, `/profiles/${profileIndex}/frequency/code`)}
        {text('Notas de clima/terreno', profile.climateTerrainNotes ?? '', (value) => setProfileText('climateTerrainNotes', value))}
        {select('Organização', profile.organization, (value) => changeProfile((p) => ({ ...p, organization: value })), organizationOptions, `/profiles/${profileIndex}/organization`)}
        <fieldset className={`choice-group${errorFor(`/profiles/${profileIndex}/activityPeriods`) ? ' invalid-field' : ''}`}><legend>Período de atividade</legend><div className="choice-list">{activityOptions.map(([code, label]) => <label key={code}><input type="checkbox" checked={profile.activityPeriods.some((x) => x.code === code)} onChange={() => changeProfile((p) => ({ ...p, activityPeriods: p.activityPeriods.some((x) => x.code === code) ? p.activityPeriods.filter((x) => x.code !== code) : [...p.activityPeriods, { code, other: code === 'special' || code === 'other' ? '' : null }] }))} />{label}</label>)}</div>{errorFor(`/profiles/${profileIndex}/activityPeriods`) && <small className="field-error">{errorFor(`/profiles/${profileIndex}/activityPeriods`)}</small>}</fieldset>
        {profile.activityPeriods.filter((item) => item.code === 'special' || item.code === 'other').map((item) => { const itemIndex = profile.activityPeriods.findIndex((entry) => entry.code === item.code); return text(item.code === 'special' ? 'Detalhe da atividade especial' : 'Outra atividade', item.other ?? '', (value) => changeProfile((p) => ({ ...p, activityPeriods: p.activityPeriods.map((entry) => entry.code === item.code ? { ...entry, other: value || null } : entry) })), 120, `/profiles/${profileIndex}/activityPeriods/${itemIndex}/other`); })}
        {text('Notas de atividade', profile.activityNotes ?? '', (value) => setProfileText('activityNotes', value))}
        {select('Dieta', profile.diet, (value) => changeProfile((p) => ({ ...p, diet: value })), dietOptions, `/profiles/${profileIndex}/diet`)}{text('Quantidade/encontro', profile.quantityEncounter, (value) => setProfileText('quantityEncounter', value), 120, `/profiles/${profileIndex}/quantityEncounter`)}{select('Tamanho', profile.size, (value) => changeProfile((p) => ({ ...p, size: value })), sizeOptions, `/profiles/${profileIndex}/size`)}{select('Moral', profile.morale, (value) => changeProfile((p) => ({ ...p, morale: value })), moraleOptions.map((v) => [v, v === 0 ? '0' : `+${v}`] as const), `/profiles/${profileIndex}/morale`)}{text('Tesouro', profile.treasure, (value) => setProfileText('treasure', value), 120, `/profiles/${profileIndex}/treasure`)}
        {text('Defesas especiais', profile.specialDefensesSummary, (value) => setProfileText('specialDefensesSummary', value), 1200, `/profiles/${profileIndex}/specialDefensesSummary`)}{text('Proteção à magia', profile.magicProtectionSummary, (value) => setProfileText('magicProtectionSummary', value), 1200, `/profiles/${profileIndex}/magicProtectionSummary`)}
        {area('Notas do perfil', profile.profileNotes, (value) => changeProfile((p) => ({ ...p, profileNotes: value })), true)}
      </div></details>
      <details open><summary>3. Atributos, PVs e Defesa</summary><div className="form-grid">
        {(['for','agi','sau','int','sab','per'] as const).map((key) => number(key.toUpperCase(), stats.attributes[key], (value) => setAttribute(key, value), -1, 3))}
        {number('Pontos de Vida', stats.hitPoints, (value) => changeStats((s) => ({ ...s, hitPoints: value })), 1, 250, `/profiles/${profileIndex}/statistics/hitPoints`)}
        {select('Defesa Natural', stats.defense.natural, (value) => setDefense('natural', value), Array.from({ length: 6 }, (_, i) => [i + 10, String(i + 10)] as const), `/profiles/${profileIndex}/statistics/defense/natural`)}
        {number('Armadura', stats.defense.armorBonus, (value) => setDefense('armorBonus', value), -10, 20)}
        {select('Escudo', stats.defense.shieldBonus, (value) => setDefense('shieldBonus', value), Array.from({ length: 6 }, (_, i) => [i, String(i)] as const), `/profiles/${profileIndex}/statistics/defense/shieldBonus`)}
        {number('Magia', stats.defense.magicBonus, (value) => setDefense('magicBonus', value), -10, 20)}
        {number('Outros', stats.defense.otherBonus, (value) => setDefense('otherBonus', value), -10, 20)}
        <label className="monster-field">Defesa final calculada<input readOnly value={stats.defense.final} /></label>
        {stats.defense.otherBonus !== 0 && text('Descrição do outro bônus', stats.defense.otherDescription ?? '', (value) => changeStats((s) => ({ ...s, defense: { ...s.defense, otherDescription: value || null } })))}
        {text('Movimento', stats.movement, (value) => setStatText('movement', value))}
      </div></details>
      <details open><summary>4. Redução de dano</summary>{stats.damageReductions.map((rd, rdIndex) => <section className="structured-table-editor form-grid" key={rd.id}>
        {text('Fonte', rd.source, (value) => updateRd(rd.id, { source: value }), 120, `/profiles/${profileIndex}/statistics/damageReductions/${rdIndex}/source`)}{select('Valor', rd.value, (value) => updateRd(rd.id, { value }), Array.from({ length: 11 }, (_, i) => [i, String(i)] as const), `/profiles/${profileIndex}/statistics/damageReductions/${rdIndex}/value`)}<fieldset className={`choice-group${errorFor(`/profiles/${profileIndex}/statistics/damageReductions/${rdIndex}/damageTypes`) ? ' invalid-field' : ''}`}><legend>Tipos de dano</legend><div className="choice-list">{damageTypeOptions.map(([code, label]) => <label key={code}><input type="checkbox" checked={rd.damageTypes.includes(code)} onChange={() => updateRd(rd.id, { damageTypes: rd.damageTypes.includes(code) ? rd.damageTypes.filter((x) => x !== code) : [...rd.damageTypes, code] })} />{label}</label>)}</div>{errorFor(`/profiles/${profileIndex}/statistics/damageReductions/${rdIndex}/damageTypes`) && <small className="field-error">{errorFor(`/profiles/${profileIndex}/statistics/damageReductions/${rdIndex}/damageTypes`)}</small>}</fieldset>
        <label className="monster-field">Usos<select value={rd.usesMode} onChange={(e) => updateRd(rd.id, { usesMode: e.target.value as DamageReduction['usesMode'], uses: e.target.value === 'limited' ? rd.uses ?? 1 : null })}><option value="limited">Limitados</option><option value="unlimited">Ilimitados</option><option value="special">Especiais</option></select></label>
        {rd.usesMode === 'limited' && select('Quantidade de usos', rd.uses ?? 1, (value) => updateRd(rd.id, { uses: value }), Array.from({ length: 15 }, (_, i) => [i + 1, String(i + 1)] as const), `/profiles/${profileIndex}/statistics/damageReductions/${rdIndex}/uses`)}{text('Notas', rd.notes ?? '', (value) => updateRd(rd.id, { notes: value || null }))}<button type="button" className="danger-button" onClick={() => changeStats((s) => ({ ...s, damageReductions: s.damageReductions.filter((x) => x.id !== rd.id).map((x, sortOrder) => ({ ...x, sortOrder })) }))}>Remover RD</button>
      </section>)}<button type="button" className="secondary-button" onClick={() => changeStats((s) => ({ ...s, damageReductions: [...s.damageReductions, blankRd(s.damageReductions.length)] }))}>＋ Adicionar redução</button></details>
      <details open><summary>5. Ataques</summary>{errorFor(`/profiles/${profileIndex}/statistics/attacks`) && <p className="field-error">{errorFor(`/profiles/${profileIndex}/statistics/attacks`)}</p>}{stats.attacks.map((attack, attackIndex) => <section className="structured-table-editor form-grid" key={attack.id}>
        {text('Nome', attack.name, (value) => updateAttack(attack.id, { name: value }), 120, `/profiles/${profileIndex}/statistics/attacks/${attackIndex}/name`)}{text('Fórmula de ataque', attack.attackFormula, (value) => updateAttack(attack.id, { attackFormula: value }), 80)}{text('Fórmula de dano', attack.damageFormula, (value) => updateAttack(attack.id, { damageFormula: value }), 80)}{select('Tipo de dano', attack.damageType, (value) => updateAttack(attack.id, { damageType: value }), damageTypeOptions)}{text('Área de alcance em metros', attack.range, (value) => updateAttack(attack.id, { range: value }))}{text('Intervalo de uso', attack.usageInterval, (value) => updateAttack(attack.id, { usageInterval: value }), 120)}{text('Anotações', attack.notes ?? '', (value) => updateAttack(attack.id, { notes: value || null }))}<button type="button" className="danger-button" disabled={stats.attacks.length <= 1 && profile.isPrimary} onClick={() => changeStats((s) => ({ ...s, attacks: s.attacks.filter((x) => x.id !== attack.id).map((x, sortOrder) => ({ ...x, sortOrder })) }))}>Remover ataque</button>
      </section>)}<button type="button" className="secondary-button" onClick={() => changeStats((s) => ({ ...s, attacks: [...s.attacks, blankAttack(s.attacks.length)] }))}>＋ Adicionar ataque</button></details>
      <details><summary>6. Defesa ativa</summary><label className="checkbox-field"><input type="checkbox" checked={stats.activeDefense.enabled} onChange={(e) => changeStats((s) => ({ ...s, activeDefense: e.target.checked ? { enabled: true, formula: '', cost: '', restrictions: '', notes: null } : { enabled: false, formula: null, cost: null, restrictions: null, notes: null } }))} /> Defesa ativa habilitada</label>{stats.activeDefense.enabled && <div className="form-grid">{text('Fórmula', stats.activeDefense.formula ?? '', (value) => changeStats((s) => ({ ...s, activeDefense: { ...s.activeDefense, formula: value } })), 240, `/profiles/${profileIndex}/statistics/activeDefense/formula`)}{text('Custo', stats.activeDefense.cost ?? '', (value) => changeStats((s) => ({ ...s, activeDefense: { ...s.activeDefense, cost: value } })), 240, `/profiles/${profileIndex}/statistics/activeDefense/cost`)}{area('Restrições', stats.activeDefense.restrictions, (value) => changeStats((s) => ({ ...s, activeDefense: { ...s.activeDefense, restrictions: value } })), false, `/profiles/${profileIndex}/statistics/activeDefense/restrictions`)}</div>}</details>
      <details><summary>7. Habilidades, traços e magias</summary><h3>Habilidades</h3>{stats.skills.map((skill, skillIndex) => <div className="form-grid" key={skill.id}>{text('Nome', skill.name, (value) => updateSkill(skill.id, { name: value }), 120, `/profiles/${profileIndex}/statistics/skills/${skillIndex}/name`)}{select('Modificador', skill.modifier, (value) => updateSkill(skill.id, { modifier: value }), [1, 2, 3].map((v) => [v, `+${v}`] as const), `/profiles/${profileIndex}/statistics/skills/${skillIndex}/modifier`)}{text('Notas', skill.notes ?? '', (value) => updateSkill(skill.id, { notes: value || null }))}<button type="button" className="danger-button" onClick={() => changeStats((s) => ({ ...s, skills: s.skills.filter((x) => x.id !== skill.id) }))}>Remover</button></div>)}<button type="button" className="secondary-button" onClick={() => changeStats((s) => ({ ...s, skills: [...s.skills, blankSkill(s.skills.length)] }))}>＋ Habilidade</button>
        <h3>Traços</h3>{stats.traits.map((trait, traitIndex) => <div className="form-grid" key={trait.id}>{text('Nome', trait.name, (value) => updateTrait(trait.id, { name: value }), 120, `/profiles/${profileIndex}/statistics/traits/${traitIndex}/name`)}{select('Categoria', trait.category, (value) => updateTrait(trait.id, { category: value }), traitCategoryOptions, `/profiles/${profileIndex}/statistics/traits/${traitIndex}/category`)}{text('Resumo', trait.summary, (value) => updateTrait(trait.id, { summary: value }))}{area('Detalhes', trait.details, (value) => updateTrait(trait.id, { details: value }))}{text('Usos', trait.uses ?? '', (value) => updateTrait(trait.id, { uses: value || null }))}{text('Recarga', trait.recharge ?? '', (value) => updateTrait(trait.id, { recharge: value || null }))}<button type="button" className="danger-button" onClick={() => changeStats((s) => ({ ...s, traits: s.traits.filter((x) => x.id !== trait.id) }))}>Remover</button></div>)}<button type="button" className="secondary-button" onClick={() => changeStats((s) => ({ ...s, traits: [...s.traits, blankTrait(s.traits.length)] }))}>＋ Traço</button>
        <h3>Magias e poderes</h3>{stats.spells.map((spell, spellIndex) => <div className="form-grid" key={spell.id}>{text('Nome', spell.name, (value) => updateSpell(spell.id, { name: value }), 120, `/profiles/${profileIndex}/statistics/spells/${spellIndex}/name`)}{select('Tipo', spell.mode, (value) => updateSpell(spell.id, { mode: value }), spellModeOptions, `/profiles/${profileIndex}/statistics/spells/${spellIndex}/mode`)}{text('Perícia de conjuração', spell.castingSkill ?? '', (value) => updateSpell(spell.id, { castingSkill: value || null }))}{number('Custo em PV', spell.pvCost ?? 0, (value) => updateSpell(spell.id, { pvCost: value }), 0, 20, `/profiles/${profileIndex}/statistics/spells/${spellIndex}/pvCost`)}{text('Usos', spell.uses ?? '', (value) => updateSpell(spell.id, { uses: value || null }))}{text('Recarga', spell.recharge ?? '', (value) => updateSpell(spell.id, { recharge: value || null }))}{text('Notas', spell.notes, (value) => updateSpell(spell.id, { notes: value }))}<button type="button" className="danger-button" onClick={() => changeStats((s) => ({ ...s, spells: s.spells.filter((x) => x.id !== spell.id) }))}>Remover</button></div>)}<button type="button" className="secondary-button" onClick={() => changeStats((s) => ({ ...s, spells: [...s.spells, blankSpell(s.spells.length)] }))}>＋ Magia/poder</button>
        {area('Resumo de habilidades especiais', stats.specialsSummary, (value) => setStatText('specialsSummary', value ?? ''))}</details>
      <details><summary>8. Módulo dracônico</summary><label className="checkbox-field"><input type="checkbox" checked={draft.dragonModuleEnabled} onChange={(e) => toggleDragon(e.target.checked)} /> Monstro dracônico com cinco perfis etários</label>{draft.dragonModuleEnabled && <p className="field-hint dragon-module-hint">Os perfis Filhote, Jovem, Adulto, Antigo e Ancião são criados automaticamente.</p>}{stats.dragon && <div className="form-grid"><h3>{profile.label} · Sopro</h3>{select('Forma', stats.dragon.breath.shape, (value) => updateBreath({ shape: value }), breathShapeOptions, `/profiles/${profileIndex}/statistics/dragon/breath/shape`)}{text('Elemento', stats.dragon.breath.element, (value) => updateBreath({ element: value }), 120, `/profiles/${profileIndex}/statistics/dragon/breath/element`)}{text('Dano', stats.dragon.breath.damage, (value) => updateBreath({ damage: value }), 80, `/profiles/${profileIndex}/statistics/dragon/breath/damage`)}{text('Área', stats.dragon.breath.area, (value) => updateBreath({ area: value }), 240, `/profiles/${profileIndex}/statistics/dragon/breath/area`)}{select('Atributo para resistência', stats.dragon.breath.saveAttribute, (value) => updateBreath({ saveAttribute: value }), saveAttributeOptions, `/profiles/${profileIndex}/statistics/dragon/breath/saveAttribute`)}{select('Dificuldade', stats.dragon.breath.difficulty, (value) => updateBreath({ difficulty: value }), Array.from({ length: 8 }, (_, i) => [i + 13, String(i + 13)] as const), `/profiles/${profileIndex}/statistics/dragon/breath/difficulty`)}{text('Efeito em sucesso', stats.dragon.breath.successEffect, (value) => updateBreath({ successEffect: value }))}<label className="checkbox-field"><input type="checkbox" checked={stats.dragon.breath.activeDefenseAllowed} onChange={(e) => updateBreath({ activeDefenseAllowed: e.target.checked })} /> Defesa ativa permitida</label>{text('Frequência', stats.dragon.breath.frequency, (value) => updateBreath({ frequency: value }))}{text('Restrições de ação', stats.dragon.breath.actionRestrictions, (value) => updateBreath({ actionRestrictions: value }))}{number('Máx. ataques físicos/rodada', stats.dragon.maxPhysicalAttacksPerRound, (value) => updateDragon({ maxPhysicalAttacksPerRound: value }), 0, 2)}{number('Máx. mordidas/rodada', stats.dragon.maxBitesPerRound, (value) => updateDragon({ maxBitesPerRound: value }), 0, 1)}{select('Limite de ataques aéreos', stats.dragon.airbornePhysicalAttackLimit, (value) => updateDragon({ airbornePhysicalAttackLimit: value }), [[0, '0'], [1, '1']])}{area('Notas etárias', stats.dragon.notes, (value) => updateDragon({ notes: value }))}</div>}</details>
      <details open><summary>9. Descrição, combate e ecologia</summary>{(['description','combat','habitatSociety','ecology','tactics','variations','additionalNotes'] as const).map((key) => { const path = `/narratives/${key}`; return <label className={`${fieldClass(path)} full-field`} key={key}>{({ description: 'Descrição', combat: 'Combate', habitatSociety: 'Habitat e sociedade', ecology: 'Ecologia', tactics: 'Táticas', variations: 'Variações', additionalNotes: 'Notas adicionais' })[key]}<textarea className={errorFor(path) ? 'invalid' : ''} aria-invalid={!!errorFor(path)} rows={5} value={draft.narratives[key] ?? ''} onChange={(e) => changeMonster((old) => ({ ...old, narratives: { ...old.narratives, [key]: key === 'description' || key === 'combat' || key === 'habitatSociety' || key === 'ecology' ? e.target.value : e.target.value || null } }))} />{errorFor(path) && <small className="field-error">{errorFor(path)}</small>}{draft.narratives[key] && <div className="markdown-preview"><span>Prévia</span><LimitedMarkdown source={draft.narratives[key] ?? ''} /></div>}</label>; })}</details>
      <details><summary>10. Referências</summary>{draft.sources.map((source) => <div className="form-grid" key={source.id}>{text('Título', source.title, (value) => updateSource(source.id, { title: value }), 300)}{text('Verbete', source.entry ?? '', (value) => updateSource(source.id, { entry: value || null }), 200)}{text('Página', source.page ?? '', (value) => updateSource(source.id, { page: value || null }), 80)}{area('Notas da fonte', source.notes, (value) => updateSource(source.id, { notes: value }))}<button type="button" className="danger-button" onClick={() => changeMonster((old) => ({ ...old, sources: old.sources.filter((x) => x.id !== source.id).map((x, sortOrder) => ({ ...x, sortOrder })) }))}>Remover</button></div>)}<button type="button" className="secondary-button" disabled={draft.sources.length >= 10} onClick={() => changeMonster((old) => ({ ...old, sources: [...old.sources, { id: id(), title: '', entry: null, page: null, notes: null, sortOrder: old.sources.length }] }))}>＋ Referência</button></details>
      <footer className="form-footer"><button type="button" className="secondary-button" onClick={() => setConfirmClose(true)}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar monstro'}</button></footer>
    </form>
    {confirmClose && <div className="modal-backdrop"><section className="dialog small-dialog" role="alertdialog" aria-modal="true"><h2>Sair do formulário?</h2><p>As alterações não salvas serão descartadas.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setConfirmClose(false)}>Continuar editando</button><button className="danger-button" onClick={onCancel}>Descartar</button></div></section></div>}
  </section></div>;
}
