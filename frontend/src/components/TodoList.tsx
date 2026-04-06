import React, { useCallback } from 'react';
import type { TodoItem, TodoItemWrite } from '../types';

interface Props {
  items: TodoItemWrite[];
  onChange: (items: TodoItemWrite[]) => void;
}

/**
 * TodoList (US-8)
 * ───────────────
 * Renders and edits a nested checklist tree. Supports:
 *  - Adding root-level tasks (Add Task button)
 *  - Adding child tasks (indent with Tab, or → button)
 *  - Toggling completion
 *  - Editing text inline
 *  - Deleting a task (and all its children)
 *
 * The component is fully controlled — it calls `onChange` with the complete
 * updated items array whenever the user makes a change.
 *
 * Data shape: flat array where children reference their parent via `parentId`.
 * nextId is used as a temporary client-side key (negative to avoid colliding
 * with server-assigned ids on existing items).
 */

let _nextClientId = -1;
const nextId = () => _nextClientId--;

export const TodoList: React.FC<Props> = ({ items, onChange }) => {
  // ── Helpers ──────────────────────────────────────────────────────────────

  const getRoots = (all: TodoItemWrite[]) =>
    all.filter((i) => i.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);

  const getChildren = (all: TodoItemWrite[], parentId: number) =>
    all.filter((i) => i.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  // ── Mutations ────────────────────────────────────────────────────────────

  const toggle = useCallback(
    (id: number) =>
      onChange(items.map((i) => (i.id === id ? { ...i, isCompleted: !i.isCompleted } : i))),
    [items, onChange]
  );

  const updateText = useCallback(
    (id: number, text: string) =>
      onChange(items.map((i) => (i.id === id ? { ...i, text } : i))),
    [items, onChange]
  );

  const addTask = useCallback(
    (parentId: number | null) => {
      const siblings = parentId === null ? getRoots(items) : getChildren(items, parentId);
      const newItem: TodoItemWrite = {
        id: nextId(),
        text: '',
        isCompleted: false,
        sortOrder: siblings.length,
        parentId,
      };
      onChange([...items, newItem]);
    },
    [items, onChange]
  );

  /** Removes item and all of its descendants recursively. */
  const deleteTask = useCallback(
    (id: number) => {
      const toRemove = new Set<number>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of items) {
          if (item.parentId !== null && toRemove.has(item.parentId) && !toRemove.has(item.id!)) {
            toRemove.add(item.id!);
            changed = true;
          }
        }
      }
      onChange(items.filter((i) => !toRemove.has(i.id!)));
    },
    [items, onChange]
  );

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderItems = (list: TodoItemWrite[], depth = 0): React.ReactNode =>
    list.map((item) => {
      const children = item.id !== undefined ? getChildren(items, item.id!) : [];
      return (
        <div key={item.id} style={{ paddingLeft: depth * 20 }}>
          <div className="flex items-center gap-1 py-0.5 group">
            {/* Completion toggle */}
            <input
              type="checkbox"
              checked={item.isCompleted}
              onChange={() => toggle(item.id!)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400"
              aria-label="Toggle todo"
            />

            {/* Inline text edit */}
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateText(item.id!, e.target.value)}
              placeholder="Task description…"
              className={`flex-1 rounded border-none bg-transparent text-sm outline-none
                focus:bg-gray-50 focus:px-1 dark:focus:bg-gray-700
                ${item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}
              aria-label="Todo text"
            />

            {/* Add child (only one level deep for now) */}
            {depth === 0 && (
              <button
                onClick={() => addTask(item.id!)}
                title="Add sub-task"
                className="hidden text-gray-300 hover:text-indigo-500 group-hover:block"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
                     viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 4v16m8-8H4"/>
                </svg>
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => deleteTask(item.id!)}
              title="Remove task"
              className="hidden text-gray-300 hover:text-red-400 group-hover:block"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Render children recursively */}
          {children.length > 0 && renderItems(children, depth + 1)}
        </div>
      );
    });

  const roots = getRoots(items);

  return (
    <div className="mt-2 space-y-0.5">
      {roots.length > 0 && renderItems(roots)}

      <button
        onClick={() => addTask(null)}
        className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs
                   text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
        </svg>
        Add task
      </button>
    </div>
  );
};
