import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { initializeRuntime, type RuntimeInfo } from '../infrastructure/runtime';
import {
  createLibrary, deleteLibraryPermanently, listLibraries, listTrashedLibraries, moveLibraryToTrash,
  restoreLibrary, updateLibrary, type Library, type SystemCode,
} from '../infrastructure/libraries';
import './app.css';

type Page = 'libraries' | 'trash' | 'detail';
type Draft = { name: string; systemCode: SystemCode; imageDataUrl: string | null; removeImage: boolean };
const emptyDraft: Draft = { name: '', systemCode: 'add2e', imageDataUrl: null, removeImage: false };

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const correlationId = 'correlationId' in error && typeof error.correlationId === 'string' ? error.correlationId : null;
    return correlationId ? `${error.message} (código ${correlationId})` : error.message;
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

function App() {
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [trash, setTrash] = useState<Library[]>([]);
  const [page, setPage] = useState<Page>('libraries');
  const [selected, setSelected] = useState<Library | null>(null);
  const [editing, setEditing] = useState<Library | null | false>(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteName, setDeleteName] = useState('');
  const [pendingClose, setPendingClose] = useState(false);

  const refresh = useCallback(async () => {
    const [active, removed] = await Promise.all([listLibraries(), listTrashedLibraries()]);
    setLibraries(active);
    setTrash(removed);
    setSelected((previous) => previous ? active.find((item) => item.id === previous.id) ?? null : null);
  }, []);

  useEffect(() => {
    let alive = true;
    initializeRuntime().then(async (info) => {
      if (alive) setRuntime(info);
      await refresh();
    }).catch((reason: unknown) => {
      if (alive) { setReadOnly(true); setError(errorMessage(reason)); }
    }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [refresh]);

  const beginCreate = () => { setDraft(emptyDraft); setEditing(null); setError(''); };
  const beginEdit = (item: Library) => {
    setDraft({ name: item.name, systemCode: item.systemCode, imageDataUrl: null, removeImage: false });
    setEditing(item); setError('');
  };
  const isDirty = useMemo(() => editing !== false && (draft.name !== (editing?.name ?? '') || draft.systemCode !== (editing?.systemCode ?? 'add2e') || !!draft.imageDataUrl || draft.removeImage), [draft, editing]);

  async function submitForm(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (editing) {
        const updated = await updateLibrary(editing.id, draft, editing.rowVersion, draft.removeImage);
        setSelected(updated); setNotice('Biblioteca atualizada.');
      } else {
        const created = await createLibrary(draft);
        setSelected(created); setPage('detail'); setNotice('Biblioteca criada.');
      }
      setEditing(false); await refresh();
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }

  function requestCloseEditor() {
    if (isDirty) setPendingClose(true); else setEditing(false);
  }

  async function closeEditor(choice: 'save' | 'discard' | 'continue') {
    setPendingClose(false);
    if (choice === 'continue') return;
    if (choice === 'discard') { setEditing(false); return; }
    const form = document.querySelector<HTMLFormElement>('#library-form');
    form?.requestSubmit();
  }

  async function removeLibrary(item: Library) {
    setBusy(true); setError('');
    try { await moveLibraryToTrash(item); setPage('libraries'); setSelected(null); setNotice(`“${item.name}” foi movida para a lixeira.`); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }

  async function restore(id: string) {
    setBusy(true); setError('');
    try { await restoreLibrary(id); setNotice('Biblioteca restaurada.'); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }

  async function permanentlyDelete(item: Library) {
    setBusy(true); setError('');
    try { await deleteLibraryPermanently(item.id, deleteName); setDeleteName(''); setNotice('Biblioteca excluída definitivamente.'); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  }

  async function chooseImage(file?: File) {
    if (!file) return;
    setError('');
    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    if (!accepted.includes(file.type)) { setError('Selecione uma imagem JPEG, PNG ou WebP.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('A imagem deve ter no máximo 10 MiB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setDraft((old) => ({ ...old, imageDataUrl: String(reader.result), removeImage: false }));
    reader.onerror = () => setError('Não foi possível ler o arquivo selecionado.');
    reader.readAsDataURL(file);
  }

  const shownImage = draft.imageDataUrl ?? (editing ? editing.imageDataUrl : null);

  if (busy && !runtime && !error) return <main className="loading" role="status">Preparando sua biblioteca…</main>;
  if (readOnly) return <main className="startup-error"><section><p className="kicker">ARMAZENAMENTO INDISPONÍVEL</p><h1>Não foi possível abrir seus dados</h1><p>{error}</p><p>A aplicação iniciou em modo somente leitura para proteger os dados existentes. Feche e abra novamente; se o problema continuar, compartilhe o código de correlação com o suporte.</p><button className="secondary-button" onClick={() => window.location.reload()}>Tentar novamente</button></section></main>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">✦</span><span>Biblioteca de<br />Monstros</span></div>
      <nav aria-label="Navegação principal">
        <button className={page !== 'trash' ? 'nav-item active' : 'nav-item'} onClick={() => { setPage('libraries'); setSelected(null); }}>▦ <span>Bibliotecas</span><b>{libraries.length}</b></button>
        <button className={page === 'trash' ? 'nav-item active' : 'nav-item'} onClick={() => { setPage('trash'); setSelected(null); }}>▤ <span>Lixeira</span><b>{trash.length}</b></button>
      </nav>
      <div className="sidebar-foot"><span className="status-dot" /> Armazenamento local<br /><small>{runtime?.environment === 'desktop' ? 'Seus dados ficam neste dispositivo' : 'Modo de demonstração no navegador'}</small></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><span>BESTIÁRIO · {page === 'trash' ? 'LIXEIRA' : page === 'detail' ? 'BIBLIOTECA' : 'COLEÇÃO'}</span><span className="avatar">✦</span></header>
      {error && !editing && <div className="alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Fechar">×</button></div>}
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Fechar">×</button></div>}

      {page === 'libraries' && !selected && <section className="page-section">
        <div className="page-heading"><div><p className="kicker">SEU ACERVO</p><h1>Bibliotecas</h1><p className="subtitle">Organize seus monstros por sistema e campanha.</p></div><button className="primary-button" disabled={readOnly} onClick={beginCreate}>＋ <span>Nova biblioteca</span></button></div>
        {libraries.length === 0 ? <div className="empty-state"><div className="empty-icon">♧</div><h2>Seu bestiário começa aqui</h2><p>Crie uma biblioteca para reunir fichas de monstros de AD&D 2ª Edição ou Shadowlords 3E.</p><button className="primary-button" disabled={readOnly} onClick={beginCreate}>Criar primeira biblioteca</button></div> : <div className="library-grid">{libraries.map((item) => <button className="library-card" key={item.id} onClick={() => { setSelected(item); setPage('detail'); }}>
          <div className="card-cover">{item.imageDataUrl ? <img src={item.imageDataUrl} alt="" /> : <span aria-hidden="true">♧</span>}<span className="card-count">{item.activeMonsterCount} monstros</span></div>
          <div className="card-info"><span className="system-label">{item.systemName}</span><h2>{item.name}</h2><span className="card-open">Abrir biblioteca <span aria-hidden="true">↗</span></span></div>
        </button>)}</div>}
      </section>}

      {page === 'detail' && selected && <section className="page-section">
        <button className="back-link" onClick={() => { setSelected(null); setPage('libraries'); }}>← Voltar às bibliotecas</button>
        <div className="detail-banner">{selected.imageDataUrl ? <img src={selected.imageDataUrl} alt="" /> : <span aria-hidden="true">♧</span>}</div>
        <div className="detail-heading"><div><span className="system-label">{selected.systemName}</span><h1>{selected.name}</h1><p className="subtitle">{selected.activeMonsterCount} monstros ativos · {selected.totalMonsterCount} no total</p></div><div className="detail-actions"><button className="secondary-button" disabled={readOnly} onClick={() => beginEdit(selected)}>Editar biblioteca</button><button className="danger-button" disabled={readOnly} onClick={() => void removeLibrary(selected)}>Remover</button></div></div>
        <div className="coming-panel"><span>✦</span><h2>Nenhum monstro nesta biblioteca</h2><p>O cadastro de monstros será habilitado na próxima etapa.</p></div>
      </section>}

      {page === 'trash' && <section className="page-section">
        <div className="page-heading"><div><p className="kicker">RECUPERAÇÃO</p><h1>Lixeira</h1><p className="subtitle">Bibliotecas removidas podem ser restauradas por até 30 dias.</p></div></div>
        {trash.length === 0 ? <div className="empty-state compact"><div className="empty-icon">▤</div><h2>A lixeira está vazia</h2><p>Bibliotecas removidas aparecerão aqui.</p></div> : <div className="trash-list">{trash.map((item) => <article className="trash-row" key={item.id}><div className="mini-cover">{item.imageDataUrl ? <img src={item.imageDataUrl} alt="" /> : '♧'}</div><div className="trash-name"><h2>{item.name}</h2><span>{item.systemName} · expira em {item.purgeAfter ? new Date(item.purgeAfter).toLocaleDateString('pt-BR') : '—'}</span></div><button className="secondary-button" disabled={readOnly} onClick={() => void restore(item.id)}>Restaurar</button><button className="danger-button" disabled={readOnly} onClick={() => { setSelected(item); setDeleteName(''); }}>Excluir definitivamente</button></article>)}</div>}
      </section>}

      {busy && <div className="busy-indicator" role="status">Salvando…</div>}
    </main>

    {editing !== false && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestCloseEditor(); }}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="library-dialog-title">
      <button className="dialog-close" onClick={requestCloseEditor} aria-label="Fechar">×</button><p className="kicker">{editing ? 'CONFIGURAÇÃO' : 'NOVO ACERVO'}</p><h2 id="library-dialog-title">{editing ? 'Editar biblioteca' : 'Nova biblioteca'}</h2><p className="dialog-copy">Escolha um nome, um sistema de regras e, se quiser, uma capa.</p>
      <form id="library-form" onSubmit={(event) => void submitForm(event)}>
        <label>Nome da biblioteca<input autoFocus required maxLength={120} value={draft.name} onChange={(event) => setDraft((old) => ({ ...old, name: event.target.value }))} placeholder="Ex.: Criaturas das Terras Sombrias" /></label>
        <label>Sistema<select value={draft.systemCode} disabled={!!editing?.totalMonsterCount} onChange={(event) => setDraft((old) => ({ ...old, systemCode: event.target.value as SystemCode }))}><option value="add2e">AD&D 2ª Edição</option><option value="shadowlords3e">Shadowlords Mini System 3E</option></select></label>
        {editing?.totalMonsterCount ? <small className="field-hint">O sistema fica bloqueado depois da inclusão de monstros.</small> : null}
        <div className="cover-picker"><div className="cover-preview">{shownImage && !draft.removeImage ? <img src={shownImage} alt="Prévia da capa" /> : <span>♧</span>}</div><div><strong>Capa da biblioteca</strong><p>JPEG, PNG ou WebP · até 10 MiB</p><label className="upload-button">{shownImage && !draft.removeImage ? 'Trocar imagem' : 'Escolher imagem'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseImage(event.target.files?.[0])} /></label>{editing?.imageDataUrl && !draft.removeImage && <button type="button" className="remove-image" onClick={() => setDraft((old) => ({ ...old, imageDataUrl: null, removeImage: true }))}>Remover capa</button>}</div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={requestCloseEditor}>Cancelar</button><button className="primary-button" disabled={busy || readOnly}>{editing ? 'Salvar alterações' : 'Criar biblioteca'}</button></div>
      </form>
    </section></div>}

    {pendingClose && <div className="modal-backdrop"><section className="dialog small-dialog" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title"><h2 id="unsaved-title">Alterações não salvas</h2><p>Deseja salvar as alterações antes de sair?</p><div className="dialog-actions"><button className="secondary-button" onClick={() => void closeEditor('continue')}>Continuar editando</button><button className="danger-button" onClick={() => void closeEditor('discard')}>Descartar</button><button className="primary-button" onClick={() => void closeEditor('save')}>Salvar</button></div></section></div>}

    {page === 'trash' && selected && <div className="modal-backdrop"><section className="dialog small-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><button className="dialog-close" onClick={() => setSelected(null)} aria-label="Fechar">×</button><p className="kicker">AÇÃO IRREVERSÍVEL</p><h2 id="delete-title">Excluir biblioteca?</h2><p>Imagens e dados de <strong>{selected.name}</strong> serão removidos definitivamente. Digite o nome exato para confirmar.</p><label>Nome da biblioteca<input autoFocus value={deleteName} onChange={(event) => setDeleteName(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary-button" onClick={() => { setSelected(null); setError(''); }}>Cancelar</button><button className="danger-button" disabled={deleteName !== selected.name || busy} onClick={() => void permanentlyDelete(selected)}>Excluir definitivamente</button></div></section></div>}
  </div>;
}

export { App };
