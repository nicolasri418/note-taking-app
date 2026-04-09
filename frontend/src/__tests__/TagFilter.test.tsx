import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TagFilter } from '../components/TagFilter';
import type { Tag } from '../types';

const tags: Tag[] = [
  { id: 1, name: 'work' },
  { id: 2, name: 'personal' },
];

describe('TagFilter', () => {
  it('renders "All notes" button', () => {
    render(<TagFilter tags={tags} activeTag={null} onSelect={jest.fn()} />);
    expect(screen.getByText('All notes')).toBeInTheDocument();
  });

  it('renders all tag names', () => {
    render(<TagFilter tags={tags} activeTag={null} onSelect={jest.fn()} />);
    expect(screen.getByText('# work')).toBeInTheDocument();
    expect(screen.getByText('# personal')).toBeInTheDocument();
  });

  it('calls onSelect with null when "All notes" is clicked', () => {
    const onSelect = jest.fn();
    render(<TagFilter tags={tags} activeTag="work" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('All notes'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('calls onSelect with the tag name when a tag is clicked', () => {
    const onSelect = jest.fn();
    render(<TagFilter tags={tags} activeTag={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('# work'));
    expect(onSelect).toHaveBeenCalledWith('work');
  });

  it('deselects the active tag by calling onSelect(null) when the active tag is clicked again', () => {
    const onSelect = jest.fn();
    render(<TagFilter tags={tags} activeTag="work" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('# work'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the active tag button with aria-pressed true', () => {
    render(<TagFilter tags={tags} activeTag="personal" onSelect={jest.fn()} />);
    const personalBtn = screen.getByText('# personal').closest('button');
    expect(personalBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks inactive tag buttons with aria-pressed false', () => {
    render(<TagFilter tags={tags} activeTag="personal" onSelect={jest.fn()} />);
    const workBtn = screen.getByText('# work').closest('button');
    expect(workBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders an empty list when no tags exist', () => {
    render(<TagFilter tags={[]} activeTag={null} onSelect={jest.fn()} />);
    expect(screen.getByText('All notes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /# / })).not.toBeInTheDocument();
  });
});
