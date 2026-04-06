import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Real-time search input (US-4).
 * The parent hook debounces or sends the value straight to the API.
 */
export const SearchBar: React.FC<Props> = ({ value, onChange }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
           viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
      </svg>
    </span>
    <input
      type="search"
      role="searchbox"
      aria-label="Search notes"
      placeholder="Search notes…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4
                 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2
                 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800
                 dark:text-gray-100 dark:focus:border-indigo-500"
    />
  </div>
);
