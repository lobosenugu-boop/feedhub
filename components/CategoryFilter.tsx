'use client';

import { Category } from '@/lib/types';

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✦' },
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'ai', label: 'AI', emoji: '🤖' },
  { id: 'business', label: 'Business', emoji: '📊' },
  { id: 'marketing', label: 'Marketing', emoji: '📣' },
  { id: 'productivity', label: 'Productivity', emoji: '⚡' },
  { id: 'selfimprovement', label: 'Self-improvement', emoji: '🌱' },
  { id: 'psychology', label: 'Psychology', emoji: '🧠' },
];

interface CategoryFilterProps {
  active: Category;
  onChange: (c: Category) => void;
}

export default function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
            active === cat.id
              ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]'
              : 'bg-white text-[#8a8a9a] border-[#e5ded4] hover:border-[#1a1a2e] hover:text-[#1a1a2e]'
          }`}
        >
          <span>{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
