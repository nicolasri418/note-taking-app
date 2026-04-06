import React, { useState, useEffect } from 'react';
import type { Note, NoteWrite, TodoItemWrite } from '../types';
import { TodoList } from './TodoList';
import { ExportMenu } from './ExportMenu';

interface Props {
  note: Note | null;       // null = creating a new note
  onSave: (data: NoteWrite) => Promise<void>;
  onDelete?: () => void;
  onCancel: () => void;
}

/**
 * NoteEditor handles both create (US-1) and edit (US-2) flows.
 * - Title / body fields
 * - Tag input: comma-separated or press Enter to add (US-5)
 * - Integrated TodoList component (US-8)
 * - Export menu (US-7) when editing an existing note
 */
export const NoteEditor: React.FC<Props> = ({ note, onSave, onDelete, onCancel }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [todos, setTodos] = useState<TodoItemWrite[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing an existing note
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setTags(note.tags.map((t) => t.name));
      setTodos(
        note.todoItems.flatMap((root) => flattenTodos(root))
      );
    } else {
      setTitle('');
      setBody('');
      setTags([]);
      setTodos([]);
    }
    setError(null);
  }, [note]);

  // Flatten nested TodoItem → TodoItemWrite[]
  const flattenTodos = (item: Note['todoItems'][0]): TodoItemWrite[] => [
    { id: item.id, text: item.text, isCompleted: item.isCompleted, sortOrder: item.sortOrder, parentId: item.parentId },
    ...item.children.flatMap(flattenTodos),
  ];

  // ── Tag management ─────────────────────────────────────────────────────────

  const addTag = (raw: string) => {
    const names = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    setTags((prev) => [...new Set([...prev, ...names])]);
    setTagInput('');
  };

  const removeTag = (name: string) => setTags((prev) => prev.filter((t) => t !== name));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), body, tags, todoItems: todos.filter((t) => t.text.trim() !== '') });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col gap-4 overflow-y-auto p-6"
      aria-label="Note editor"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {note ? 'Edit Note' : 'New Note'}
        </h2>
        <div className="flex items-center gap-2">
          {note && <ExportMenu note={note} />}
          {note && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete note"
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500
                         dark:hover:bg-red-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
                   viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5
                         4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Title ──────────────────────────────────────────────────────── */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
               htmlFor="note-title">
          Title *
        </label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title…"
          maxLength={200}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                     shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2
                     focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800
                     dark:text-gray-100"
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
               htmlFor="note-body">
          Content
        </label>
        <textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note here…"
          className="h-40 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                     shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2
                     focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800
                     dark:text-gray-100"
        />
      </div>

      {/* ── Tags ───────────────────────────────────────────────────────── */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 p-2
                        dark:border-gray-700 dark:bg-gray-800">
          {tags.map((tag) => (
            <span key={tag}
                  className="flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5
                             text-xs font-medium text-indigo-700 dark:bg-indigo-900
                             dark:text-indigo-200">
              #{tag}
              <button type="button" onClick={() => removeTag(tag)}
                      className="text-indigo-400 hover:text-indigo-600">×</button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
            placeholder={tags.length === 0 ? 'Add tags (comma separated)…' : ''}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400
                       dark:text-gray-100 min-w-[120px]"
          />
        </div>
      </div>

      {/* ── Checklist ──────────────────────────────────────────────────── */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Checklist
        </label>
        <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700
                        dark:bg-gray-800">
          <TodoList items={todos} onChange={setTodos} />
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600
                     hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300
                     dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                     shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </form>
  );
};
