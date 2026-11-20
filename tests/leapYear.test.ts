import { describe, it, expect } from 'vitest';
import { isLeapYear } from '../src/leapYear';

describe('isLeapYear', () => {
  it('визнає високосним рік, що ділиться на 4 і не ділиться на 100', () => {
    // Arrange
    const year = 2024;
    // Act
    const result = isLeapYear(year);
    // Assert
    expect(result).toBe(true);
  });

  it('не визнає високосним рік, що не ділиться на 4', () => {
    expect(isLeapYear(2023)).toBe(false);
  });

  it('визнає високосним рік, що ділиться на 400 (межове значення 2000)', () => {
    expect(isLeapYear(2000)).toBe(true);
  });

  it('не визнає високосним століття, що не ділиться на 400 (1900)', () => {
    expect(isLeapYear(1900)).toBe(false);
  });

  it('відхиляє від’ємний рік винятком INVALID_YEAR', () => {
    expect(() => isLeapYear(-4)).toThrow('INVALID_YEAR');
  });

  it('відхиляє нецілий рік винятком INVALID_YEAR', () => {
    expect(() => isLeapYear(2024.5)).toThrow('INVALID_YEAR');
  });

  it('відхиляє NaN і нескінченність винятком INVALID_YEAR', () => {
    expect(() => isLeapYear(NaN)).toThrow('INVALID_YEAR');
    expect(() => isLeapYear(Infinity)).toThrow('INVALID_YEAR');
  });
});
