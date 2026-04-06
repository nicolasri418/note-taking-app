import { useState, useEffect, useCallback } from 'react';
import type { Note, NoteWrite, NoteFilters, Tag } from '../types';
import { notesApi } from '../services/apiService';

/**
 * useNotes — central data hook for the note-taking app.
 *
 * Responsibilities:
 *  - Fetch and cache notes/tags from the API (US-3, US-5)
 *  - Expose CRUD operations (US-1, US-2)
 *  - Apply search and tag filters locally for instant feedback (US-4, US-5)
 *  - Persist last-used notes to localStorage for offline fallback (US-6)
 */
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<NoteFilters>({ search: '', tag: null });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Persistence helpers (US-6) ─────────────────────────────────────────────
  const LOCAL_KEY = 'note_app_cache';

  const saveToLocalStorage = (data: Note[]) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {
      // Storage quota exceeded — silently ignore
    }
  };

  const loadFromLocalStorage = (): Note[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as Note[]) : [];
    } catch {
      return [];
    }
  };

  // ── Fetch notes from API ───────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedNotes, fetchedTags] = await Promise.all([
        notesApi.getAll(filters.search || undefined, filters.tag ?? undefined),
        notesApi.getTags(),
      ]);
      setNotes(fetchedNotes);
      setTags(fetchedTags);
      saveToLocalStorage(fetchedNotes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      // Fall back to cached data so the user isn't left with an empty screen
      const cached = loadFromLocalStorage();
      if (cached.length > 0) setNotes(cached);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // ── CRUD operations ────────────────────────────────────────────────────────

  const createNote = useCallback(async (data: NoteWrite): Promise<Note> => {
    const note = await notesApi.create(data);
    setNotes((prev) => [note, ...prev]);
    saveToLocalStorage([note, ...notes]);
    return note;
  }, [notes]);

  const updateNote = useCallback(async (id: number, data: NoteWrite): Promise<Note> => {
    const updated = await notesApi.update(id, data);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    saveToLocalStorage(notes.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, [notes]);

  const deleteNote = useCallback(async (id: number): Promise<void> => {
    await notesApi.delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    saveToLocalStorage(notes.filter((n) => n.id !== id));
  }, [notes]);

  // ── Filter helpers ─────────────────────────────────────────────────────────

  const setSearch = useCallback((search: string) => {
    setFilters((f) => ({ ...f, search }));
  }, []);

  const setTagFilter = useCallback((tag: string | null) => {
    setFilters((f) => ({ ...f, tag }));
  }, []);

  return {
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
    refresh: fetchNotes,
  };
}
