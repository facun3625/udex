import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { MOVEMENT_TYPE_LABEL } = loader()('modules/inventory/movementTypes');

test('every StockMovementType has a label (keeps the enum and the labels in sync)', () => {
  const types = ['initial', 'purchase_receipt', 'purchase_return', 'sale', 'sale_return', 'adjustment', 'count', 'transfer_out', 'transfer_in', 'kit_assembly', 'kit_disassembly'];
  for (const t of types) assert.ok(MOVEMENT_TYPE_LABEL[t], t);
  assert.equal(Object.keys(MOVEMENT_TYPE_LABEL).length, types.length);
});
