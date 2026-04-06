import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotes } from '../hooks/useNotes';
import { notesApi } from '../services/apiService';
import type { Note, Tag } from '../types';

// Mock the API module
jest.mock('../services/apiService');
const mockApi = notesApi as jest.Mocked<typeof notesApi>;

const sampleNote: Note = {
  id: 1,
  title: 'Test',
  body: 'Body',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: [],
  todoItems: [],
};

const sampleTag: Tag = { id: 1, name: 'work' };

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockApi.getAll.mockResolvedValue([sampleNote]);
  mockApi.getTags.mockResolvedValue([sampleTag]);
});

describe('useNotes', () => {
  it('fetches notes and tags on mount', async () => {
    const { result } = renderHook(() => useNotes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.tags).toHaveLength(1);
  });

  it('sets isLoading to true while fetching', async () => {
    // Delay resolution so we can observe the loading state
    mockApi.getAll.mockImplementation(
      () => new Promise((res) => setTimeout(() => res([sampleNote]), 50))
    );

    const { result } = renderHook(() => useNotes());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('stores error message when API fails', async () => {
    mockApi.getAll.mockRejectedValue(new Error('Network error'));
    mockApi.getTags.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toContain('Network error');
  });

  it('falls back to localStorage when API fails', async () => {
    localStorage.setItem('note_app_cache', JSON.stringify([sampleNote]));
    mockApi.getAll.mockRejectedValue(new Error('offline'));
    mockApi.getTags.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.notes).toHaveLength(1);
  });

  it('createNote adds note to the list', async () => {
    const newNote = { ...sampleNote, id: 2, title: 'New' };
    mockApi.create.mockResolvedValue(newNote);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createNote({ title: 'New', body: '', tags: [], todoItems: [] });
    });

    expect(result.current.notes.some((n) => n.id === 2)).toBe(true);
  });

  it('updateNote replaces the note in the list', async () => {
    const updated = { ...sampleNote, title: 'Updated' };
    mockApi.update.mockResolvedValue(updated);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateNote(1, { title: 'Updated', body: '', tags: [], todoItems: [] });
    });

    expect(result.current.notes[0].title).toBe('Updated');
  });

  it('deleteNote removes the note from the list', async () => {
    mockApi.delete.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteNote(1);
    });

    expect(result.current.notes).toHaveLength(0);
  });

  it('setSearch triggers a new fetch with the search param', async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setSearch('keyword'));

    await waitFor(() => expect(mockApi.getAll).toHaveBeenCalledWith('keyword', undefined));
  });

  it('setTagFilter triggers a new fetch with the tag param', async () => {
    const { result } = renderHook(() => useNotes());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setTagFilter('work'));

    await waitFor(() => expect(mockApi.getAll).toHaveBeenCalledWith(undefined, 'work'));
  });
});
