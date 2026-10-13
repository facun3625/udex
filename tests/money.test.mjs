import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { dec, sum, roundMoney, roundQty, percentOf, isZero, formatMoney, formatQty, parseDecimalInput } =
  loader()('lib/money');

const str = (d) => d.toString();

test('sums without floating point errors', () => {
  assert.equal(str(sum(['0.1', '0.2'])), '0.3');
  assert.equal(str(sum([])), '0');
  assert.equal(str(dec('19.99').times(3)), '59.97');
});

test('accepts other decimal.js instances (Prisma Decimal) via string', () => {
  const foreign = { toString: () => '123.4567' };
  assert.equal(str(dec(foreign)), '123.4567');
});

test('rejects non-finite numbers', () => {
  assert.throws(() => dec(NaN), RangeError);
  assert.throws(() => dec(Infinity), RangeError);
});

test('roundMoney rounds half up to cents', () => {
  assert.equal(roundMoney('2.345').toFixed(2), '2.35');
  assert.equal(roundMoney('2.344').toFixed(2), '2.34');
  assert.equal(roundMoney('-2.345').toFixed(2), '-2.35');
  assert.equal(roundMoney('1.005').toFixed(2), '1.01');
});

test('roundQty respects unit decimals', () => {
  assert.equal(roundQty('0.3456', 3).toString(), '0.346');
  assert.equal(roundQty('2.5', 0).toString(), '3');
});

test('percentOf: IVA 21 % and 10,5 %', () => {
  assert.equal(roundMoney(percentOf('1000', 21)).toFixed(2), '210.00');
  assert.equal(roundMoney(percentOf('99.99', '10.5')).toFixed(2), '10.50');
});

test('isZero', () => {
  assert.equal(isZero('0.0000'), true);
  assert.equal(isZero('-0'), true);
  assert.equal(isZero('0.01'), false);
});

test('formatMoney uses es-AR separators', () => {
  assert.equal(formatMoney('1234.5'), '$ 1.234,50');
  assert.equal(formatMoney('1234567890.125'), '$ 1.234.567.890,13');
  assert.equal(formatMoney('0'), '$ 0,00');
  assert.equal(formatMoney('-10'), '-$ 10,00');
  assert.equal(formatMoney('-0.001'), '$ 0,00');
  assert.equal(formatMoney('99.9', 'USD'), 'US$ 99,90');
});

test('formatQty', () => {
  assert.equal(formatQty('1250', 0), '1.250');
  assert.equal(formatQty('0.35', 3), '0,350');
  assert.equal(formatQty('-0.0001', 3), '0,000');
});

test('parseDecimalInput: Argentine format', () => {
  assert.equal(str(parseDecimalInput('1.234,56')), '1234.56');
  assert.equal(str(parseDecimalInput('0,350')), '0.35');
  assert.equal(str(parseDecimalInput('$ 1.500')), '1500');
  assert.equal(str(parseDecimalInput('12.500.000')), '12500000');
  assert.equal(str(parseDecimalInput('-3,5')), '-3.5');
  assert.equal(str(parseDecimalInput('24')), '24');
});

test('parseDecimalInput: dot as decimal when it cannot be thousands', () => {
  assert.equal(str(parseDecimalInput('1234.56')), '1234.56');
  assert.equal(str(parseDecimalInput('12.5')), '12.5');
  assert.equal(str(parseDecimalInput('0.350')), '0.35');
  assert.equal(str(parseDecimalInput('.5')), '0.5');
});

test('parseDecimalInput: invalid input returns null', () => {
  for (const bad of ['', '   ', 'abc', '1,2,3', '1.23,4.5', '12a', '1..2', '1.2.3']) {
    assert.equal(parseDecimalInput(bad), null, bad);
  }
});
