import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodoList } from '../components/TodoList';
import type { TodoItemWrite } from '../types';

const rootItem: TodoItemWrite = {
  id: 1,
  text: 'Root task',
  isCompleted: false,
  sortOrder: 0,
  parentId: null,
};

const childItem: TodoItemWrite = {
  id: 2,
  text: 'Child task',
  isCompleted: true,
  sortOrder: 0,
  parentId: 1,
};

describe('TodoList', () => {
  it('renders root todo items', () => {
    render(<TodoList items={[rootItem]} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('Root task')).toBeInTheDocument();
  });

  it('renders child todo items indented under parent', () => {
    render(<TodoList items={[rootItem, childItem]} onChange={jest.fn()} />);
    expect(screen.getByDisplayValue('Root task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Child task')).toBeInTheDocument();
  });

  it('renders "Add task" button', () => {
    render(<TodoList items={[]} onChange={jest.fn()} />);
    expect(screen.getByText('Add task')).toBeInTheDocument();
  });

  it('calls onChange with a new root item when "Add task" is clicked', () => {
    const onChange = jest.fn();
    render(<TodoList items={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Add task'));
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ parentId: null, isCompleted: false }),
      ])
    );
  });

  it('calls onChange toggling isCompleted when checkbox is clicked', () => {
    const onChange = jest.fn();
    render(<TodoList items={[rootItem]} onChange={onChange} />);
    const checkbox = screen.getAllByLabelText('Toggle todo')[0];
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, isCompleted: true }),
      ])
    );
  });

  it('calls onChange with updated text when the user edits a task', () => {
    const onChange = jest.fn();
    render(<TodoList items={[rootItem]} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Root task'), { target: { value: 'Updated task' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, text: 'Updated task' }),
      ])
    );
  });

  it('renders completed items with line-through styling', () => {
    const completedItem: TodoItemWrite = { ...rootItem, isCompleted: true };
    render(<TodoList items={[completedItem]} onChange={jest.fn()} />);
    const input = screen.getByDisplayValue('Root task');
    expect(input.className).toContain('line-through');
  });

  it('renders an empty list with no item inputs', () => {
    render(<TodoList items={[]} onChange={jest.fn()} />);
    expect(screen.queryByLabelText('Todo text')).not.toBeInTheDocument();
  });
});
