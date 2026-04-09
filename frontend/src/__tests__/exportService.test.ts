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

  it('omits tags paragraph when note has no tags', () => {
    const note: Note = { ...mockNote, tags: [] };
    const html = noteToHtml(note);
    expect(html).not.toContain('class="tags"');
  });

  it('omits checklist section when note has no todos', () => {
    const note: Note = { ...mockNote, todoItems: [] };
    const html = noteToHtml(note);
    expect(html).not.toContain('<section>');
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

  it('uses document.createElement by default when no createAnchor is provided', () => {
    const createUrl = jest.fn().mockReturnValue('blob:default');
    const revokeUrl = jest.fn();

    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    // Only 3 args — default _createAnchor executes document.createElement('a')
    exportAsTxt(mockNote, createUrl, revokeUrl);

    expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeUrl).toHaveBeenCalledWith('blob:default');
  });

  it('uses URL.createObjectURL and URL.revokeObjectURL by default when called with only note', () => {
    URL.createObjectURL = jest.fn().mockReturnValue('blob:url-default');
    URL.revokeObjectURL = jest.fn();
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    // No injected args — all three defaults execute
    exportAsTxt(mockNote);

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url-default');
  });

  it('uses "note" as filename when note title sanitizes to empty string', () => {
    const createUrl = jest.fn().mockReturnValue('blob:empty-title');
    const revokeUrl = jest.fn();
    const anchor = { href: '', download: '', click: jest.fn() } as unknown as HTMLAnchorElement;
    const createAnchor = jest.fn().mockReturnValue(anchor);
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    const emptyTitleNote: Note = { ...mockNote, title: '' };
    exportAsTxt(emptyTitleNote, createUrl, revokeUrl, createAnchor);

    expect(anchor.download).toBe('note.txt');
  });
});

// ─── exportAsPdf ─────────────────────────────────────────────────────────────

import { exportAsPdf } from '../services/exportService';

describe('exportAsPdf', () => {
  it('removes the iframe immediately when contentDocument is unavailable', () => {
    const mockIframe = {
      style: { cssText: '' },
      contentDocument: null,
      contentWindow: null,
      onload: null,
    };
    jest.spyOn(document, 'createElement').mockReturnValueOnce(mockIframe as unknown as HTMLIFrameElement);
    const appendChild = jest.spyOn(document.body, 'appendChild').mockReturnValueOnce(mockIframe as any);
    const removeChild = jest.spyOn(document.body, 'removeChild').mockReturnValueOnce(mockIframe as any);

    exportAsPdf(mockNote);

    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();

    appendChild.mockRestore();
    removeChild.mockRestore();
    (document.createElement as jest.Mock).mockRestore?.();
  });

  it('writes HTML to contentDocument and sets up onload', () => {
    const mockDoc = { open: jest.fn(), write: jest.fn(), close: jest.fn() };
    const mockWindow = { print: jest.fn() };
    const mockIframe = {
      style: { cssText: '' },
      contentDocument: mockDoc,
      contentWindow: mockWindow,
      onload: null as unknown as () => void,
    };
    jest.spyOn(document, 'createElement').mockReturnValueOnce(mockIframe as unknown as HTMLIFrameElement);
    const appendChild = jest.spyOn(document.body, 'appendChild').mockReturnValueOnce(mockIframe as any);
    const removeChild = jest.spyOn(document.body, 'removeChild').mockReturnValueOnce(mockIframe as any);
    const contains = jest.spyOn(document.body, 'contains').mockReturnValueOnce(true);

    exportAsPdf(mockNote);

    expect(mockDoc.open).toHaveBeenCalled();
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining('<!DOCTYPE html>'));
    expect(mockDoc.close).toHaveBeenCalled();

    // Fire onload to cover iframe.onload callback
    jest.useFakeTimers();
    mockIframe.onload();
    expect(mockWindow.print).toHaveBeenCalled();
    jest.runAllTimers();
    expect(removeChild).toHaveBeenCalledTimes(1);
    jest.useRealTimers();

    appendChild.mockRestore();
    removeChild.mockRestore();
    contains.mockRestore();
    (document.createElement as jest.Mock).mockRestore?.();
  });
});
