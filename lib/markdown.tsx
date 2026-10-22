import React from 'react';

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={i}><em>{m[2]}</em></strong>);
    else if (m[3]) parts.push(<strong key={i}>{m[3]}</strong>);
    else if (m[4]) parts.push(<em key={i}>{m[4]}</em>);
    else if (m[5]) parts.push(<code key={i} className="bg-[#f5f0e8] px-1 py-0.5 rounded text-xs font-mono text-[#c0392b]">{m[5]}</code>);
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function renderMarkdown(raw: string, compact = false): React.ReactNode {
  const lines = raw.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-[#e5ded4] my-4" />);
      i++; continue;
    }

    // H1
    if (line.startsWith('# ')) {
      nodes.push(<h1 key={i} className="text-lg font-bold text-[#1a1a2e] mt-5 mb-2">{parseInline(line.slice(2))}</h1>);
      i++; continue;
    }

    // H2
    if (line.startsWith('## ')) {
      nodes.push(<h2 key={i} className="text-base font-bold text-[#1a1a2e] mt-5 mb-2 pb-1 border-b border-[#f0ebe3]">{parseInline(line.slice(3))}</h2>);
      i++; continue;
    }

    // H3
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={i} className="text-sm font-bold text-[#1a1a2e] mt-4 mb-1.5">{parseInline(line.slice(4))}</h3>);
      i++; continue;
    }

    // H4
    if (line.startsWith('#### ')) {
      nodes.push(<h4 key={i} className="text-sm font-semibold text-[#3a3a4a] mt-3 mb-1">{parseInline(line.slice(5))}</h4>);
      i++; continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      nodes.push(
        <blockquote key={i} className="border-l-2 border-[#ff6b35] pl-3 text-[#5a5a6a] italic my-2 text-sm">
          {parseInline(line.slice(2))}
        </blockquote>
      );
      i++; continue;
    }

    // Bullet list (-, *, •, ↳, →)
    if (/^(\s*)([-*•]|↳|→)\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^(\s*)([-*•]|↳|→)\s/.test(lines[i])) {
        const content = lines[i].replace(/^(\s*)([-*•]|↳|→)\s/, '');
        const indent = lines[i].match(/^(\s*)/)?.[1].length ?? 0;
        listItems.push(
          <li key={i} className={`text-sm leading-relaxed ${indent > 0 ? 'ml-4' : ''}`}>
            {parseInline(content)}
          </li>
        );
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="space-y-1.5 mb-3 pl-4 list-disc">{listItems}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const content = lines[i].replace(/^\d+\.\s/, '');
        listItems.push(<li key={i} className="text-sm leading-relaxed">{parseInline(content)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="space-y-1.5 mb-3 pl-4 list-decimal">{listItems}</ol>);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++; continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className={`text-sm leading-relaxed ${compact ? 'mb-1.5' : 'mb-3'}`}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}
