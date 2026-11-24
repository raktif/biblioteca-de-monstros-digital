import type { ReactNode } from 'react';

function inline(source: string): ReactNode[] {
  const result: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) result.push(source.slice(cursor, start));
    const token = match[0];
    result.push(token.startsWith('**')
      ? <strong key={`b-${start}`}>{token.slice(2, -2)}</strong>
      : <em key={`i-${start}`}>{token.slice(1, -1)}</em>);
    cursor = start + token.length;
  }
  if (cursor < source.length) result.push(source.slice(cursor));
  return result;
}

function renderBlock(block: string, index: number): ReactNode {
  const lines = block.split('\n');
  if (lines.length === 1 && /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(lines[0])) return <hr key={index} />;
  const heading = /^(#{3,5})\s+(.+)$/.exec(lines[0]);
  if (heading && lines.length === 1) {
    const children = inline(heading[2]);
    if (heading[1].length === 3) return <h3 key={index}>{children}</h3>;
    if (heading[1].length === 4) return <h4 key={index}>{children}</h4>;
    return <h5 key={index}>{children}</h5>;
  }
  if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>)}</ul>;
  if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) return <ol key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>)}</ol>;
  if (lines.every((line) => /^\s*>\s?/.test(line))) return <blockquote key={index}>{lines.map((line, lineIndex) => <p key={lineIndex}>{inline(line.replace(/^\s*>\s?/, ''))}</p>)}</blockquote>;
  return <p key={index}>{lines.flatMap((line, lineIndex) => lineIndex ? [<br key={`br-${lineIndex}`} />, ...inline(line)] : inline(line))}</p>;
}

export function LimitedMarkdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n?/g, '\n').split(/\n{2,}/).filter((block) => block.trim().length > 0);
  return <div className="limited-markdown">{blocks.map(renderBlock)}</div>;
}
