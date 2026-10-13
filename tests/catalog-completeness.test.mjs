import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { isProductComplete, missingFields } = loader()('modules/catalog/completeness');

test('isProductComplete: only a positive price counts', () => {
  assert.equal(isProductComplete({ price: '0', categoryId: null }), false);
  assert.equal(isProductComplete({ price: 0, categoryId: 'c1' }), false);
  assert.equal(isProductComplete({ price: '10.50', categoryId: null }), true);
});

test('missingFields lists what is missing, category is not blocking completeness', () => {
  assert.deepEqual(missingFields({ price: '0', categoryId: null }), ['precio', 'categoría']);
  assert.deepEqual(missingFields({ price: '10', categoryId: null }), ['categoría']);
  assert.deepEqual(missingFields({ price: '10', categoryId: 'c1' }), []);
});
