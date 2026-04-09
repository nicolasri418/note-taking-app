import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportMenu } from '../components/ExportMenu';
import * as exportService from '../services/exportService';
import type { Note } from '../types';

const mockNote: Note = {
  id: 1,
  title: 'Test Note',
  body: 'Body text',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: [],
  todoItems: [],
};

describe('ExportMenu', () => {
  it('renders the export toggle button', () => {
    render(<ExportMenu note={mockNote} />);
    expect(screen.getByTitle('Export note')).toBeInTheDocument();
  });

  it('does not show the menu initially', () => {
    render(<ExportMenu note={mockNote} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu when the toggle button is clicked', () => {
    render(<ExportMenu note={mockNote} />);
    fireEvent.click(screen.getByTitle('Export note'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows Plain Text and PDF menu items when open', () => {
    render(<ExportMenu note={mockNote} />);
    fireEvent.click(screen.getByTitle('Export note'));
    expect(screen.getByText(/Plain Text/)).toBeInTheDocument();
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
  });

  it('calls exportAsTxt and closes the menu when Plain Text is selected', () => {
    const spy = jest.spyOn(exportService, 'exportAsTxt').mockImplementation(() => {});
    render(<ExportMenu note={mockNote} />);
    fireEvent.click(screen.getByTitle('Export note'));
    fireEvent.click(screen.getByText(/Plain Text/));
    expect(spy).toHaveBeenCalledWith(mockNote);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('calls exportAsPdf and closes the menu when PDF is selected', () => {
    const spy = jest.spyOn(exportService, 'exportAsPdf').mockImplementation(() => {});
    render(<ExportMenu note={mockNote} />);
    fireEvent.click(screen.getByTitle('Export note'));
    fireEvent.click(screen.getByText(/PDF/));
    expect(spy).toHaveBeenCalledWith(mockNote);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it('closes the menu when Escape is pressed', () => {
    render(<ExportMenu note={mockNote} />);
    fireEvent.click(screen.getByTitle('Export note'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes the menu when clicking outside', () => {
    render(
      <div>
        <ExportMenu note={mockNote} />
        <button>Outside</button>
      </div>
    );
    fireEvent.click(screen.getByTitle('Export note'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('sets aria-expanded to true when the menu is open', () => {
    render(<ExportMenu note={mockNote} />);
    const btn = screen.getByTitle('Export note');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('sets aria-expanded to false when the menu is closed', () => {
    render(<ExportMenu note={mockNote} />);
    const btn = screen.getByTitle('Export note');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});
