/**
 * Export Service (US-7)
 * ─────────────────────
 * Provides two export strategies for a single Note:
 *
 *  1. exportAsTxt  — builds a plain-text representation and triggers a file download.
 *  2. exportAsPdf  — uses the browser's window.print() mechanism via a hidden iframe
 *                    styled for print, keeping the bundle lightweight (no PDF lib needed).
 *
 * Both functions are pure (no side-effects beyond DOM/window) and are fully unit-testable
 * by injecting mock implementations of the browser APIs.
 */

import type { Note, TodoItem } from '../types';

// ─── Plain-text export ────────────────────────────────────────────────────────

/**
 * Converts a Note to a plain-text string.
 * Exported separately so it can be tested without DOM.
 */
export function noteToPlainText(note: Note): string {
  const lines: string[] = [
    `# ${note.title}`,
    `Created : ${new Date(note.createdAt).toLocaleString()}`,
    `Updated : ${new Date(note.updatedAt).toLocaleString()}`,
  ];

  if (note.tags.length > 0) {
    lines.push(`Tags    : ${note.tags.map((t) => t.name).join(', ')}`);
  }

  lines.push('', '─'.repeat(60), '', note.body);

  if (note.todoItems.length > 0) {
    lines.push('', '─'.repeat(60), '', 'CHECKLIST');
    appendTodoLines(lines, note.todoItems, 0);
  }

  return lines.join('\n');
}

/** Recursively renders the todo tree into indented text lines. */
function appendTodoLines(
  lines: string[],
  items: TodoItem[],
  depth: number
): void {
  const indent = '  '.repeat(depth);
  for (const item of items) {
    const check = item.isCompleted ? '[x]' : '[ ]';
    lines.push(`${indent}${check} ${item.text}`);
    if (item.children.length > 0) {
      appendTodoLines(lines, item.children, depth + 1);
    }
  }
}

/**
 * Triggers a browser download of `content` as a `.txt` file.
 * The `createObjectURL` + anchor click pattern is used so no server round-trip is needed.
 */
export function exportAsTxt(
  note: Note,
  /* Injected in tests */ _createUrl = URL.createObjectURL,
  _revokeUrl = URL.revokeObjectURL,
  _createAnchor = (): HTMLAnchorElement => document.createElement('a')
): void {
  const text = noteToPlainText(note);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = _createUrl(blob);

  const a = _createAnchor();
  a.href = url;
  a.download = `${sanitizeFilename(note.title)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  _revokeUrl(url);
}

// ─── PDF export ───────────────────────────────────────────────────────────────

/** Returns an HTML string suitable for printing as a styled PDF page. */
export function noteToHtml(note: Note): string {
  const tagsHtml =
    note.tags.length > 0
      ? `<p class="tags">Tags: ${note.tags.map((t) => `<span>${escapeHtml(t.name)}</span>`).join(' ')}</p>`
      : '';

  const todoHtml =
    note.todoItems.length > 0
      ? `<section><h2>Checklist</h2>${renderTodoHtml(note.todoItems)}</section>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(note.title)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #222; }
    h1   { font-size: 1.8rem; margin-bottom: 4px; }
    .meta{ color: #666; font-size: 0.85rem; margin-bottom: 8px; }
    .tags span { background: #e5e7eb; border-radius: 4px; padding: 2px 8px;
                 margin-right: 4px; font-size: 0.8rem; }
    .body{ white-space: pre-wrap; margin-top: 16px; }
    ul   { list-style: none; padding-left: 20px; }
    li   { margin: 4px 0; }
    li.done { text-decoration: line-through; color: #888; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(note.title)}</h1>
  <p class="meta">Created: ${new Date(note.createdAt).toLocaleString()}&nbsp;|&nbsp;Updated: ${new Date(note.updatedAt).toLocaleString()}</p>
  ${tagsHtml}
  <div class="body">${escapeHtml(note.body)}</div>
  ${todoHtml}
</body>
</html>`;
}

/**
 * Opens a hidden iframe, writes the styled HTML into it, and triggers window.print().
 * The iframe is removed after printing (or after a 1-second timeout as fallback).
 */
export function exportAsPdf(note: Note): void {
  const html = noteToHtml(note);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;left:-9999px';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 1000);
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-. ]/gi, '_').trim() || 'note';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTodoHtml(items: TodoItem[]): string {
  const lis = items
    .map((item) => {
      const cls = item.isCompleted ? 'done' : '';
      const check = item.isCompleted ? '&#10003;' : '&#9634;';
      const nested = item.children.length > 0 ? renderTodoHtml(item.children) : '';
      return `<li class="${cls}">${check} ${escapeHtml(item.text)}${nested}</li>`;
    })
    .join('');
  return `<ul>${lis}</ul>`;
}
