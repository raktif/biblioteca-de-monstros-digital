import { useEffect, useMemo, useRef, useState } from 'react';
import { cancelImport, importPackageBatch, inspectPackage, type ImportInspection, type ImportProgress, type ImportReport } from '../infrastructure/portable';
import { buildRenamePreview, phaseLabels } from '../portable/ui-model';

type Props = { mode: 'library' | 'monster'; targetLibraryId?: string; onCancel: () => void; onCompleted: (report: ImportReport) => void };
type PackageRow = { id: string; file: File; selected: boolean; inspection?: ImportInspection; planId?: string; error?: string };
function sizeLabel(bytes: number): string { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`; }

export function PortableImportWizard({ mode, targetLibraryId, onCancel, onCompleted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const plansRef = useRef<string[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = packages.filter((item) => item.selected);
  const allSelected = packages.length > 0 && selected.length === packages.length;
  const canImport = selected.length > 0 && selected.every((item) => !!item.planId && !!item.inspection && item.inspection.packageKind === mode && !item.error && item.inspection.errors.length === 0);
  const previews = useMemo(() => packages.filter((item) => item.selected && item.inspection).flatMap((item) => buildRenamePreview(item.inspection!).map((preview) => ({ ...preview, fileName: item.file.name }))), [packages]);
  useEffect(() => () => { for (const id of plansRef.current) void cancelImport(id); }, []);

  function chooseFiles(selection: FileList | File[]) {
    const files = Array.from(selection);
    if (!files.length) return;
    for (const id of plansRef.current) void cancelImport(id);
    plansRef.current = [];
    setPackages(files.map((file) => ({ id: crypto.randomUUID(), file, selected: true, ...(!file.name.toLowerCase().endsWith('.zip') ? { error: 'O arquivo não tem extensão .zip.' } : {}) })));
    setProgress(null); setError('');
  }
  async function inspect() {
    if (!packages.length || packages.some((item) => item.error)) return;
    setBusy(true); setError('');
    const rows: PackageRow[] = [];
    for (const item of packages) {
      try {
        const result = await inspectPackage(item.file, targetLibraryId);
        plansRef.current.push(result.planId);
        rows.push({ ...item, ...result, selected: true });
      } catch (reason) {
        rows.push({ ...item, selected: true, error: (reason as { message?: string })?.message ?? 'Não foi possível validar este pacote.' });
      }
    }
    setPackages(rows);
    setBusy(false);
  }
  async function execute() {
    if (!canImport) return;
    setBusy(true); setError('');
    setProgress({ phase: 'validating-package', completed: null, total: null, message: 'Validando pacotes' });
    try {
      const report = await importPackageBatch(selected.map((item) => ({ planId: item.planId!, targetLibraryId, createLibrary: mode === 'library' })), mode);
      const usedPlans = new Set(selected.map((item) => item.planId));
      for (const id of plansRef.current) if (!usedPlans.has(id)) void cancelImport(id);
      plansRef.current = [];
      onCompleted(report);
    } catch (reason) {
      for (const id of plansRef.current) void cancelImport(id);
      plansRef.current = [];
      setPackages((current) => current.map((item) => ({ id: item.id, file: item.file, selected: item.selected, ...(!item.file.name.toLowerCase().endsWith('.zip') ? { error: 'O arquivo não tem extensão .zip.' } : {}) })));
      setError((reason as { message?: string })?.message ?? 'A importação falhou. Nenhum pacote do lote foi mantido.');
      setProgress(null);
    } finally { setBusy(false); }
  }
  function removePackages(ids: string[]) {
    const removed = packages.filter((item) => ids.includes(item.id));
    for (const item of removed) if (item.planId) { void cancelImport(item.planId); plansRef.current = plansRef.current.filter((id) => id !== item.planId); }
    setPackages((current) => current.filter((item) => !ids.includes(item.id)));
    setError('');
  }
  function togglePackage(id: string, checked: boolean) { setPackages((current) => current.map((item) => item.id === id ? { ...item, selected: checked } : item)); }
  function toggleAll(checked: boolean) { setPackages((current) => current.map((item) => ({ ...item, selected: checked }))); }

  return <section className="dialog portable-import-dialog" role="dialog" aria-modal="true" aria-labelledby="portable-import-title">
    <button type="button" className="dialog-close" onClick={onCancel} aria-label="Fechar" disabled={busy}>×</button>
    <p className="kicker">TRANSFERÊNCIA DE DADOS</p>
    <h2 id="portable-import-title">Importar {mode === 'library' ? 'bibliotecas' : 'monstros'}</h2>
    <p className="dialog-copy">Escolha vários pacotes ZIP. Confira os erros e remova os pacotes que não deseja importar.</p>
    <input ref={inputRef} className="portable-file-input" type="file" multiple accept=".zip,application/zip" aria-label="Selecionar arquivos ZIP" onChange={(event) => chooseFiles(event.currentTarget.files ?? [])} />
    <div className={dragging ? 'portable-dropzone dragging' : 'portable-dropzone'} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFiles(event.dataTransfer.files); }}>
      <span className="portable-drop-icon" aria-hidden="true">↧</span><strong>Solte arquivos ZIP aqui</strong><small>ou navegue pelas pastas do computador</small>
      <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={busy}>Procurar pacotes</button>
    </div>
    {packages.length > 0 && <div className="portable-package-list"><div className="portable-package-actions"><strong>{packages.length} pacote(s)</strong><button type="button" className="secondary-button" disabled={selected.length < 2 || busy} onClick={() => removePackages(selected.map((item) => item.id))}>Remover todos</button></div><div className="portable-package-scroll"><table className="portable-package-table"><thead><tr><th><input type="checkbox" aria-label="Selecionar todos os pacotes" checked={allSelected} onChange={(event) => toggleAll(event.currentTarget.checked)} /></th><th>Pacote</th><th>Conteúdo e validação</th><th>Ação</th></tr></thead><tbody>{packages.map((item) => <tr key={item.id} className={item.error || item.inspection?.packageKind !== mode ? 'has-error' : ''}>
      <td><input type="checkbox" aria-label={`Selecionar ${item.file.name}`} checked={item.selected} onChange={(event) => togglePackage(item.id, event.currentTarget.checked)} /></td><td><strong>{item.file.name}</strong><small>{sizeLabel(item.file.size)}</small></td><td>{item.error ? <span className="form-error" role="alert">{item.error}</span> : item.inspection ? <><span>{item.inspection.systemCode === 'add2e' ? 'AD&D 2ª Edição' : 'Shadowlords Mini System 3E'} · {item.inspection.monsterCount} monstro(s)</span>{item.inspection.packageKind !== mode && <span className="form-error" role="alert">Tipo de pacote incompatível com este fluxo.</span>}{item.inspection.errors.map((message) => <span className="form-error" role="alert" key={message}>{message}</span>)}</> : <span>Aguardando validação</span>}</td><td><button type="button" className="icon-button package-remove" aria-label={`Remover ${item.file.name}`} title="Remover pacote" disabled={busy} onClick={() => removePackages([item.id])}>🗑</button></td>
    </tr>)}</tbody></table></div></div>}
    {previews.length > 0 && <div className="portable-preview-table"><table><caption>Prévia dos monstros a importar</caption><thead><tr><th>Pacote</th><th>Nome no pacote</th><th>Nome após importar</th><th>Estado</th></tr></thead><tbody>{previews.map((item, index) => <tr key={`${index}-${item.fileName}-${item.sourceName}`}><td>{item.fileName}</td><td>{item.sourceName}</td><td>{item.finalName}</td><td>{item.status === 'archived' ? 'Arquivado' : 'Ativo'}</td></tr>)}</tbody></table></div>}
    {progress && <p className="portable-progress" role="status" aria-live="polite">{phaseLabels[progress.phase]}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancelar</button>{!packages.some((item) => item.inspection) ? <button type="button" className="primary-button" onClick={() => void inspect()} disabled={!packages.length || packages.some((item) => item.error) || busy}>Validar pacotes</button> : <button type="button" className="primary-button" onClick={() => void execute()} disabled={!canImport || busy}>Importar {selected.length} pacote(s)</button>}</div>
  </section>;
}
