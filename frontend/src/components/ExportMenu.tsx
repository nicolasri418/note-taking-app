import React, { useState, useRef, useEffect } from 'react';
import type { Note, ExportFormat } from '../types';
import { exportAsTxt, exportAsPdf } from '../services/exportService';

interface Props {
  note: Note;
}

/**
 * Export dropdown (US-7).
 * Renders a small button that opens a menu with Plain Text and PDF options.
 * Closes when the user clicks outside or presses Escape.
 */
export const ExportMenu: React.FC<Props> = ({ note }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleExport = (format: ExportFormat) => {
    setOpen(false);
    if (format === 'txt') exportAsTxt(note);
    else exportAsPdf(note);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Export note"
        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100
                   hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
             viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200
                     bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Export as
          </p>
          {(
            [
              { format: 'txt' as ExportFormat, label: 'Plain Text (.txt)', icon: '📄' },
              { format: 'pdf' as ExportFormat, label: 'PDF (print)', icon: '🖨️' },
            ] as const
          ).map(({ format, label, icon }) => (
            <button
              key={format}
              role="menuitem"
              onClick={() => handleExport(format)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700
                         transition-colors hover:bg-gray-50 dark:text-gray-200
                         dark:hover:bg-gray-700"
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
