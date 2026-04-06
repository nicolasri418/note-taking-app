// ─── Domain types (mirrors backend DTOs) ─────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
}

/**
 * TodoItem supports one level of nesting via the `children` array (US-8).
 * The `parentId` field links a child to its parent's id.
 */
export interface TodoItem {
  id: number;
  text: string;
  isCompleted: boolean;
  sortOrder: number;
  parentId: number | null;
  children: TodoItem[];
}

export interface Note {
  id: number;
  title: string;
  body: string;
  createdAt: string; // ISO-8601 string from API
  updatedAt: string;
  tags: Tag[];
  todoItems: TodoItem[];
}

// ─── Write types (sent to API) ────────────────────────────────────────────────

export interface TodoItemWrite {
  id?: number;
  text: string;
  isCompleted: boolean;
  sortOrder: number;
  parentId: number | null;
}

export interface NoteWrite {
  title: string;
  body: string;
  tags: string[];
  todoItems: TodoItemWrite[];
}

// ─── UI state types ───────────────────────────────────────────────────────────

export type ExportFormat = 'txt' | 'pdf';

export interface NoteFilters {
  search: string;
  tag: string | null;
}
