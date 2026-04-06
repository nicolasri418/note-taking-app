import { noteToPlainText, noteToHtml, exportAsTxt } from '../services/exportService';
import type { Note } from '../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockNote: Note = {
  id: 1,
  title: 'Shopping List',
  body: 'Need milk and eggs',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-02T12:00:00Z',
  tags: [{ id: 1, name: 'personal' }],
  todoItems: [
    {
      id: 1,
      text: 'Buy milk',
      isCompleted: true,
      sortOrder: 0,
      parentId: null,
      children: [
        { id: 3, text: 'Whole milk', isCompleted: false, sortOrder: 0, parentId: 1, children: [] },
      ],
    },
    { id: 2, text: 'Buy eggs', isCompleted: false, sortOrder: 1, parentId: null, children: [] },
  ],
};

// ─── noteToPlainText ───────────────────────────────────────────────────────────

describe('noteToPlainText', () => {
  it('includes the note title as a heading', () => {
    const result = noteToPlainText(mockNote);
    expect(result).toContain('# Shopping List');
  });

  it('includes the body text', () => {
    const result = noteToPlainText(mockNote);
    expect(result).toContain('Need milk and eggs');
  });

  it('includes tag names', () => {
    const result = noteToPlainText(mockNote);
    expect(result).toContain('personal');
  });

  it('renders root todo items', () => {
    const result = noteToPlainText(mockNote);
    expect(result).toContain('[x] Buy milk');
    expect(result).toContain('[ ] Buy eggs');
  });

  it('indents nested todo items', () => {
    const result = noteToPlainText(mockNote);
    expect(result).toContain('  [ ] Whole milk');
  });

  it('omits the checklist section when there are no todos', () => {
    const note: Note = { ...mockNote, todoItems: [] };
    const result = noteToPlainText(note);
    expect(result).not.toContain('CHECKLIST');
  });

  it('omits the tags line when there are no tags', () => {
    const note: Note = { ...mockNote, tags: [] };
    const result = noteToPlainText(note);
    expect(result).not.toContain('Tags');
  });
});

// ─── noteToHtml ───────────────────────────────────────────────────────────────

describe('noteToHtml', () => {
  it('contains the note title in an h1', () => {
    const html = noteToHtml(mockNote);
    expect(html).toContain('<h1>Shopping List</h1>');
  });

  it('escapes HTML special characters in title', () => {
    const note: Note = { ...mockNote, title: '<script>alert("xss")</script>' };
    const html = noteToHtml(note);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders completed todos with done class', () => {
    const html = noteToHtml(mockNote);
    expect(html).toContain('class="done"');
  });

  it('renders tag spans', () => {
    const html = noteToHtml(mockNote);
    expect(html).toContain('<span>personal</span>');
  });
});

// ─── exportAsTxt (DOM side-effects) ──────────────────────────────────────────

describe('exportAsTxt', () => {
  it('calls createObjectURL with a Blob', () => {
    const createUrl = jest.fn().mockReturnValue('blob:mock');
    const revokeUrl = jest.fn();
    const anchor = { href: '', download: '', click: jest.fn() } as unknown as HTMLAnchorElement;
    const createAnchor = jest.fn().mockReturnValue(anchor);

    // Minimal DOM stubs
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    exportAsTxt(mockNote, createUrl, revokeUrl, createAnchor);

    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor.download).toBe('Shopping List.txt');
    expect(anchor.click).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalledWith('blob:mock');
  });
});
