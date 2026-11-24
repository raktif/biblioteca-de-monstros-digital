import { useState, type FormEvent, type ReactNode } from 'react';
import type { Add2EMonster, AuxiliaryTable, Climate, Profile, Source, Terrain } from '../generated/add2e-monster';
import { validateAdd2eMonster } from '../domain/validation';
import { LimitedMarkdown } from './LimitedMarkdown';

type Props = {
  libraryId: string;
  initial?: Add2EMonster;
  initialImage?: string | null;
  saving: boolean;
  serverError: string;
  onCancel: () => void;
  onSave: (document: Add2EMonster, imageDataUrl: string | null, removeImage: boolean) => Promise<void>;
};

const kinds = [['primary', 'Principal'], ['variant', 'Variante'], ['leader', 'Líder'], ['chief', 'Chefe'], ['shaman', 'Xamã'], ['form', 'Forma'], ['caste', 'Casta'], ['age', 'Categoria etária'], ['other', 'Outro']] as const;
const climateOptions: [Climate['code'], string][] = [['arctic','Ártico'],['subarctic','Subártico'],['cold','Frio'],['temperate','Temperado'],['subtropical','Subtropical'],['tropical','Tropical'],['hot','Quente'],['arid','Árido'],['any','Qualquer'],['extraplanar','Extraplanar'],['special','Especial'],['other','Outro']];
const terrainOptions: [Terrain['code'], string][] = [['underground','Subterrâneo'],['plains','Planícies'],['forest','Floresta'],['jungle','Selva'],['hills','Colinas'],['mountains','Montanhas'],['swamp','Pântano'],['desert','Deserto'],['coast','Costa'],['freshwater','Água doce'],['ocean','Oceano'],['aquatic','Aquático'],['urban','Urbano'],['ruins','Ruínas'],['wilderness','Ermo'],['aerial','Aéreo'],['space','Espaço'],['extraplanar','Extraplanar'],['any','Qualquer'],['special','Especial'],['other','Outro']];
const activityOptions: [Profile['activityPeriods'][number]['code'], string][] = [['day','Dia'],['night','Noite'],['twilight','Crepúsculo'],['dawn','Alvorada'],['dusk','Anoitecer'],['any','Qualquer'],['continuous','Contínuo'],['seasonal','Sazonal'],['special','Especial'],['other','Outro']];
const frequencies = [['common','Comum'],['uncommon','Incomum'],['rare','Raro'],['very_rare','Muito raro'],['unique','Único'],['variable','Variável'],['other','Outro']] as const;
const emptyPsionics = () => ({ level: '', disciplinesSciencesDevotions: '', attackDefenseModes: '', powerScore: '', psps: '', powers: '' });

function newProfile(): Profile {
  return {
    id: crypto.randomUUID(), label: 'Padrão', kind: 'primary', isPrimary: true, sortOrder: 0,
    climates: [{ code: 'temperate', other: null }], terrains: [{ code: 'plains', other: null }],
    climateTerrainNotes: null, frequency: { code: 'uncommon', other: null }, organization: '',
    activityPeriods: [{ code: 'any', other: null }], activityNotes: null, diet: '', treasure: '', quantityEncounter: '', size: '', morale: '', profileNotes: null,
    statistics: { type: 'add2e', intelligence: '', alignment: '', armorClass: '', movement: '', hitDice: '', thac0: '', attacksPerRound: '', damagePerAttack: '', specialAttacks: '', specialDefenses: '', magicResistance: '', experienceValue: '', psionics: null },
  };
}

function emptyMonster(libraryId: string): Add2EMonster {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), libraryId, systemCode: 'add2e', schemaKey: 'add2e.monster', schemaVersion: 1,
    name: '', editorialCategory: null, status: 'active', image: null,
    narratives: { description: '', combat: '', habitatSociety: '', ecology: '', variations: null, additionalNotes: null },
    profiles: [newProfile()], auxiliaryTables: [], sources: [], contentHash: '0'.repeat(64), createdAt: now, updatedAt: now, rowVersion: 1,
  };
}

