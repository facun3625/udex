import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { ADJUSTMENT_REASONS, isAdjustmentReason } = loader()('modules/inventory/adjustmentReasons');

test('isAdjustmentReason only accepts the known keys', () => {
  for (const key of Object.keys(ADJUSTMENT_REASONS)) assert.ok(isAdjustmentReason(key), key);
  assert.equal(isAdjustmentReason('rotura'), false);
  assert.equal(isAdjustmentReason(''), false);
});
