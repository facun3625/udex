import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { normalizeBarcode, gs1CheckDigit, isValidGs1Barcode, upcaToEan13, generateInternalEan13, scanQuantity, INTERNAL_BARCODE_PREFIX } =
  loader()('modules/catalog/barcodeFormat');

test('normalizeBarcode strips control chars and trims', () => {
  assert.equal(normalizeBarcode('7501234567890\n'), '7501234567890');
  assert.equal(normalizeBarcode('  7501234567890\t'), '7501234567890');
  assert.equal(normalizeBarcode('750\x001234567890'), '7501234567890');
});

test('gs1CheckDigit: verified reference codes', () => {
  // ISBN-13 978-0-306-40615-7 (ejemplo de la especificación, dígito verificador documentado: 7)
  assert.equal(gs1CheckDigit('978030640615'), 7);
  // GTIN-13 de ejemplo de la propia especificación GS1 General: 6291041500213 (verificador: 3)
  assert.equal(gs1CheckDigit('629104150021'), 3);
});

test('isValidGs1Barcode accepts valid EAN-13/UPC-A and rejects bad check digits', () => {
  assert.equal(isValidGs1Barcode('9780306406157'), true); // ISBN-13 completo
  assert.equal(isValidGs1Barcode('9780306406158'), false); // mismo código, verificador mal
  assert.equal(isValidGs1Barcode('6291041500213'), true); // GTIN-13 de ejemplo de GS1
  assert.equal(isValidGs1Barcode('not-a-barcode'), false);
  assert.equal(isValidGs1Barcode('12345'), false); // ni 8 ni 12 ni 13 dígitos
});

test('isValidGs1Barcode: EAN-8 and UPC-A built from the same checksum', () => {
  // Armamos un EAN-8 y un UPC-A válidos a partir del propio gs1CheckDigit (no hay un código real
  // "de memoria" confiable para estos dos formatos) y confirmamos que isValidGs1Barcode los acepta.
  const ean8Data = '4006381';
  const ean8 = ean8Data + gs1CheckDigit(ean8Data);
  assert.equal(isValidGs1Barcode(ean8), true);
  assert.equal(isValidGs1Barcode(ean8Data + ((Number(ean8[7]) + 1) % 10)), false);

  const upcData = '03600029145';
  const upc = upcData + gs1CheckDigit(upcData);
  assert.equal(isValidGs1Barcode(upc), true);
});

test('upcaToEan13 pads with a leading zero, leaves others untouched', () => {
  assert.equal(upcaToEan13('036000291452'), '0036000291452');
  assert.equal(upcaToEan13('7501001123107'), '7501001123107');
  assert.equal(upcaToEan13('ABC123'), 'ABC123');
});

test('generateInternalEan13 is deterministic, valid, and uses the reserved prefix', () => {
  const a = generateInternalEan13(42);
  const b = generateInternalEan13(42);
  assert.equal(a, b);
  assert.equal(a.length, 13);
  assert.ok(a.startsWith(INTERNAL_BARCODE_PREFIX));
  assert.equal(isValidGs1Barcode(a), true);
  assert.notEqual(generateInternalEan13(43), a);
});

test('generateInternalEan13 rejects out-of-range sequences', () => {
  assert.throws(() => generateInternalEan13(-1), RangeError);
  assert.throws(() => generateInternalEan13(1.5), RangeError);
  assert.throws(() => generateInternalEan13(10_000_000_000), RangeError);
});

test('scanQuantity multiplies the barcode factor by the typed multiplier', () => {
  assert.equal(scanQuantity(1).toString(), '1');
  assert.equal(scanQuantity(12).toString(), '12'); // código de la caja x12, escaneo simple
  assert.equal(scanQuantity(12, 3).toString(), '36'); // 3 cajas de 12
  assert.equal(scanQuantity('0.35').toString(), '0.35'); // producto por peso con factor fraccionario
});