function nextProfileLabel(name: string): string { return name ? `${name} (cópia)` : 'Cópia'; }

export function MonsterForm({ libraryId, initial, initialImage, saving, serverError, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState<Add2EMonster>(() => initial ? structuredClone(initial) : emptyMonster(libraryId));
  const [original] = useState(() => JSON.stringify(draft));
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(() => initial?.profiles.find((profile) => profile.isPrimary)?.id ?? initial?.profiles[0]?.id ?? '');
  const [issues, setIssues] = useState<string[]>([]);
  const [pendingClose, setPendingClose] = useState(false);
  const [imageError, setImageError] = useState('');
  const dirty = JSON.stringify(draft) !== original || imageDataUrl !== null || removeImage;
  const selectedProfile = draft.profiles.find((profile) => profile.id === selectedProfileId) ?? draft.profiles[0];
  const displayImage = imageDataUrl ?? (removeImage ? null : initialImage ?? null);

  function updateDraft(update: (current: Add2EMonster) => Add2EMonster) {
    setDraft(update);
    setIssues([]);
  }

  function updateProfile(update: (profile: Profile) => Profile) {
    updateDraft((current) => ({ ...current, profiles: current.profiles.map((profile) => profile.id === selectedProfile?.id ? update(profile) : profile) }));
  }

  function updateProfileField<K extends keyof Profile>(key: K, value: Profile[K]) {
    updateProfile((profile) => ({ ...profile, [key]: value }));
  }

  function updateStatistics(key: keyof Profile['statistics'], value: string | null | Profile['statistics']['psionics']) {
    updateProfile((profile) => ({ ...profile, statistics: { ...profile.statistics, [key]: value } }));
  }

  function toggleChoice<T extends { code: string; other: string | null }>(key: 'climates' | 'terrains' | 'activityPeriods', code: string) {
    updateProfile((profile) => {
      const entries = profile[key] as T[];
      const exists = entries.some((entry) => entry.code === code);
      return { ...profile, [key]: exists ? entries.filter((entry) => entry.code !== code) : [...entries, { code, other: null }] };
    });
  }

  function setChoiceOther(key: 'climates' | 'terrains' | 'activityPeriods', code: string, text: string) {
    updateProfile((profile) => ({ ...profile, [key]: profile[key].map((entry) => entry.code === code ? { ...entry, other: text || null } : entry) }));
  }

  function addProfile() {
    if (draft.profiles.length >= 30) return;
    const source = selectedProfile ?? newProfile();
    const copy = structuredClone(source);
    copy.id = crypto.randomUUID(); copy.label = nextProfileLabel(source.label); copy.kind = 'variant'; copy.isPrimary = false;
    copy.sortOrder = draft.profiles.length;
    updateDraft((current) => ({ ...current, profiles: [...current.profiles, copy] }));
    setSelectedProfileId(copy.id);
  }

  function makePrimary(id: string) {
    updateDraft((current) => ({ ...current, profiles: current.profiles.map((profile) => ({ ...profile, isPrimary: profile.id === id })) }));
  }

  function reorderProfile(index: number, direction: -1 | 1) {
    const next = [...draft.profiles];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateDraft((current) => ({ ...current, profiles: next.map((profile, sortOrder) => ({ ...profile, sortOrder })) }));
  }

  function deleteProfile(id: string) {
    if (draft.profiles.length <= 1) return;
    const next = draft.profiles.filter((profile) => profile.id !== id).map((profile, sortOrder) => ({ ...profile, sortOrder }));
    updateDraft((current) => ({ ...current, profiles: next }));
    if (id === selectedProfileId) setSelectedProfileId((next.find((profile) => profile.isPrimary) ?? next[0]).id);
  }

  function addTable() {
    if (draft.auxiliaryTables.length >= 10) return;
    const table: AuxiliaryTable = { id: crypto.randomUUID(), title: '', columns: [{ header: '', alignment: 'left' }], rows: [], notes: null, sortOrder: draft.auxiliaryTables.length };
    updateDraft((current) => ({ ...current, auxiliaryTables: [...current.auxiliaryTables, table] }));
  }

  function updateTable(id: string, update: (table: AuxiliaryTable) => AuxiliaryTable) {
    updateDraft((current) => ({ ...current, auxiliaryTables: current.auxiliaryTables.map((table) => {
      if (table.id !== id) return table;
      const next = update(table);
      return { ...next, rows: next.rows.map((row) => next.columns.map((_, index) => row[index] ?? '')) };
    }) }));
  }

  function addSource() {
    if (draft.sources.length >= 10) return;
    const source: Source = { id: crypto.randomUUID(), title: '', entry: null, page: null, notes: null, sortOrder: draft.sources.length };
    updateDraft((current) => ({ ...current, sources: [...current.sources, source] }));
  }

  function requestClose() { if (dirty) setPendingClose(true); else onCancel(); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = { ...draft, name: draft.name.trim(), profiles: draft.profiles.map((profile, sortOrder) => ({ ...profile, sortOrder, label: profile.label.trim() })), auxiliaryTables: draft.auxiliaryTables.map((table, sortOrder) => ({ ...table, sortOrder })), sources: draft.sources.map((source, sortOrder) => ({ ...source, sortOrder })) };
    const validation = validateAdd2eMonster(normalized);
    if (!validation.valid) { setIssues(validation.issues); document.getElementById('monster-errors')?.focus(); return; }
    await onSave(normalized, imageDataUrl, removeImage);
  }

  async function readImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setImageError('Selecione uma imagem JPEG, PNG ou WebP.'); return; }
    if (file.size > 10 * 1024 * 1024) { setImageError('A imagem deve ter no máximo 10 MiB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setImageDataUrl(String(reader.result)); setRemoveImage(false); setImageError(''); };
    reader.onerror = () => setImageError('Não foi possível ler o arquivo selecionado.');
    reader.readAsDataURL(file);
  }

  function applyMarkdown(field: keyof Add2EMonster['narratives'] | 'profileNotes' | 'psionicPowers', marker: string) {
    const textarea = document.activeElement instanceof HTMLTextAreaElement ? document.activeElement : null;
    if (!textarea) return;
    const start = textarea.selectionStart; const end = textarea.selectionEnd;
    const selectedText = textarea.value.slice(start, end) || 'texto';
    const replacement = marker.includes(' ') ? `${marker}${selectedText}` : `${marker}${selectedText}${marker}`;
    if (field === 'psionicPowers') {
      const psionics = selectedProfile?.statistics.psionics ?? emptyPsionics();
      updateStatistics('psionics', { ...psionics, powers: `${psionics.powers.slice(0, start)}${replacement}${psionics.powers.slice(end)}` });
    } else if (field === 'profileNotes') {
      updateProfileField('profileNotes', `${(selectedProfile?.profileNotes ?? '').slice(0, start)}${replacement}${(selectedProfile?.profileNotes ?? '').slice(end)}`);
    } else {
      updateDraft((current) => ({ ...current, narratives: { ...current.narratives, [field]: `${current.narratives[field]?.slice(0, start) ?? ''}${replacement}${current.narratives[field]?.slice(end) ?? ''}` } }));
    }
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + replacement.length, start + replacement.length); });
  }

  function markdownToolbar(field: Parameters<typeof applyMarkdown>[0]) {
    return <div className="markdown-toolbar" aria-label="Formatação Markdown">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyMarkdown(field, '**')} aria-label="Negrito"><strong>B</strong></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyMarkdown(field, '*')} aria-label="Itálico"><em>I</em></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyMarkdown(field, '- ')} aria-label="Lista com marcadores">• Lista</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyMarkdown(field, '### ')} aria-label="Título">H3</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applyMarkdown(field, '> ')} aria-label="Citação">❞</button>
    </div>;
  }

  const issueFor = (path: string) => issues.some((issue) => issue.startsWith(`${path}:`) || issue.startsWith(`${path}/`));
  const textInput = (label: string, value: string, onChange: (value: string) => void, maxLength = 120, path = '') => <label className="monster-field">{label}<input maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={issueFor(path) ? 'invalid' : ''} /></label>;
  const textArea = (label: string, value: string, onChange: (value: string) => void, maxLength = 1200, path = '', markdownField?: Parameters<typeof applyMarkdown>[0]) => <label className="monster-field full-field">{label}{markdownField && markdownToolbar(markdownField)}<textarea maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} className={issueFor(path) ? 'invalid' : ''} rows={4} />{markdownField && value && <div className="markdown-preview"><span>Prévia</span><LimitedMarkdown source={value} /></div>}</label>;

  return <div className="monster-editor-overlay"><section className="monster-editor" role="dialog" aria-modal="true" aria-labelledby="monster-form-title">
    <header className="monster-editor-header"><div><p className="kicker">AD&D 2ª EDIÇÃO</p><h2 id="monster-form-title">{initial ? 'Editar monstro' : 'Novo monstro'}</h2><p>Preencha apenas o que consta na fonte; as expressões mecânicas são armazenadas como texto.</p></div><button type="button" className="dialog-close" onClick={requestClose} aria-label="Fechar">×</button></header>
    {(issues.length > 0 || serverError) && <section id="monster-errors" tabIndex={-1} className="monster-error-summary" role="alert"><strong>Revise os dados antes de salvar</strong>{serverError && <p>{serverError}</p>}{issues.length > 0 && <ul>{issues.slice(0, 12).map((issue) => <li key={issue}>{issue}</li>)}</ul>}</section>}
    <form id="monster-editor-form" onSubmit={(event) => void submit(event)} className="monster-form">
      <details open><summary>1. Identificação e imagem</summary><div className="form-grid">
        {textInput('Nome do monstro', draft.name, (value) => updateDraft((current) => ({ ...current, name: value })), 120, '/name')}
        {textInput('Família ou categoria editorial (opcional)', draft.editorialCategory ?? '', (value) => updateDraft((current) => ({ ...current, editorialCategory: value || null })), 160, '/editorialCategory')}
        <div className="monster-image-picker full-field"><div className="monster-image-preview">{displayImage ? <img src={displayImage} alt="Prévia do monstro" /> : <span aria-hidden="true">♧</span>}</div><div><strong>Imagem do monstro</strong><p>JPEG, PNG ou WebP · até 10 MiB</p><label className="upload-button">{displayImage ? 'Trocar imagem' : 'Escolher imagem'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void readImage(event.target.files?.[0])} /></label>{initialImage && !removeImage && <button type="button" className="remove-image" onClick={() => { setRemoveImage(true); setImageDataUrl(null); }}>Remover imagem</button>}{imageError && <p className="form-error">{imageError}</p>}</div></div>
      </div></details>

      <details open><summary>2. Perfis estatísticos</summary><div className="profile-toolbar"><div className="profile-tabs" role="tablist" aria-label="Perfis">{draft.profiles.map((profile) => <button type="button" role="tab" aria-selected={profile.id === selectedProfile?.id} className={profile.id === selectedProfile?.id ? 'profile-tab selected' : 'profile-tab'} key={profile.id} onClick={() => setSelectedProfileId(profile.id)}>{profile.label || 'Sem nome'}{profile.isPrimary ? ' ★' : ''}</button>)}</div><button type="button" className="secondary-button" disabled={draft.profiles.length >= 30} onClick={addProfile}>Duplicar perfil</button></div>
        {selectedProfile && <div className="profile-editor-panel"><div className="profile-actions"><label className="monster-field">Nome do perfil<input maxLength={120} value={selectedProfile.label} onChange={(event) => updateProfileField('label', event.target.value)} /></label><label className="monster-field">Tipo<select value={selectedProfile.kind} onChange={(event) => updateProfileField('kind', event.target.value as Profile['kind'])}>{kinds.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><button type="button" className="secondary-button" disabled={selectedProfile.isPrimary} onClick={() => makePrimary(selectedProfile.id)}>Definir principal</button><button type="button" className="secondary-button" disabled={draft.profiles.length <= 1} onClick={() => deleteProfile(selectedProfile.id)}>Excluir perfil</button><button type="button" className="icon-button" aria-label="Mover perfil para cima" onClick={() => reorderProfile(draft.profiles.findIndex((profile) => profile.id === selectedProfile.id), -1)}>↑</button><button type="button" className="icon-button" aria-label="Mover perfil para baixo" onClick={() => reorderProfile(draft.profiles.findIndex((profile) => profile.id === selectedProfile.id), 1)}>↓</button></div>
          <div className="profile-fieldsets">
            <section className="profile-subsection"><h3>Clima e terreno</h3><ChoiceGroup label="Clima" choices={climateOptions} entries={selectedProfile.climates} onToggle={(code) => toggleChoice<Climate>('climates', code)} onOther={(code, text) => setChoiceOther('climates', code, text)} otherRequiredCodes={['other']} /><ChoiceGroup label="Terreno" choices={terrainOptions} entries={selectedProfile.terrains} onToggle={(code) => toggleChoice<Terrain>('terrains', code)} onOther={(code, text) => setChoiceOther('terrains', code, text)} otherRequiredCodes={['other']} />{textInput('Complemento de clima/terreno', selectedProfile.climateTerrainNotes ?? '', (value) => updateProfileField('climateTerrainNotes', value || null), 120, '/profiles/climateTerrainNotes')}</section>
            <section className="profile-subsection"><h3>Dados comuns</h3><div className="form-grid">
              <label className="monster-field">Frequência<select value={selectedProfile.frequency.code} onChange={(event) => updateProfileField('frequency', { code: event.target.value as Profile['frequency']['code'], other: event.target.value === 'other' ? selectedProfile.frequency.other : null })}>{frequencies.map(([code,label]) => <option value={code} key={code}>{label}</option>)}</select></label>
              {selectedProfile.frequency.code === 'other' && textInput('Outra frequência', selectedProfile.frequency.other ?? '', (value) => updateProfileField('frequency', { ...selectedProfile.frequency, other: value || null }), 120, '/profiles/frequency/other')}
              {textInput('Organização', selectedProfile.organization, (value) => updateProfileField('organization', value), 120)}
      <ChoiceGroup label="Período de atividade" choices={activityOptions} entries={selectedProfile.activityPeriods} onToggle={(code) => toggleChoice<Profile['activityPeriods'][number]>('activityPeriods', code)} onOther={(code,text) => setChoiceOther('activityPeriods', code,text)} otherRequiredCodes={['special','other']} />
              {textInput('Complemento de atividade', selectedProfile.activityNotes ?? '', (value) => updateProfileField('activityNotes', value || null), 120)}
              {textInput('Dieta', selectedProfile.diet, (value) => updateProfileField('diet', value), 120)}
              {textInput('Tesouro', selectedProfile.treasure, (value) => updateProfileField('treasure', value), 120)}
              {textInput('Quantidade/Encontro', selectedProfile.quantityEncounter, (value) => updateProfileField('quantityEncounter', value), 120)}
              {textInput('Tamanho', selectedProfile.size, (value) => updateProfileField('size', value), 120)}
              {textInput('Moral', selectedProfile.morale, (value) => updateProfileField('morale', value), 120)}
              {textArea('Observações do perfil', selectedProfile.profileNotes ?? '', (value) => updateProfileField('profileNotes', value || null), 3000, '/profiles/profileNotes', 'profileNotes')}
            </div></section>
            <section className="profile-subsection"><h3>Estatísticas AD&D</h3><div className="form-grid">
              {([['intelligence','Inteligência',120],['alignment','Tendência',120],['armorClass','Classe de Armadura (CA)',120],['movement','Movimento',240],['hitDice','Dados de Vida (DV)',120],['thac0','TAC0',120],['attacksPerRound','Número de ataques',120],['damagePerAttack','Dano por ataque',240],['specialAttacks','Ataques especiais',1200],['specialDefenses','Defesas especiais',1200],['magicResistance','Proteção à magia',120],['experienceValue','Valor em XP',120]] as const).map(([key,label,max]) => {
                const value = selectedProfile.statistics[key];
                return max > 240 ? textArea(label, value, (next) => updateStatistics(key, next), max, `/profiles/statistics/${key}`) : textInput(label, value, (next) => updateStatistics(key, next), max, `/profiles/statistics/${key}`);
              })}
            </div></section>
          </div>
        </div>}
      </details>

      <details><summary>3. Psiônicos</summary><label className="toggle-row"><input type="checkbox" checked={!!selectedProfile?.statistics.psionics} onChange={(event) => updateStatistics('psionics', event.target.checked ? emptyPsionics() : null)} /> Este perfil possui Psiônicos</label>{selectedProfile?.statistics.psionics && <div className="form-grid psi-grid">
        {textInput('Nível', selectedProfile.statistics.psionics.level, (value) => updateStatistics('psionics', { ...selectedProfile.statistics.psionics!, level: value }))}
        {textInput('Disciplinas/Ciências/Devoções', selectedProfile.statistics.psionics.disciplinesSciencesDevotions, (value) => updateStatistics('psionics', { ...selectedProfile.statistics.psionics!, disciplinesSciencesDevotions: value }))}
        {textInput('Modos de ataque/defesa', selectedProfile.statistics.psionics.attackDefenseModes, (value) => updateStatistics('psionics', { ...selectedProfile.statistics.psionics!, attackDefenseModes: value }))}
        {textInput('Número de poder', selectedProfile.statistics.psionics.powerScore, (value) => updateStatistics('psionics', { ...selectedProfile.statistics.psionics!, powerScore: value }))}
        {textInput('PPPs', selectedProfile.statistics.psionics.psps, (value) => updateStatistics('psionics', { ...selectedProfile.statistics.psionics!, psps: value }))}
        {textArea('Poderes por disciplina', selectedProfile.statistics.psionics.powers, (value) => updateStatistics('psionics', { ...selectedProfile.statistics.psionics!, powers: value }), 50000, '/profiles/statistics/psionics/powers', 'psionicPowers')}
      </div>}</details>

      <details><summary>4. Tabelas complementares ({draft.auxiliaryTables.length}/10)</summary><div className="table-editors">{draft.auxiliaryTables.map((table) => <section className="structured-table-editor" key={table.id}><div className="table-editor-title"><label className="monster-field">Título<input maxLength={160} value={table.title} onChange={(event) => updateTable(table.id, (value) => ({ ...value, title: event.target.value }))} /></label><button type="button" className="danger-button" onClick={() => updateDraft((current) => ({ ...current, auxiliaryTables: current.auxiliaryTables.filter((item) => item.id !== table.id).map((item, sortOrder) => ({ ...item, sortOrder })) }))}>Remover tabela</button></div><div className="table-column-editor">{table.columns.map((column, index) => <div className="table-column-row" key={`${table.id}-${index}`}><label className="monster-field">Cabeçalho<input maxLength={80} value={column.header} onChange={(event) => updateTable(table.id, (value) => ({ ...value, columns: value.columns.map((item, columnIndex) => columnIndex === index ? { ...item, header: event.target.value } : item) }))} /></label><label className="monster-field">Alinhamento<select value={column.alignment} onChange={(event) => updateTable(table.id, (value) => ({ ...value, columns: value.columns.map((item, columnIndex) => columnIndex === index ? { ...item, alignment: event.target.value as typeof column.alignment } : item) }))}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><button type="button" className="icon-button" disabled={table.columns.length <= 1} onClick={() => updateTable(table.id, (value) => ({ ...value, columns: value.columns.filter((_, columnIndex) => columnIndex !== index), rows: value.rows.map((row) => row.filter((_, columnIndex) => columnIndex !== index)) }))} aria-label="Remover coluna">×</button></div>)}<button type="button" className="secondary-button" disabled={table.columns.length >= 20} onClick={() => updateTable(table.id, (value) => ({ ...value, columns: [...value.columns, { header: '', alignment: 'left' }] }))}>Adicionar coluna</button></div><div className="table-row-editor">{table.rows.map((row, rowIndex) => <div className="table-data-row" key={`${table.id}-row-${rowIndex}`}>{table.columns.map((column, columnIndex) => <label key={`${table.id}-${rowIndex}-${columnIndex}`} className="monster-field">{column.header || `Coluna ${columnIndex + 1}`}<input maxLength={500} value={row[columnIndex] ?? ''} onChange={(event) => updateTable(table.id, (value) => ({ ...value, rows: value.rows.map((cells, index) => index === rowIndex ? cells.map((cell, cellIndex) => cellIndex === columnIndex ? event.target.value : cell) : cells) }))} /></label>)}<button type="button" className="icon-button" aria-label="Remover linha" onClick={() => updateTable(table.id, (value) => ({ ...value, rows: value.rows.filter((_, index) => index !== rowIndex) }))}>×</button></div>)}<button type="button" className="secondary-button" disabled={table.rows.length >= 200} onClick={() => updateTable(table.id, (value) => ({ ...value, rows: [...value.rows, value.columns.map(() => '')] }))}>Adicionar linha</button></div>{textArea('Notas da tabela', table.notes ?? '', (value) => updateTable(table.id, (item) => ({ ...item, notes: value || null })), 3000)}</section>)}<button type="button" className="secondary-button" disabled={draft.auxiliaryTables.length >= 10} onClick={addTable}>＋ Adicionar tabela</button></div></details>

      <NarrativeSection title="5. Descrição" name="description" value={draft.narratives.description} path="/narratives/description" invalid={issueFor('/narratives/description')} onChange={(value) => updateDraft((current) => ({ ...current, narratives: { ...current.narratives, description: value } }))} toolbar={markdownToolbar('description')} />
      <NarrativeSection title="6. Combate" name="combat" value={draft.narratives.combat} path="/narratives/combat" invalid={issueFor('/narratives/combat')} onChange={(value) => updateDraft((current) => ({ ...current, narratives: { ...current.narratives, combat: value } }))} toolbar={markdownToolbar('combat')} />
      <NarrativeSection title="7. Habitat/Sociedade" name="habitatSociety" value={draft.narratives.habitatSociety} path="/narratives/habitatSociety" invalid={issueFor('/narratives/habitatSociety')} onChange={(value) => updateDraft((current) => ({ ...current, narratives: { ...current.narratives, habitatSociety: value } }))} toolbar={markdownToolbar('habitatSociety')} />
      <NarrativeSection title="8. Ecologia" name="ecology" value={draft.narratives.ecology} path="/narratives/ecology" invalid={issueFor('/narratives/ecology')} onChange={(value) => updateDraft((current) => ({ ...current, narratives: { ...current.narratives, ecology: value } }))} toolbar={markdownToolbar('ecology')} />
      <details><summary>9. Variações e notas</summary><div className="form-grid">
        {textArea('Variações', draft.narratives.variations ?? '', (value) => updateDraft((current) => ({ ...current, narratives: { ...current.narratives, variations: value || null } })), 50000, '/narratives/variations', 'variations')}
        {textArea('Notas adicionais', draft.narratives.additionalNotes ?? '', (value) => updateDraft((current) => ({ ...current, narratives: { ...current.narratives, additionalNotes: value || null } })), 50000, '/narratives/additionalNotes', 'additionalNotes')}
      </div></details>
      <details><summary>10. Referências ({draft.sources.length}/10)</summary><div className="source-editors">{draft.sources.map((source) => <div className="source-editor-row" key={source.id}><label className="monster-field">Título<input maxLength={300} value={source.title} onChange={(event) => updateDraft((current) => ({ ...current, sources: current.sources.map((item) => item.id === source.id ? { ...item, title: event.target.value } : item) }))} /></label><label className="monster-field">Verbete<input maxLength={200} value={source.entry ?? ''} onChange={(event) => updateDraft((current) => ({ ...current, sources: current.sources.map((item) => item.id === source.id ? { ...item, entry: event.target.value || null } : item) }))} /></label><label className="monster-field">Página<input maxLength={80} value={source.page ?? ''} onChange={(event) => updateDraft((current) => ({ ...current, sources: current.sources.map((item) => item.id === source.id ? { ...item, page: event.target.value || null } : item) }))} /></label><label className="monster-field">Notas<input maxLength={1000} value={source.notes ?? ''} onChange={(event) => updateDraft((current) => ({ ...current, sources: current.sources.map((item) => item.id === source.id ? { ...item, notes: event.target.value || null } : item) }))} /></label><button type="button" className="danger-button" onClick={() => updateDraft((current) => ({ ...current, sources: current.sources.filter((item) => item.id !== source.id).map((item, sortOrder) => ({ ...item, sortOrder })) }))}>Remover</button></div>)}<button type="button" className="secondary-button" disabled={draft.sources.length >= 10} onClick={addSource}>＋ Adicionar referência</button></div></details>
      <footer className="monster-form-footer"><button type="button" className="secondary-button" onClick={requestClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar ficha'}</button></footer>
    </form>
    {pendingClose && <div className="monster-confirm-backdrop"><section className="dialog small-dialog" role="alertdialog" aria-modal="true" aria-labelledby="monster-unsaved-title"><h2 id="monster-unsaved-title">Alterações não salvas</h2><p>Deseja salvar as alterações antes de sair?</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setPendingClose(false)}>Continuar editando</button><button className="danger-button" onClick={() => { setPendingClose(false); onCancel(); }}>Descartar</button><button className="primary-button" onClick={() => { setPendingClose(false); (document.getElementById('monster-editor-form') as HTMLFormElement | null)?.requestSubmit(); }}>Salvar</button></div></section></div>}
  </section></div>;
}

