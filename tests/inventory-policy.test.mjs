import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { allowsNegativeStock, shouldWarnOnNegative } = loader()('modules/inventory/policy');

test('block: rejects negative, no warning flag', () => {
  assert.equal(allowsNegativeStock('block'), false);
  assert.equal(shouldWarnOnNegative('block'), false);
});

test('warn: allows negative but flags a warning', () => {
  assert.equal(allowsNegativeStock('warn'), true);
  assert.equal(shouldWarnOnNegative('warn'), true);
});

test('allow: allows negative, no warning', () => {
  assert.equal(allowsNegativeStock('allow'), true);
  assert.equal(shouldWarnOnNegative('allow'), false);
});
