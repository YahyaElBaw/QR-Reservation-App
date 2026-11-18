import test from 'node:test';
import assert from 'node:assert/strict';

// Simple unit tests for Cart calculations and invariants
interface CartTestItem {
  product: { _id: string; price: number; name: string };
  quantity: number;
}

function calculateTotal(items: CartTestItem[]): number {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

function calculateCount(items: CartTestItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

test('cart calculations compute total amounts and count correctly', () => {
  const items: CartTestItem[] = [
    { product: { _id: '1', price: 12.5, name: 'Burger' }, quantity: 2 },
    { product: { _id: '2', price: 4.0, name: 'Soda' }, quantity: 3 },
  ];

  assert.equal(calculateCount(items), 5);
  assert.equal(calculateTotal(items), 37.0);
});

test('cart handles empty list', () => {
  const items: CartTestItem[] = [];
  assert.equal(calculateCount(items), 0);
  assert.equal(calculateTotal(items), 0);
});
