import { useEffect, useId, useRef, useState } from 'react';
import { formatTreasurePresence, treasureCatalogs, type TreasureCatalog, type TreasureCode } from '../domain/treasure-catalogs';
import { parseTreasureReferences } from '../domain/treasure-references';
import type { MonsterSystemCode } from '../domain/monster-systems';

function TreasureDetails({ catalog, code }: { catalog: TreasureCatalog; code: TreasureCode }) {
  const entry = catalog.entries[code];
  const columns = catalog.columns[entry.scope];
  return <div className="treasure-popover-content">
    <strong>{catalog.scopeLabels[entry.scope]} · Tipo {code}</strong>
    <table><caption>{catalog.title} — tipo {code}</caption><thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
      <tbody><tr><th scope="row">Quantidade</th>{columns.map((column) => {
        const component = entry.components[column.key];
        return <td key={column.key}>{component ? <>{component.amount}<small>{formatTreasurePresence(component.presence)}</small></> : '—'}</td>;
      })}</tr></tbody>
    </table>
  </div>;
}

export function TreasureReferences({ value, systemCode }: { value: string; systemCode: MonsterSystemCode }) {
  const catalog = treasureCatalogs[systemCode];
  const segments = parseTreasureReferences(value);
  const [openCode, setOpenCode] = useState<TreasureCode | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const open = (code: TreasureCode) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setOpenCode(code);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { setOpenCode(null); closeTimer.current = null; }, 180);
  };
  useEffect(() => {
    if (!openCode) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenCode(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [openCode]);
  return <span className="treasure-references">{segments.map((segment, index) => segment.kind === 'text'
    ? <span key={`text-${index}`}>{segment.value}</span>
    : <span className="treasure-reference-wrap" key={`ref-${index}`}>
      <button type="button" className="treasure-reference" aria-expanded={openCode === segment.code} aria-describedby={`${id}-${index}`} onFocus={() => open(segment.code)} onBlur={scheduleClose} onPointerEnter={() => open(segment.code)} onPointerLeave={scheduleClose} onClick={() => setOpenCode((current) => current === segment.code ? null : segment.code)}>
        {segment.code}{segment.multiplier !== null ? ` ×${segment.multiplier}` : ''}
      </button>
      <span id={`${id}-${index}`} role="tooltip" className={`treasure-popover${openCode === segment.code ? ' is-open' : ''}`} onPointerEnter={() => open(segment.code)} onPointerLeave={scheduleClose}><TreasureDetails catalog={catalog} code={segment.code} /></span>
    </span>)}</span>;
}
