import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const load = loader();
const { parseListParams, pageCount, listHref } = load('lib/listParams');
const { activeHref } = load('modules/core/menu');

test('defaults and sanitizing', () => {
  const p = parseListParams({});
  assert.deepEqual([p.page, p.perPage, p.skip, p.take, p.q], [1, 25, 0, 25, '']);
  const bad = parseListParams({ page: '-3', perPage: '9999', q: '  hola  ' });
  assert.deepEqual([bad.page, bad.perPage, bad.q], [1, 25, 'hola']);
  assert.equal(parseListParams({ page: 'abc' }).page, 1);
});

test('page and perPage drive skip/take', () => {
  const p = parseListParams({ page: '3', perPage: '50' });
  assert.deepEqual([p.page, p.skip, p.take], [3, 100, 50]);
  assert.equal(parseListParams({ page: ['2', '5'] }).page, 2);
});

test('filters via get()', () => {
  const p = parseListParams({ area: ' stock ' });
  assert.equal(p.get('area'), 'stock');
  assert.equal(p.get('missing'), '');
});

test('pageCount', () => {
  assert.equal(pageCount(0, 25), 1);
  assert.equal(pageCount(25, 25), 1);
  assert.equal(pageCount(26, 25), 2);
});

test('listHref keeps params, resets page on filter change, drops empties', () => {
  const sp = { q: 'tornillo', page: '3', area: '' };
  assert.equal(listHref('/x', sp, { page: 4 }), '/x?q=tornillo&page=4');
  assert.equal(listHref('/x', sp, { page: 1 }), '/x?q=tornillo');
  assert.equal(listHref('/x', sp, { area: 'stock' }), '/x?q=tornillo&area=stock');
  assert.equal(listHref('/x', sp, { q: null }), '/x');
});

test('activeHref picks the most specific item; "/" only exact', () => {
  const items = [{ href: '/' }, { href: '/stock' }, { href: '/stock/ingresos' }];
  assert.equal(activeHref(items, '/'), '/');
  assert.equal(activeHref(items, '/stock'), '/stock');
  assert.equal(activeHref(items, '/stock/ingresos/nuevo'), '/stock/ingresos');
  assert.equal(activeHref(items, '/stockeo'), null);
});
