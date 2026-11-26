import { useEffect, useMemo, useRef, useState } from 'react';
import { cancelImport, importLibrary, importMonster, inspectPackage, type ImportInspection, type ImportProgress, type ImportReport } from '../infrastructure/portable';
import { buildRenamePreview, phaseLabels } from '../portable/ui-model';

type Props = { mode: 'library' | 'monster'; targetLibraryId?: string; onCancel: () => void; onCompleted: (report: ImportReport) => void };

function sizeLabel(bytes: number): string {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function PortableImportWizard({ mode, targetLibraryId, onCancel, onCompleted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const planIdRef = useRef('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [inspection, setInspection] = useState<ImportInspection | null>(null);
  const [planId, setPlanId] = useState('');
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => inspection ? buildRenamePreview(inspection) : [], [inspection]);

  useEffect(() => () => { if (planIdRef.current) void cancelImport(planIdRef.current); }, []);

  function chooseFile(candidate?: File) {
    if (!candidate) return;
    if (planIdRef.current) void cancelImport(planIdRef.current);
    planIdRef.current = '';
    setFile(candidate);
    setInspection(null);
    setPlanId('');
    setProgress(null);
    setError(candidate.name.toLowerCase().endsWith('.zip') ? '' : 'Selecione um arquivo .zip.');
  }

  async function inspect() {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const result = await inspectPackage(file, targetLibraryId);
      setInspection(result.inspection);
      setPlanId(result.planId);
      planIdRef.current = result.planId;
    } catch (reason) {
      setInspection(null); setPlanId('');
      planIdRef.current = '';
      setError((reason as { message?: string })?.message ?? 'Não foi possível inspecionar o pacote ZIP.');
    } finally { setBusy(false); }
  }

  async function execute() {
    if (!inspection || !planId) return;
    setBusy(true); setError('');
    setProgress({ phase: 'validating-package', completed: null, total: null, message: 'Validando pacote' });
    try {
      const report = mode === 'library'
        ? await importLibrary({ planId, createLibrary: true })
        : await importMonster({ planId, targetLibraryId });
      onCompleted(report);
    } catch (reason) {
      setError((reason as { message?: string })?.message ?? 'A importação não foi concluída.');
      setProgress(null);
    } finally { setBusy(false); }
  }

  const expectedPackageKind = mode;
  const canImport = !!inspection && inspection.packageKind === expectedPackageKind && inspection.errors.length === 0;

  return <section className="dialog portable-import-dialog" role="dialog" aria-modal="true" aria-labelledby="portable-import-title">
    <button type="button" className="dialog-close" onClick={onCancel} aria-label="Fechar" disabled={busy}>×</button>
    <p className="kicker">TRANSFERÊNCIA DE DADOS</p>
    <h2 id="portable-import-title">Importar {mode === 'library' ? 'biblioteca' : 'monstro'}</h2>
    <p className="dialog-copy">Escolha um pacote ZIP do seu computador ou arraste-o para esta área. O conteúdo será validado antes da importação.</p>

    <input ref={inputRef} className="portable-file-input" type="file" accept=".zip,application/zip" aria-label="Selecionar arquivo ZIP" onChange={(event) => chooseFile(event.currentTarget.files?.[0])} />
    <div className={dragging ? 'portable-dropzone dragging' : 'portable-dropzone'} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}>
      <span className="portable-drop-icon" aria-hidden="true">↧</span>
      {file ? <><strong>{file.name}</strong><small>{sizeLabel(file.size)}</small></> : <><strong>Solte o arquivo ZIP aqui</strong><small>ou navegue pelas pastas do computador</small></>}
      <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()} disabled={busy}>Procurar arquivo</button>
    </div>

    {inspection && <div className="portable-inspection" aria-live="polite">
      <div className="portable-inspection-summary"><span>{inspection.systemCode === 'add2e' ? 'AD&D 2ª Edição' : 'Shadowlords Mini System 3E'}</span><strong>{inspection.monsterCount} {inspection.monsterCount === 1 ? 'monstro' : 'monstros'}</strong>{inspection.libraryName && <small>Biblioteca: {inspection.libraryName}</small>}</div>
      {inspection.packageKind !== expectedPackageKind && <p className="form-error" role="alert">Este arquivo contém um pacote de {inspection.packageKind === 'library' ? 'biblioteca' : 'monstro'}; escolha o fluxo de importação correspondente.</p>}
      {inspection.errors.map((message) => <p className="form-error" role="alert" key={message}>{message}</p>)}
      {preview.length > 0 && <div className="portable-preview-table"><table><caption>Nomes que serão criados</caption><thead><tr><th>Nome no pacote</th><th>Nome após importar</th><th>Estado</th></tr></thead><tbody>{preview.map((item, index) => <tr key={`${index}-${item.sourceName}`}><td>{item.sourceName}</td><td>{item.finalName}</td><td>{item.status === 'archived' ? 'Arquivado' : 'Ativo'}</td></tr>)}</tbody></table></div>}
    </div>}

    {progress && <p className="portable-progress" role="status" aria-live="polite">{phaseLabels[progress.phase]}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancelar</button>{!inspection ? <button type="button" className="primary-button" onClick={() => void inspect()} disabled={!file || !!error || busy}>Inspecionar pacote</button> : <button type="button" className="primary-button" onClick={() => void execute()} disabled={!canImport || busy}>Importar</button>}</div>
  </section>;
}
