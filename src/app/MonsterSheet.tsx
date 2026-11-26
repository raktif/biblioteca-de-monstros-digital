import { useState } from 'react';
import type { Add2EMonster, Profile } from '../generated/add2e-monster';
import type { MonsterRecord } from '../infrastructure/monsters';
import { LimitedMarkdown } from './LimitedMarkdown';

type Props = {
  record: Omit<MonsterRecord, 'document'> & { document: Add2EMonster };
  onClose: () => void;
  onEdit: () => void;
  onArchive: (archived: boolean) => void;
  onTrash: () => void;
  onExport: () => void;
};

type SheetField = [string, string | null | undefined];

function present(fields: SheetField[]): SheetField[] { return fields.filter(([, value]) => value !== null && value !== undefined && value.trim().length > 0); }

function profileFields(profile: Profile): SheetField[] {
  const stats = profile.statistics;
  return present([
    ['Clima', [...profile.climates.map((item) => item.other || item.code), profile.climateTerrainNotes].filter(Boolean).join(', ')],
    ['Terreno', profile.terrains.map((item) => item.other || item.code).join(', ')],
    ['Frequência', profile.frequency.code === 'other' ? profile.frequency.other : profile.frequency.code],
    ['Organização', profile.organization],
    ['Período de atividade', profile.activityPeriods.map((item) => item.other || item.code).join(', ')],
    ['Dieta', profile.diet], ['Tesouro', profile.treasure], ['Quantidade/Encontro', profile.quantityEncounter],
    ['Inteligência', stats.intelligence], ['Tendência', stats.alignment], ['Classe de Armadura', stats.armorClass],
    ['Movimento', stats.movement], ['Dados de Vida', stats.hitDice], ['TAC0', stats.thac0],
    ['Ataques por rodada', stats.attacksPerRound], ['Dano/Ataque', stats.damagePerAttack],
    ['Ataques especiais', stats.specialAttacks], ['Defesas especiais', stats.specialDefenses],
    ['Proteção à magia', stats.magicResistance], ['Tamanho', profile.size], ['Moral', profile.morale],
    ['Valor em XP', stats.experienceValue],
  ]);
}

