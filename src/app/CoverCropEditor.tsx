import { useRef, useState, type PointerEvent, type CSSProperties, type KeyboardEvent } from 'react';

type Props = {
  image: string;
  aspectRatio: number;
  cropX: number;
  cropY: number;
  onCancel: () => void;
  onSave: (cropX: number, cropY: number) => Promise<void>;
};

export function CoverCropEditor({ image, aspectRatio, cropX: initialX, cropY: initialY, onCancel, onSave }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; cropX: number; cropY: number } | null>(null);
  const [cropX, setCropX] = useState(initialX);
  const [cropY, setCropY] = useState(initialY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const imageStyle = { objectPosition: `${cropX}% ${cropY}%` } as CSSProperties;

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    const imageElement = stage?.querySelector('img');
    if (!imageElement?.naturalWidth || !imageElement.naturalHeight) return;
    event.preventDefault();
    try { stage?.setPointerCapture(event.pointerId); } catch { /* pointer was cancelled */ }
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cropX, cropY };
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const start = dragRef.current;
    const stage = stageRef.current;
    const imageElement = stage?.querySelector('img');
    if (!start || start.pointerId !== event.pointerId || !stage || !imageElement) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const scale = Math.max(width / imageElement.naturalWidth, height / imageElement.naturalHeight);
    const overflowX = Math.max(0, imageElement.naturalWidth * scale - width);
    const overflowY = Math.max(0, imageElement.naturalHeight * scale - height);
    setCropX(Math.max(0, Math.min(100, start.cropX - (overflowX ? (event.clientX - start.x) / overflowX * 100 : 0))));
    setCropY(Math.max(0, Math.min(100, start.cropY - (overflowY ? (event.clientY - start.y) / overflowY * 100 : 0))));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 8 : 2;
    const keys: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const delta = keys[event.key];
    if (!delta) return;
    event.preventDefault();
    setCropX((value) => Math.max(0, Math.min(100, value + delta[0])));
    setCropY((value) => Math.max(0, Math.min(100, value + delta[1])));
  }

  async function save() {
    setSaving(true); setError('');
    try { await onSave(cropX, cropY); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o recorte.'); setSaving(false); }
  }

  return <div className="crop-editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
    <img className="crop-editor-background" src={image} alt="" />
    <section className="crop-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-editor-title">
      <button type="button" className="dialog-close" aria-label="Fechar editor de recorte" onClick={onCancel}>×</button>
      <p className="kicker">CAPA DA BIBLIOTECA</p><h2 id="crop-editor-title">Ajustar recorte</h2>
      <p className="dialog-copy">Arraste a imagem para escolher a área do banner. Use as setas do teclado para ajustar com precisão.</p>
      <div className="crop-editor-stage" ref={stageRef} style={{ aspectRatio }} tabIndex={0} role="application" aria-label="Área do banner. Arraste a imagem ou use as setas para ajustar o recorte." onPointerDown={startDrag} onPointerMove={drag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={nudge}>
        <img src={image} alt="Prévia do recorte da capa" draggable={false} style={imageStyle} />
        <span className="crop-editor-label">Área exibida no banner</span>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>Cancelar</button><button type="button" className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar recorte'}</button></div>
    </section>
  </div>;
}
