import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { generateCombinations, splitNewCombinations, buildVariantSku, combinationKey } = loader()('modules/catalog/variantGenerator');

const talle = { attributeId: 'talle', options: [{ id: 't-s', value: 'S' }, { id: 't-m', value: 'M' }, { id: 't-l', value: 'L' }] };
const color = { attributeId: 'color', options: [{ id: 'c-negro', value: 'Negro' }, { id: 'c-blanco', value: 'Blanco' }] };

test('un solo eje: una combinación por opción', () => {
  const combos = generateCombinations([talle]);
  assert.equal(combos.length, 3);
  assert.deepEqual(combos.map((c) => c.label), ['S', 'M', 'L']);
});

test('dos ejes: producto cartesiano completo, en el orden de los ejes', () => {
  const combos = generateCombinations([talle, color]);
  assert.equal(combos.length, 6);
  assert.deepEqual(combos.map((c) => c.label), ['S · Negro', 'S · Blanco', 'M · Negro', 'M · Blanco', 'L · Negro', 'L · Blanco']);
});

test('el orden de los ejes importa para el label (Talle×Color ≠ Color×Talle)', () => {
  const combos = generateCombinations([color, talle]);
  assert.deepEqual(combos.map((c) => c.label), ['Negro · S', 'Negro · M', 'Negro · L', 'Blanco · S', 'Blanco · M', 'Blanco · L']);
});

test('un eje sin opciones elegidas no genera nada', () => {
  assert.deepEqual(generateCombinations([talle, { attributeId: 'color', options: [] }]), []);
  assert.deepEqual(generateCombinations([]), []);
});

test('skuSuffix arma un código corto y legible por opción', () => {
  const combos = generateCombinations([talle, color]);
  assert.equal(combos[0].skuSuffix, 'S-NEGRO');
  assert.equal(combos[1].skuSuffix, 'S-BLANCO');
});

test('buildVariantSku concatena con el SKU base', () => {
  assert.equal(buildVariantSku('REMERA', 'S-NEGRO'), 'REMERA-S-NEGRO');
});

test('combinationKey no depende del orden de los ids', () => {
  assert.equal(combinationKey(['a', 'b']), combinationKey(['b', 'a']));
  assert.notEqual(combinationKey(['a', 'b']), combinationKey(['a', 'c']));
});

test('splitNewCombinations separa lo que ya existe de lo nuevo', () => {
  const combos = generateCombinations([talle, color]); // 6 combinaciones
  const existing = [['t-s', 'c-negro'], ['t-m', 'c-blanco']]; // 2 ya cargadas (orden distinto, debe matchear igual)
  const { toCreate, alreadyExist } = splitNewCombinations(combos, existing);
  assert.equal(alreadyExist, 2);
  assert.equal(toCreate.length, 4);
  assert.ok(!toCreate.some((c) => c.label === 'S · Negro'));
  assert.ok(!toCreate.some((c) => c.label === 'M · Blanco'));
});

test('splitNewCombinations: nada existente, todo es nuevo', () => {
  const combos = generateCombinations([talle]);
  const { toCreate, alreadyExist } = splitNewCombinations(combos, []);
  assert.equal(alreadyExist, 0);
  assert.equal(toCreate.length, 3);
});
