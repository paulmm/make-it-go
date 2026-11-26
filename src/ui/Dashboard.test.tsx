// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { loadClassroomCode, saveClassroomCode } from '../classroom';

// The dashboard is the one screen a grown-up reads, so it is where a teacher's classroom code
// is entered, seen, and removed. Every level plays without one; the section only ever adds.

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('Dashboard — classroom code', () => {
  it('invites teachers and points at the teacher page when no code is set', () => {
    render(<Dashboard onClose={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Teachers' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /how to get one/i }).getAttribute('href')).toBe('/teachers/');
  });

  it('stores a typed code and shows it', () => {
    render(<Dashboard onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Classroom code'), { target: { value: 'istek-7k2m' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use code' }));
    expect(loadClassroomCode()).toBe('ISTEK-7K2M');
    expect(screen.getByRole('heading', { name: 'Classroom code' })).toBeTruthy();
    expect(screen.getByText('ISTEK-7K2M')).toBeTruthy();
  });

  it('explains a rejected code without storing it', () => {
    render(<Dashboard onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Classroom code'), { target: { value: 'no way!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use code' }));
    expect(loadClassroomCode()).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/letters, digits and dashes/i);
  });

  it('removes a stored code', () => {
    saveClassroomCode('ISTEK-7K2M');
    render(<Dashboard onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove code' }));
    expect(loadClassroomCode()).toBeNull();
    expect(screen.getByRole('heading', { name: 'Teachers' })).toBeTruthy();
  });
});