function ChoiceGroup<T extends { code: string; other: string | null }>({ label, choices, entries, onToggle, onOther, otherRequiredCodes = [] }: { label: string; choices: readonly (readonly [string, string])[]; entries: T[]; onToggle: (code: string) => void; onOther: (code: string, text: string) => void; otherRequiredCodes?: string[] }) {
  return <fieldset className="choice-group"><legend>{label}</legend><div className="choice-list">{choices.map(([code, name]) => <label key={code}><input type="checkbox" checked={entries.some((entry) => entry.code === code)} onChange={() => onToggle(code)} />{name}</label>)}</div>{entries.filter((entry) => otherRequiredCodes.includes(entry.code)).map((entry) => <label className="monster-field" key={entry.code}>Especifique {entry.code === 'other' ? 'outro' : 'especial'}<input value={entry.other ?? ''} maxLength={120} onChange={(event) => onOther(entry.code, event.target.value)} /></label>)}</fieldset>;
}

function NarrativeSection({ title, name, value, path, invalid, onChange, toolbar }: { title: string; name: string; value: string; path: string; invalid: boolean; onChange: (value: string) => void; toolbar: ReactNode }) {
  return <details><summary>{title}</summary><label className="monster-field narrative-editor">Texto (Markdown limitado){toolbar}<textarea id={`narrative-${name}`} data-path={path} aria-invalid={invalid} className={invalid ? 'invalid' : ''} maxLength={50000} rows={6} value={value} onChange={(event) => onChange(event.target.value)} />{value && <div className="markdown-preview"><span>Prévia</span><LimitedMarkdown source={value} /></div>}</label></details>;
}
