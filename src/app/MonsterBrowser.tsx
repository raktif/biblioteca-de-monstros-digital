import { useEffect, useMemo, useState } from 'react';
import type { MonsterStatus, MonsterSummary } from '../infrastructure/monsters';
import { activityOptions, terrainOptions } from '../domain/shadowlords-vocabularies';

export interface MonsterViewPreferences { viewMode: 'list' | 'grid'; sortDirection: 'asc' | 'desc' }
const defaultPreferences: MonsterViewPreferences = { viewMode: 'list', sortDirection: 'asc' };

function readPreferences(libraryId: string): MonsterViewPreferences {
  try {
    const value = localStorage.getItem(`bmd.library-view.${libraryId}`);
    if (value) {
      const parsed = JSON.parse(value) as Partial<MonsterViewPreferences>;
      return { viewMode: parsed.viewMode === 'grid' ? 'grid' : 'list', sortDirection: parsed.sortDirection === 'desc' ? 'desc' : 'asc' };
    }
  } catch { /* use defaults when storage is unavailable or invalid */ }
  return defaultPreferences;
}

const terrainLabels = new Map<string, string>([
  ...terrainOptions,
  ['forest', 'Florestas'], ['jungle', 'Selvas'], ['swamp', 'Pântanos'], ['desert', 'Desertos'],
  ['coast', 'Costas marítimas'], ['ocean', 'Oceanos'], ['aquatic', 'Aquático'], ['urban', 'Urbano'],
  ['aerial', 'Aéreo'], ['extraplanar', 'Extraplanar'], ['other', 'Outro'],
]);
const activityLabels = new Map<string, string>([...activityOptions, ['dawn', 'Amanhecer'], ['dusk', 'Anoitecer']]);

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function optionsFor(rows: MonsterSummary[], key: 'terrains' | 'activityPeriods', labels: Map<string, string>) {
  return [...new Set(rows.flatMap((row) => row[key]))].sort((a, b) => (labels.get(a) ?? a).localeCompare(labels.get(b) ?? b, 'pt-BR')).map((code) => [code, labels.get(code) ?? code] as const);
}

export function filterMonsterRows(rows: MonsterSummary[], query: string, terrains: string[], periods: string[], sortDirection: 'asc' | 'desc'): MonsterSummary[] {
  const needle = normalize(query);
  return [...rows].filter((row) => (!needle || normalize(row.name).includes(needle))
    && (!terrains.length || terrains.some((code) => row.terrains.includes(code)))
    && (!periods.length || periods.some((code) => row.activityPeriods.includes(code))))
    .sort((a, b) => {
      const byName = normalize(a.name).localeCompare(normalize(b.name), 'pt-BR');
      const tie = a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
      return byName ? byName * (sortDirection === 'asc' ? 1 : -1) : tie;
    });
}

interface Props {
  libraryId: string;
  rows: MonsterSummary[];
  status: MonsterStatus;
  onOpen: (row: MonsterSummary) => void;
  onRestore: (row: MonsterSummary) => void;
  onDelete: (row: MonsterSummary) => void;
  onRemove: (row: MonsterSummary) => void;
}

