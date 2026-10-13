import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const { categoryOptions } = loader()('modules/catalog/categories');

test('flat list, alphabetical', () => {
  const rows = [{ id: 'b', name: 'Bijouterie', parentId: null }, { id: 'a', name: 'Accesorios', parentId: null }];
  assert.deepEqual(categoryOptions(rows), [
    { id: 'a', label: 'Accesorios', depth: 0 },
    { id: 'b', label: 'Bijouterie', depth: 0 },
  ]);
});

test('nested: children appear right after their parent, indented', () => {
  const rows = [
    { id: 'ropa', name: 'Ropa', parentId: null },
    { id: 'remeras', name: 'Remeras', parentId: 'ropa' },
    { id: 'pantalones', name: 'Pantalones', parentId: 'ropa' },
    { id: 'manga-corta', name: 'Manga corta', parentId: 'remeras' },
    { id: 'calzado', name: 'Calzado', parentId: null },
  ];
  const out = categoryOptions(rows);
  assert.deepEqual(out.map((o) => o.id), ['calzado', 'ropa', 'pantalones', 'remeras', 'manga-corta']);
  assert.equal(out.find((o) => o.id === 'manga-corta').depth, 2);
  assert.equal(out.find((o) => o.id === 'manga-corta').label, '— — Manga corta');
});

test('orphan parent (another company, or deleted) is treated as root instead of being dropped', () => {
  const rows = [{ id: 'x', name: 'Huérfana', parentId: 'no-existe' }];
  assert.deepEqual(categoryOptions(rows), [{ id: 'x', label: 'Huérfana', depth: 0 }]);
});