function ProfileValues({ profile }: { profile: Profile }) {
  const fields = profileFields(profile);
  return <dl className="monster-stat-grid">{fields.map(([label, value]) => <div className="monster-stat" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function ProfileComparison({ profiles }: { profiles: Profile[] }) {
  const labels: [string, (profile: Profile) => string][] = [
    ['Clima/Terreno', (p) => `${p.climates.map((x) => x.other || x.code).join(', ')} · ${p.terrains.map((x) => x.other || x.code).join(', ')}`],
    ['Frequência', (p) => p.frequency.other || p.frequency.code], ['Organização', (p) => p.organization],
    ['Período de atividade', (p) => p.activityPeriods.map((x) => x.other || x.code).join(', ')],
    ['Dieta', (p) => p.diet], ['Tesouro', (p) => p.treasure], ['Quantidade/Encontro', (p) => p.quantityEncounter],
    ['Inteligência', (p) => p.statistics.intelligence], ['Tendência', (p) => p.statistics.alignment],
    ['CA', (p) => p.statistics.armorClass], ['Movimento', (p) => p.statistics.movement],
    ['DV', (p) => p.statistics.hitDice], ['TAC0', (p) => p.statistics.thac0],
    ['Ataques/Rodada', (p) => p.statistics.attacksPerRound], ['Dano/Ataque', (p) => p.statistics.damagePerAttack],
    ['Ataques especiais', (p) => p.statistics.specialAttacks], ['Defesas especiais', (p) => p.statistics.specialDefenses],
    ['Proteção à magia', (p) => p.statistics.magicResistance], ['Tamanho', (p) => p.size], ['Moral', (p) => p.morale], ['XP', (p) => p.statistics.experienceValue],
  ];
  return <div className="profile-comparison" role="region" aria-label="Comparativo de perfis"><table><thead><tr><th scope="col">Campo</th>{profiles.map((profile) => <th scope="col" key={profile.id}>{profile.label}</th>)}</tr></thead><tbody>{labels.map(([label, read]) => {
    const values = profiles.map(read);
    return values.some((value) => value.trim()) ? <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={`${label}-${index}`}>{value || '—'}</td>)}</tr> : null;
  })}</tbody></table></div>;
}

function Narrative({ title, value }: { title: string; value: string | null }) {
  if (!value?.trim()) return null;
  return <section className="sheet-narrative"><h3>{title}</h3><LimitedMarkdown source={value} /></section>;
}

export function MonsterSheet({ record, onClose, onEdit, onArchive, onTrash, onExport }: Props) {
  const document = record.document;
  const [profileId, setProfileId] = useState(document.profiles.find((profile) => profile.isPrimary)?.id ?? document.profiles[0].id);
  const [imageOpen, setImageOpen] = useState(false);
  const profile = document.profiles.find((item) => item.id === profileId) ?? document.profiles.find((item) => item.isPrimary) ?? document.profiles[0];
  const archived = document.status === 'archived';

  return <div className="monster-sheet-overlay"><article className="monster-sheet" role="dialog" aria-modal="true" aria-labelledby="monster-sheet-title">
    <header className="monster-sheet-header"><button className="back-link" onClick={onClose}>← Voltar à biblioteca</button><div className="sheet-actions"><button className="secondary-button" onClick={onEdit}>Editar</button><button className="secondary-button" onClick={() => onArchive(!archived)}>{archived ? 'Desarquivar' : 'Arquivar'}</button><button className="danger-button" onClick={onTrash}>Remover</button><button className="secondary-button" onClick={onExport}>Exportar</button></div></header>
    <div className="monster-sheet-body"><p className="kicker">AD&D 2ª EDIÇÃO <span className={archived ? 'sheet-status archived' : 'sheet-status'}>{archived ? 'ARQUIVADO' : 'ATIVO'}</span></p><h1 id="monster-sheet-title">{document.name}</h1>{document.editorialCategory && <p className="monster-category">{document.editorialCategory}</p>}
      {record.imageDataUrl && <button className="monster-sheet-image" onClick={() => setImageOpen(true)} aria-label="Ampliar imagem do monstro"><img src={record.imageDataUrl} alt={`Imagem de ${document.name}`} /><span>Ampliar imagem</span></button>}
      {document.profiles.length > 1 && <><div className="profile-switcher" role="tablist" aria-label="Selecionar perfil">{document.profiles.map((item) => <button role="tab" aria-selected={item.id === profile.id} className={item.id === profile.id ? 'profile-tab selected' : 'profile-tab'} key={item.id} onClick={() => setProfileId(item.id)}>{item.label}{item.isPrimary ? ' ★' : ''}</button>)}</div><div className="profile-compare-wide"><ProfileComparison profiles={document.profiles} /></div></>}
      <section className="sheet-section"><h2>Matriz de estatísticas · {profile.label}</h2><ProfileValues profile={profile} />{profile.profileNotes && <div className="sheet-profile-notes"><h3>Observações do perfil</h3><LimitedMarkdown source={profile.profileNotes} /></div>}</section>
      {profile.statistics.psionics && <section className="sheet-section"><h2>Psiônicos</h2><dl className="monster-stat-grid">{[["Nível",profile.statistics.psionics.level],["Dis/Cien/Dev",profile.statistics.psionics.disciplinesSciencesDevotions],["Ataque/Defesa",profile.statistics.psionics.attackDefenseModes],["Número de poder",profile.statistics.psionics.powerScore],["PPPs",profile.statistics.psionics.psps]].filter(([,value]) => value).map(([label,value]) => <div className="monster-stat" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><Narrative title="Poderes por disciplina" value={profile.statistics.psionics.powers} /></section>}
      {document.auxiliaryTables.map((table) => <section className="sheet-section" key={table.id}><h2>{table.title}</h2><div className="sheet-table-scroll"><table><thead><tr>{table.columns.map((column,index) => <th key={index} style={{ textAlign: column.alignment }}>{column.header}</th>)}</tr></thead><tbody>{table.rows.map((row,rowIndex) => <tr key={rowIndex}>{row.map((cell,cellIndex) => <td key={cellIndex} style={{ textAlign: table.columns[cellIndex]?.alignment ?? 'left' }}>{cell}</td>)}</tr>)}</tbody></table></div>{table.notes && <p className="sheet-table-notes">{table.notes}</p>}</section>)}
      <Narrative title="Descrição" value={document.narratives.description} /><Narrative title="Combate" value={document.narratives.combat} /><Narrative title="Habitat/Sociedade" value={document.narratives.habitatSociety} /><Narrative title="Ecologia" value={document.narratives.ecology} /><Narrative title="Variações" value={document.narratives.variations} /><Narrative title="Notas adicionais" value={document.narratives.additionalNotes} />
      {document.sources.length > 0 && <section className="sheet-section"><h2>Referências</h2><ol className="sheet-sources">{[...document.sources].sort((a,b) => a.sortOrder-b.sortOrder).map((source) => <li key={source.id}><strong>{source.title}</strong>{source.entry && <span> · {source.entry}</span>}{source.page && <span> · p. {source.page}</span>}{source.notes && <p>{source.notes}</p>}</li>)}</ol></section>}
      <footer className="sheet-metadata">Criado em {new Date(document.createdAt).toLocaleDateString('pt-BR')} · Atualizado em {new Date(document.updatedAt).toLocaleDateString('pt-BR')}</footer>
    </div>
    {imageOpen && record.imageDataUrl && <div className="image-viewer-backdrop" role="presentation" onClick={() => setImageOpen(false)}><section className="image-viewer" role="dialog" aria-modal="true" aria-label={`Imagem de ${document.name}`}><button className="dialog-close" aria-label="Fechar imagem">×</button><img src={record.imageDataUrl} alt={`Imagem ampliada de ${document.name}`} /></section></div>}
  </article></div>;
}