export function MonsterBrowser({ libraryId, rows, status, onOpen, onRestore, onDelete, onRemove }: Props) {
  const [preferences, setPreferences] = useState(() => readPreferences(libraryId));
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [terrains, setTerrains] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  useEffect(() => { setPreferences(readPreferences(libraryId)); setSearchInput(''); setQuery(''); setTerrains([]); setPeriods([]); setPage(0); }, [libraryId]);
  useEffect(() => { const timer = window.setTimeout(() => setQuery(searchInput), 250); return () => window.clearTimeout(timer); }, [searchInput]);
  useEffect(() => { try { localStorage.setItem(`bmd.library-view.${libraryId}`, JSON.stringify(preferences)); } catch { /* preferences remain active for this session */ } }, [libraryId, preferences]);

  const filtered = useMemo(() => filterMonsterRows(rows, query, terrains, periods, preferences.sortDirection), [rows, query, terrains, periods, preferences.sortDirection]);
  const pageSize = 100;
  const pageCount = Math.ceil(filtered.length / pageSize);
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const terrainChoices = optionsFor(rows, 'terrains', terrainLabels);
  const periodChoices = optionsFor(rows, 'activityPeriods', activityLabels);
  const clearFilters = () => { setSearchInput(''); setQuery(''); setTerrains([]); setPeriods([]); setPage(0); };
  const setMulti = (setter: (value: string[]) => void, select: HTMLSelectElement) => setter(Array.from(select.selectedOptions, (option) => option.value));

  return <section aria-label="Pesquisa e listagem de monstros">
    <div className="monster-browser-controls">
      <label>Buscar por nome<input type="search" value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(0); }} placeholder="Ex.: dragão" /></label>
      <label>Terreno <select multiple value={terrains} onChange={(event) => { setMulti(setTerrains, event.currentTarget); setPage(0); }}>{terrainChoices.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label>Período de atividade <select multiple value={periods} onChange={(event) => { setMulti(setPeriods, event.currentTarget); setPage(0); }}>{periodChoices.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label>Ordenação <select value={preferences.sortDirection} onChange={(event) => setPreferences((old) => ({ ...old, sortDirection: event.target.value as 'asc' | 'desc' }))}><option value="asc">Nome: A a Z</option><option value="desc">Nome: Z a A</option></select></label>
      <label>Visualização <select value={preferences.viewMode} onChange={(event) => setPreferences((old) => ({ ...old, viewMode: event.target.value as 'list' | 'grid' }))}><option value="list">Lista</option><option value="grid">Grade</option></select></label>
      <button className="secondary-button" onClick={clearFilters} disabled={!searchInput && !terrains.length && !periods.length}>Limpar filtros</button>
    </div>
    <p className="browser-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'monstro encontrado' : 'monstros encontrados'}</p>
    {filtered.length === 0 ? <div className="coming-panel"><h2>{rows.length === 0 ? (status === 'trashed' ? 'A lixeira está vazia' : status === 'archived' ? 'Nenhum monstro arquivado' : 'Nenhum monstro cadastrado') : 'Nenhum resultado para a pesquisa'}</h2><p>{rows.length && (searchInput || terrains.length || periods.length) ? 'Altere ou limpe os filtros para ver outros monstros.' : 'Os monstros desta seção aparecerão aqui.'}</p></div> : <div className={preferences.viewMode === 'grid' ? 'monster-browser-grid' : 'monster-list'}>
      {visible.map((item) => <article className={preferences.viewMode === 'grid' ? 'monster-grid-card' : 'monster-list-row'} key={item.id}>
        <button className="monster-summary-open" onClick={() => status !== 'trashed' && onOpen(item)} disabled={status === 'trashed'}><span className="mini-cover">{item.imageDataUrl ? <img src={item.imageDataUrl} alt="" loading="lazy" /> : '♧'}</span><span className="monster-summary-copy"><strong>{item.name}</strong><small>{item.terrains[0] ? terrainLabels.get(item.terrains[0]) ?? item.terrains[0] : 'Terreno não informado'} · {item.activityPeriods[0] ? activityLabels.get(item.activityPeriods[0]) ?? item.activityPeriods[0] : 'Período não informado'}</small></span></button>
        {status === 'trashed' ? <div className="monster-row-actions"><button className="secondary-button" onClick={() => onRestore(item)}>Restaurar</button><button className="danger-button" onClick={() => onDelete(item)}>Excluir definitivamente</button></div> : <div className="monster-row-actions"><button className="secondary-button portable-action" disabled aria-label={`Exportar ${item.name}; indisponível nesta versão`} title="A exportação ZIP será habilitada após a conexão do comando nativo."><span aria-hidden="true">↥</span> Exportar</button><button className="secondary-button" onClick={() => onRemove(item)}>Remover</button></div>}
      </article>)}
    </div>}
    {pageCount > 1 && <nav className="browser-pagination" aria-label="Páginas da listagem"><button className="secondary-button" disabled={page === 0} onClick={() => { setPage((old) => Math.max(0, old - 1)); document.querySelector('.monster-browser-controls')?.scrollIntoView({ block: 'nearest' }); }}>Anterior</button><span>Página {page + 1} de {pageCount}</span><button className="secondary-button" disabled={page + 1 >= pageCount} onClick={() => { setPage((old) => Math.min(pageCount - 1, old + 1)); document.querySelector('.monster-browser-controls')?.scrollIntoView({ block: 'nearest' }); }}>Próxima</button></nav>}
  </section>;
}

export { normalize as normalizeMonsterSearch };
