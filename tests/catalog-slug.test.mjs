import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { slugify } = loader()('modules/catalog/slug');

test('slugify: accents, case, separators', () => {
  assert.equal(slugify('Remera Básica Niño'), 'remera-basica-nino');
  assert.equal(slugify('  Tornillo 1/2" x 3 '), 'tornillo-1-2-x-3');
  assert.equal(slugify('Café & Té'), 'cafe-te');
  assert.equal(slugify('---'), '');
});
