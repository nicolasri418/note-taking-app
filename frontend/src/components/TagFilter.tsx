import React from 'react';
import type { Tag } from '../types';

interface Props {
  tags: Tag[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

/**
 * Sidebar tag-filter panel (US-5).
 * Clicking an already-active tag deselects it (returns to "all notes").
 */
export const TagFilter: React.FC<Props> = ({ tags, activeTag, onSelect }) => (
  <aside className="w-48 shrink-0">
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
      Filter by Tag
    </h2>
    <ul className="space-y-1">
      <li>
        <button
          onClick={() => onSelect(null)}
          className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors
            ${activeTag === null
              ? 'bg-indigo-100 font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
        >
          All notes
        </button>
      </li>
      {tags.map((tag) => (
        <li key={tag.id}>
          <button
            onClick={() => onSelect(activeTag === tag.name ? null : tag.name)}
            aria-pressed={activeTag === tag.name}
            className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors
              ${activeTag === tag.name
                ? 'bg-indigo-100 font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
          >
            # {tag.name}
          </button>
        </li>
      ))}
    </ul>
  </aside>
);
