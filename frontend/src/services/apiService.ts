import type { Note, NoteWrite, Tag } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${options?.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
  }

  // 204 No Content returns no body
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Notes API ────────────────────────────────────────────────────────────────

export const notesApi = {
  /** Fetch all notes, with optional search/tag filters (US-4, US-5). */
  getAll(search?: string, tag?: string): Promise<Note[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tag) params.set('tag', tag);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<Note[]>(`/notes${qs}`);
  },

  getById(id: number): Promise<Note> {
    return request<Note>(`/notes/${id}`);
  },

  create(data: NoteWrite): Promise<Note> {
    return request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: number, data: NoteWrite): Promise<Note> {
    return request<Note>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(id: number): Promise<void> {
    return request<void>(`/notes/${id}`, { method: 'DELETE' });
  },

  getTags(): Promise<Tag[]> {
    return request<Tag[]>('/notes/tags');
  },
};
