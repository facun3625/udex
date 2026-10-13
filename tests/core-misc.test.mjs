import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const load = loader();
const { isValidCuit, normalizeCuit, formatCuit, cuitCheckDigit } = load('modules/core/cuit');
const { createLoginThrottle, MAX_FAILURES, LOCK_MS } = load('lib/loginThrottle');

test('CUIT validation (real check digits)', () => {
  assert.equal(isValidCuit('30-50001091-2'), true); // CUIT público conocido (YPF)
  assert.equal(isValidCuit('20-12345678-6'), true);
  assert.equal(isValidCuit('20-12345678-5'), false);
  assert.equal(isValidCuit('2012345678'), false);
  assert.equal(isValidCuit('abc'), false);
  assert.equal(cuitCheckDigit('3071234567'), 1);
});

test('CUIT normalize and format', () => {
  assert.equal(normalizeCuit('30-71234567-1'), '30712345671');
  assert.equal(normalizeCuit(' 30.712.345.671 '), '30712345671');
  assert.equal(formatCuit('30712345671'), '30-71234567-1');
});

test('login throttle locks after max failures and unlocks after the window', () => {
  let now = 0;
  const t = createLoginThrottle(() => now);
  for (let i = 0; i < MAX_FAILURES - 1; i++) t.fail('a@b.c');
  assert.equal(t.isLocked('a@b.c'), false);
  t.fail('a@b.c');
  assert.equal(t.isLocked('a@b.c'), true);
  assert.equal(t.isLocked('otro@b.c'), false);
  now += LOCK_MS + 1;
  assert.equal(t.isLocked('a@b.c'), false);
  t.fail('a@b.c');
  assert.equal(t.isLocked('a@b.c'), false, 'counter restarted');
});

test('successful login resets failures', () => {
  const t = createLoginThrottle(() => 0);
  for (let i = 0; i < MAX_FAILURES - 1; i++) t.fail('x');
  t.succeed('x');
  t.fail('x');
  assert.equal(t.isLocked('x'), false);
});
