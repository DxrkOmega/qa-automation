/**
 * Повертає true, якщо рік високосний (григоріанський календар).
 * Кидає INVALID_YEAR для нецілих, нескінченних та від’ємних значень.
 */
export function isLeapYear(year: number): boolean {
  if (!Number.isInteger(year) || year < 0) {
    throw new Error('INVALID_YEAR');
  }
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
