'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { BoardItem } from '@/lib/board-items';

export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
}

function makeNode(text = ''): MindMapNode {
  return { id: crypto.randomUUID(), text, children: [] };
}

export function parseMindMap(json: string): MindMapNode | null {
  try { return JSON.parse(json) as MindMapNode; } catch { return null; }
}

// ── Layout ────────────────────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId?: string;
  depth: number;
}

const RADII = [0, 140, 240, 320, 390];

function computeLayout(root: MindMapNode, cx = 300, cy = 300): LayoutNode[] {
  const result: LayoutNode[] = [];

  function place(
    node: MindMapNode,
    depth: number,
    startAngle: number,
    endAngle: number,
    px: number,
    py: number,
    parentId?: string,
  ) {
    let x = cx, y = cy;
    if (depth > 0) {
      const mid = (startAngle + endAngle) / 2;
      const r = RADII[Math.min(depth, RADII.length - 1)];
      x = cx + Math.cos(mid) * r;
      y = cy + Math.sin(mid) * r;
    }
    result.push({ id: node.id, text: node.text, x, y, parentId, depth });

    if (node.children.length) {
      const spread = depth === 0 ? Math.PI * 2 : Math.min((endAngle - startAngle) * 0.85, (Math.PI * 2) / (node.children.length + 0.5));
      const totalSpread = spread * node.children.length;
      const base = depth === 0 ? 0 : (startAngle + endAngle) / 2 - totalSpread / 2;
      node.children.forEach((child, i) => {
        place(child, depth + 1, base + spread * i, base + spread * (i + 1), x, y, node.id);
      });
    }
  }

  place(root, 0, 0, Math.PI * 2, cx, cy);
  return result;
}

// ── SVG Canvas ────────────────────────────────────────────────────────────────

const COLORS = ['#ff6b35', '#6b8cff', '#2ec4b6', '#e040fb', '#ff9f1c', '#06d6a0', '#ef476f', '#118ab2'];

interface CanvasProps {
  root: MindMapNode;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onDoubleClick: (id: string) => void;
  size?: number;
  mini?: boolean;
}

