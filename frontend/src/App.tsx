import React, { useState, useCallback } from 'react';
import { useNotes } from './hooks/useNotes';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { SearchBar } from './components/SearchBar';
import { TagFilter } from './components/TagFilter';
import type { Note, NoteWrite } from './types';

type EditorMode = 'idle' | 'create' | 'edit';

export default function App() {
  const {
    notes,
    tags,
    filters,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    setSearch,
    setTagFilter,
  } = useNotes();

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('idle');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectNote = useCallback((note: Note) => {
    setSelectedNote(note);
    setEditorMode('edit');
  }, []);

  const handleNewNote = () => {
    setSelectedNote(null);
    setEditorMode('create');
  };

  const handleSave = async (data: NoteWrite) => {
    if (editorMode === 'create') {
      const created = await createNote(data);
      setSelectedNote(created);
      setEditorMode('edit');
    } else if (editorMode === 'edit' && selectedNote) {
      const updated = await updateNote(selectedNote.id, data);
      setSelectedNote(updated);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    if (!window.confirm(`Delete "${selectedNote.title}"?`)) return;
    await deleteNote(selectedNote.id);
    setSelectedNote(null);
    setEditorMode('idle');
  };

  const handleCancel = () => {
    setSelectedNote(null);
    setEditorMode('idle');
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* ── Top Bar ───────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-gray-200
                         bg-white px-6 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none"
               viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2
                     2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <span className="text-lg font-bold text-gray-800 dark:text-gray-100">NoteFlow</span>
        </div>

        <div className="w-72">
          <SearchBar value={filters.search} onChange={setSearch} />
        </div>

        <button
          onClick={handleNewNote}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2
                     text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
               viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          New Note
        </button>
      </header>

      {/* ── Error Banner ──────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="bg-red-50 px-6 py-2 text-sm text-red-600
                                     dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Main Layout ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tag sidebar */}
        <nav className="w-52 shrink-0 overflow-y-auto border-r border-gray-200
                        bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <TagFilter
            tags={tags}
            activeTag={filters.tag}
            onSelect={setTagFilter}
          />
        </nav>

        {/* Note list */}
        <section className="w-80 shrink-0 overflow-y-auto border-r border-gray-200
                            bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <NoteList
            notes={notes}
            selectedId={selectedNote?.id ?? null}
            isLoading={isLoading}
            onSelect={handleSelectNote}
          />
        </section>

        {/* Editor pane */}
        <main className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
          {editorMode === 'idle' ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-gray-400">Select a note or create a new one</p>
              <button
                onClick={handleNewNote}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium
                           text-white hover:bg-indigo-700"
              >
                New Note
              </button>
            </div>
          ) : (
            <NoteEditor
              note={editorMode === 'edit' ? selectedNote : null}
              onSave={handleSave}
              onDelete={editorMode === 'edit' ? handleDelete : undefined}
              onCancel={handleCancel}
            />
          )}
        </main>
      </div>
    </div>
  );
}
