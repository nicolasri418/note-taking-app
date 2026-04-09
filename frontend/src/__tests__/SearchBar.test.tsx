import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';

describe('SearchBar', () => {
  it('renders the search input', () => {
    render(<SearchBar value="" onChange={jest.fn()} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<SearchBar value="hello" onChange={jest.fn()} />);
    expect(screen.getByRole('searchbox')).toHaveValue('hello');
  });

  it('calls onChange with the new value when the user types', () => {
    const onChange = jest.fn();
    render(<SearchBar value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'groceries' } });
    expect(onChange).toHaveBeenCalledWith('groceries');
  });

  it('calls onChange with empty string when the user clears input', () => {
    const onChange = jest.fn();
    render(<SearchBar value="foo" onChange={onChange} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('has aria-label "Search notes" for accessibility', () => {
    render(<SearchBar value="" onChange={jest.fn()} />);
    expect(screen.getByLabelText('Search notes')).toBeInTheDocument();
  });
});
