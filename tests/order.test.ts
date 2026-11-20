import { describe, it, expect } from 'vitest';
import {
  calcSubtotal,
  calcDiscountRate,
  calcShipping,
  calcOrderTotal,
  splitPayment,
  type OrderItem,
} from '../src/order';

const item = (price: number, qty = 1): OrderItem => ({
  sku: 'SKU-1',
  price,
  qty,
});

describe('calcSubtotal', () => {
  it('підсумовує вартість позицій з урахуванням кількості', () => {
    // Arrange
    const items = [item(100, 2), { sku: 'SKU-2', price: 50, qty: 3 }];
    // Act
    const result = calcSubtotal(items);
    // Assert
    expect(result).toBe(350);
  });

  it('відхиляє порожнє замовлення', () => {
    expect(() => calcSubtotal([])).toThrow('EMPTY_ORDER');
  });

  it('відхиляє від’ємну ціну', () => {
    expect(() => calcSubtotal([item(-1)])).toThrow('NEGATIVE_PRICE');
  });

  it('відхиляє ціну −0.01 (межа мінус один)', () => {
    expect(() => calcSubtotal([item(-0.01)])).toThrow('NEGATIVE_PRICE');
  });

  it('приймає нульову ціну', () => {
    expect(calcSubtotal([item(0)])).toBe(0);
  });

  it('приймає кількість 1 (найменша допустима)', () => {
    expect(calcSubtotal([item(100, 1)])).toBe(100);
  });

  it.each([0, -1, 1.5])('відхиляє кількість %s', (qty) => {
    expect(() => calcSubtotal([item(100, qty)])).toThrow('INVALID_QTY');
  });
});

describe('calcDiscountRate', () => {
  it.each([
    { tier: 'basic' as const, subtotal: 500, expected: 0 },
    { tier: 'silver' as const, subtotal: 500, expected: 0.05 },
    { tier: 'gold' as const, subtotal: 500, expected: 0.1 },
    { tier: 'basic' as const, subtotal: 2000, expected: 0.05 },
    { tier: 'gold' as const, subtotal: 2000, expected: 0.15 },
  ])(
    'рівень $tier із сумою $subtotal дає ставку $expected',
    ({ tier, subtotal, expected }) => {
      expect(calcDiscountRate(tier, subtotal)).toBeCloseTo(expected, 4);
    },
  );

  it.each([
    { subtotal: 1999, expected: 0 },
    { subtotal: 2000, expected: 0.05 },
    { subtotal: 2001, expected: 0.05 },
  ])('межа великого замовлення: $subtotal', ({ subtotal, expected }) => {
    expect(calcDiscountRate('basic', subtotal)).toBeCloseTo(expected, 4);
  });

  it.each([
    { promo: 0.09, expected: 0.24 },
    { promo: 0.1, expected: 0.25 },
    { promo: 0.15, expected: 0.25 },
  ])(
    'сумарна ставка з промокодом $promo (gold, 2000) дає $expected',
    ({ promo, expected }) => {
      expect(calcDiscountRate('gold', 2000, promo)).toBeCloseTo(expected, 4);
    },
  );

  it('обмежує сумарну знижку максимальним значенням', () => {
    expect(calcDiscountRate('gold', 2000, 0.5)).toBe(0.25);
  });

  it('відхиляє від’ємний промокод', () => {
    expect(() => calcDiscountRate('basic', 500, -0.1)).toThrow('INVALID_PROMO');
  });
});

describe('calcShipping', () => {
  it.each([
    [999, 60],
    [1000, 0],
    [1001, 0],
  ])('сума %i → доставка %i', (amount, expected) => {
    expect(calcShipping(amount)).toBe(expected);
  });
});

describe('calcOrderTotal', () => {
  it('додає доставку до замовлення нижче порога', () => {
    const total = calcOrderTotal([item(500)], 'basic');
    expect(total).toBeCloseTo(560, 2);
  });

  it('не додає доставку, якщо сума після знижки сягає порога', () => {
    // 1200 − 10 % = 1080 ≥ 1000, доставка безкоштовна
    const total = calcOrderTotal([item(1200)], 'gold');
    expect(total).toBeCloseTo(1080, 2);
  });

  it('знижка може опустити суму нижче порога доставки', () => {
    // 1050 − 10 % = 945 < 1000, тому доставка платна
    const total = calcOrderTotal([item(1050)], 'gold');
    expect(total).toBeCloseTo(1005, 2);
  });

  it('не додає доставку, коли сума після знижки рівно 1000', () => {
    // 1250 − 20 % (silver 5 % + промокод 15 %) = 1000
    const total = calcOrderTotal([item(1250)], 'silver', 0.15);
    expect(total).toBeCloseTo(1000, 2);
  });

  it('передає виняток із нижнього рівня', () => {
    expect(() => calcOrderTotal([], 'gold')).toThrow('EMPTY_ORDER');
  });
});

describe('splitPayment (варіант 5)', () => {
  it.each([
    { total: 100, parts: 4, expected: [25, 25, 25, 25] },
    { total: 100, parts: 3, expected: [33.34, 33.33, 33.33] },
    { total: 100, parts: 1, expected: [100] },
    { total: 0.01, parts: 2, expected: [0.01, 0] },
    { total: 0, parts: 3, expected: [0, 0, 0] },
    { total: 10, parts: 6, expected: [1.67, 1.67, 1.67, 1.67, 1.66, 1.66] },
  ])(
    'розбиває $total на $parts частин: $expected',
    ({ total, parts, expected }) => {
      expect(splitPayment(total, parts)).toEqual(expected);
    },
  );

  it.each([
    { total: 100, parts: 3 },
    { total: 0.1, parts: 7 },
    { total: 19.99, parts: 6 },
    { total: 1234.56, parts: 12 },
  ])(
    'сума частин точно дорівнює $total при parts = $parts',
    ({ total, parts }) => {
      const sum = splitPayment(total, parts).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(total, 2);
    },
  );

  it('повертає рівно parts елементів', () => {
    expect(splitPayment(500, 7)).toHaveLength(7);
  });

  it('частини відрізняються не більше ніж на одну копійку', () => {
    const shares = splitPayment(100, 7);
    expect(Math.max(...shares) - Math.min(...shares)).toBeCloseTo(0.01, 2);
  });

  it('приймає parts = 1 (межа)', () => {
    expect(splitPayment(42.5, 1)).toEqual([42.5]);
  });

  it.each([0, -1, -10])(
    'відхиляє parts = %s винятком INVALID_PARTS',
    (parts) => {
      expect(() => splitPayment(100, parts)).toThrow('INVALID_PARTS');
    },
  );

  it('відхиляє дробове parts винятком INVALID_PARTS', () => {
    expect(() => splitPayment(100, 2.5)).toThrow('INVALID_PARTS');
  });

  it.each([-0.01, NaN, Infinity])(
    'відхиляє суму %s винятком INVALID_TOTAL',
    (total) => {
      expect(() => splitPayment(total, 2)).toThrow('INVALID_TOTAL');
    },
  );
});
