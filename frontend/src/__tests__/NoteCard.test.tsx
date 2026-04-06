import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteCard } from '../components/NoteCard';
import type { Note } from '../types';

const mockNote: Note = {
  id: 1,
  title: 'My Test Note',
  body: 'This is a long body that should be truncated in the preview display of the card component',
  createdAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
  updatedAt: new Date(Date.now() - 60_000).toISOString(),
  tags: [{ id: 1, name: 'work' }, { id: 2, name: 'important' }],
  todoItems: [
    { id: 1, text: 'Task 1', isCompleted: true,  sortOrder: 0, parentId: null, children: [] },
    { id: 2, text: 'Task 2', isCompleted: false, sortOrder: 1, parentId: null, children: [] },
  ],
};

describe('NoteCard', () => {
  it('renders the note title', () => {
    render(<NoteCard note={mockNote} isSelected={false} onSelect={jest.fn()} />);
    expect(screen.getByText('My Test Note')).toBeInTheDocument();
  });

  it('renders all tags', () => {
    render(<NoteCard note={mockNote} isSelected={false} onSelect={jest.fn()} />);
    expect(screen.getByText('#work')).toBeInTheDocument();
    expect(screen.getByText('#important')).toBeInTheDocument();
  });

  it('shows todo progress indicator', () => {
    render(<NoteCard note={mockNote} isSelected={false} onSelect={jest.fn()} />);
    expect(screen.getByText('1/2 done')).toBeInTheDocument();
  });

  it('calls onSelect with the note when clicked', () => {
    const onSelect = jest.fn();
    render(<NoteCard note={mockNote} isSelected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockNote);
  });

  it('applies selected styles when isSelected is true', () => {
    render(<NoteCard note={mockNote} isSelected={true} onSelect={jest.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn.className).toContain('border-indigo-400');
  });

  it('shows "Untitled" when title is empty', () => {
    const note = { ...mockNote, title: '' };
    render(<NoteCard note={note} isSelected={false} onSelect={jest.fn()} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('does not show todo progress when there are no todos', () => {
    const note = { ...mockNote, todoItems: [] };
    render(<NoteCard note={note} isSelected={false} onSelect={jest.fn()} />);
    expect(screen.queryByText(/done/)).not.toBeInTheDocument();
  });
});