function MindMapCanvas({ root, selectedId, editingId, onSelect, onDoubleClick, size = 600, mini = false }: CanvasProps) {
  const cx = size / 2, cy = size / 2;
  const layout = computeLayout(root, cx, cy);
  const byId = Object.fromEntries(layout.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    >
      {/* Connection lines */}
      {layout.filter((n) => n.parentId).map((n) => {
        const p = byId[n.parentId!];
        if (!p) return null;
        return (
          <line
            key={`line-${n.id}`}
            x1={p.x} y1={p.y}
            x2={n.x} y2={n.y}
            stroke="#d4cec6"
            strokeWidth={mini ? 1 : 1.5}
            strokeLinecap="round"
          />
        );
      })}

      {/* Nodes */}
      {layout.map((n) => {
        const color = n.depth === 0 ? '#1a1a2e' : COLORS[(n.depth - 1) % COLORS.length];
        const isRoot = n.depth === 0;
        const isSelected = n.id === selectedId && !mini;
        const isEditing = n.id === editingId && !mini;
        const r = isRoot ? (mini ? 22 : 36) : mini ? 16 : 28;
        const fontSize = isRoot ? (mini ? 6 : 11) : mini ? 5 : 10;
        const words = n.text.split(' ');
        const lines: string[] = [];
        let cur = '';
        const maxChars = isRoot ? 12 : 10;
        words.forEach((w) => {
          if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur.trim()); cur = w; }
          else cur = (cur + ' ' + w).trim();
        });
        if (cur) lines.push(cur);
        const lineH = fontSize + 2;
        const totalH = lines.length * lineH;

        return (
          <g
            key={n.id}
            onClick={(e) => { e.stopPropagation(); if (!mini) onSelect(n.id); }}
            onDoubleClick={(e) => { e.stopPropagation(); if (!mini) onDoubleClick(n.id); }}
            className={mini ? '' : 'cursor-pointer'}
          >
            <circle
              cx={n.x} cy={n.y} r={r}
              fill={isRoot ? color : 'white'}
              stroke={isSelected || isEditing ? '#ff6b35' : isRoot ? color : color + '80'}
              strokeWidth={isSelected || isEditing ? (mini ? 1.5 : 2.5) : mini ? 1 : 1.5}
            />
            {lines.map((line, i) => (
              <text
                key={i}
                x={n.x}
                y={n.y - totalH / 2 + i * lineH + lineH * 0.75}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={isRoot ? '700' : '500'}
                fill={isRoot ? 'white' : color}
                style={{ pointerEvents: 'none', fontFamily: 'system-ui, sans-serif' }}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Tree outline editor ───────────────────────────────────────────────────────

interface TreeEditorProps {
  root: MindMapNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (root: MindMapNode) => void;
}

function findNode(root: MindMapNode, id: string): MindMapNode | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function cloneTree(node: MindMapNode): MindMapNode {
  return { ...node, children: node.children.map(cloneTree) };
}

function removeNode(root: MindMapNode, id: string): MindMapNode {
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== id)
      .map((c) => removeNode(c, id)),
  };
}

function addChildTo(root: MindMapNode, parentId: string, child: MindMapNode): MindMapNode {
  if (root.id === parentId) return { ...root, children: [...root.children, child] };
  return { ...root, children: root.children.map((c) => addChildTo(c, parentId, child)) };
}

function updateText(root: MindMapNode, id: string, text: string): MindMapNode {
  if (root.id === id) return { ...root, text };
  return { ...root, children: root.children.map((c) => updateText(c, id, text)) };
}

function TreeNode({
  node, depth, selectedId, onSelect, onChange, root,
}: {
  node: MindMapNode; depth: number; selectedId: string | null;
  onSelect: (id: string) => void; onChange: (root: MindMapNode) => void; root: MindMapNode;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(node.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function save() {
    setEditing(false);
    if (val.trim()) onChange(updateText(root, node.id, val.trim()));
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div
        className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer ${
          selectedId === node.id ? 'bg-[#fff3ee]' : 'hover:bg-[#f5f0e8]'
        }`}
        onClick={() => onSelect(node.id)}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: depth === 0 ? '#1a1a2e' : COLORS[(depth - 1) % COLORS.length] }}
        />

        {editing ? (
          <input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setVal(node.text); } }}
            className="flex-1 text-sm text-[#1a1a2e] bg-transparent outline-none border-b border-[#ff6b35]"
          />
        ) : (
          <span className="flex-1 text-sm text-[#1a1a2e] truncate">{node.text || <em className="text-[#aaa]">Untitled</em>}</span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setVal(node.text); setEditing(true); }}
            className="p-0.5 rounded hover:bg-[#ffe0d4] text-[#8a8a9a] hover:text-[#ff6b35]"
          >
            <Pencil size={10} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const child = makeNode('New idea');
              onChange(addChildTo(root, node.id, child));
              onSelect(child.id);
            }}
            className="p-0.5 rounded hover:bg-[#ffe0d4] text-[#8a8a9a] hover:text-[#ff6b35]"
          >
            <Plus size={10} />
          </button>
          {depth > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(removeNode(root, node.id)); onSelect(root.id); }}
              className="p-0.5 rounded hover:bg-red-50 text-[#8a8a9a] hover:text-red-500"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>

      {node.children.map((c) => (
        <TreeNode key={c.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onChange={onChange} root={root} />
      ))}
    </div>
  );
}

// ── Main Editor Modal ─────────────────────────────────────────────────────────

interface Props {
  boardId: string;
  existingItem?: BoardItem;
  onClose: () => void;
  onSave: (item: BoardItem) => void;
}

export default function MindMapEditor({ boardId, existingItem, onClose, onSave }: Props) {
  const existing = existingItem?.content ? parseMindMap(existingItem.content) : null;
  const [root, setRoot] = useState<MindMapNode>(
    existing ?? makeNode('Central Topic'),
  );
  const [selectedId, setSelectedId] = useState<string | null>(root.id);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleSave() {
    const item: BoardItem = {
      id: existingItem?.id ?? crypto.randomUUID(),
      boardId,
      type: 'mindmap',
      title: root.text,
      content: JSON.stringify(root),
      createdAt: existingItem?.createdAt ?? new Date().toISOString(),
    };
    onSave(item);
  }

  const branchCount = (n: MindMapNode): number => n.children.reduce((s, c) => s + 1 + branchCount(c), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0ebe3] shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#1a1a2e] flex items-center justify-center text-white text-xs font-bold">M</div>
          <div className="flex-1">
            <h2 className="font-semibold text-[#1a1a2e] text-sm">{existingItem ? 'Edit Mind Map' : 'New Mind Map'}</h2>
            <p className="text-[11px] text-[#8a8a9a]">{branchCount(root)} branches</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#ff6b35] text-white text-sm font-medium hover:bg-[#e85a24] transition-colors"
          >
            <Check size={14} />
            Save
          </button>
          <button onClick={onClose} className="text-[#8a8a9a] hover:text-[#1a1a2e] transition-colors ml-1">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: tree editor */}
          <div className="w-64 border-r border-[#f0ebe3] flex flex-col overflow-hidden shrink-0">
            <div className="px-3 py-2 border-b border-[#f0ebe3] flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#8a8a9a] uppercase tracking-wider">Structure</span>
              <button
                onClick={() => {
                  const child = makeNode('New branch');
                  setRoot((r) => addChildTo(r, r.id, child));
                  setSelectedId(child.id);
                }}
                className="flex items-center gap-1 text-[11px] text-[#ff6b35] hover:text-[#e85a24] font-medium"
              >
                <Plus size={11} /> Branch
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <TreeNode
                node={root}
                depth={0}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={setRoot}
                root={root}
              />
            </div>
          </div>

          {/* Right: canvas */}
          <div
            className="flex-1 bg-[#fafaf8] flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setSelectedId(null)}
          >
            <div className="w-full h-full max-w-[600px] max-h-[600px]">
              <MindMapCanvas
                root={root}
                selectedId={selectedId}
                editingId={editingId}
                onSelect={setSelectedId}
                onDoubleClick={setEditingId}
              />
            </div>
          </div>
        </div>

        {/* Hint bar */}
        <div className="px-5 py-2 border-t border-[#f0ebe3] shrink-0 flex items-center gap-4">
          <span className="text-[10px] text-[#aaa]">Hover a node in the tree to <strong>Edit</strong>, <strong>Add child</strong>, or <strong>Delete</strong></span>
        </div>
      </div>
    </div>
  );
}

// ── Mini preview (used in MindMapCard) ────────────────────────────────────────

export function MindMapPreview({ root }: { root: MindMapNode }) {
  return (
    <MindMapCanvas
      root={root}
      selectedId={null}
      editingId={null}
      onSelect={() => {}}
      onDoubleClick={() => {}}
      size={300}
      mini
    />
  );
}
