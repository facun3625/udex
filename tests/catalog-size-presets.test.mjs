import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { SIZE_PRESETS, findSizePreset } = loader()('modules/catalog/sizePresets');

test('every preset has a unique key, a label, and at least 2 distinct values', () => {
  const keys = new Set();
  for (const p of SIZE_PRESETS) {
    assert.ok(!keys.has(p.key), `clave repetida: ${p.key}`);
    keys.add(p.key);
    assert.ok(p.label.length > 0);
    assert.ok(p.values.length >= 2, p.key);
    assert.equal(new Set(p.values).size, p.values.length, `valores repetidos en ${p.key}`);
  }
});

test('findSizePreset', () => {
  assert.deepEqual(findSizePreset('ropa_letras')?.values, ['XS', 'S', 'M', 'L', 'XL', 'XXL']);
  assert.equal(findSizePreset('no-existe'), undefined);
});
