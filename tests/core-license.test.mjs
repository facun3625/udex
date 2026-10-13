import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const load = loader();
const { licenseState, daysUntilExpiry, ALL_MODULES } = load('modules/core/modules');
const { visibleMenu, MENU } = load('modules/core/menu');

const NOW = new Date('2026-10-13T12:00:00Z');
const row = (o = {}) => ({ clientName: 'X', plan: 'Base', modules: ['pos'], maxCompanies: null, maxBranches: null, maxUsers: null, expiresAt: null, ...o });

test('no license row: everything enabled, flagged as not configured', () => {
  const s = licenseState(null, NOW);
  assert.equal(s.configured, false);
  assert.equal(s.modules.size, ALL_MODULES.length);
  assert.equal(s.readOnly, false);
});

test('license enables only listed (known) modules', () => {
  const s = licenseState(row({ modules: ['pos', 'fiscal_arca', 'bogus'] }), NOW);
  assert.deepEqual([...s.modules].sort(), ['fiscal_arca', 'pos']);
});

test('expired license is read-only; future expiry is not', () => {
  assert.equal(licenseState(row({ expiresAt: new Date('2026-10-13T11:59:59Z') }), NOW).readOnly, true);
  assert.equal(licenseState(row({ expiresAt: new Date('2026-10-20T00:00:00Z') }), NOW).readOnly, false);
});

test('days until expiry', () => {
  assert.equal(daysUntilExpiry(licenseState(row(), NOW), NOW), null);
  assert.equal(daysUntilExpiry(licenseState(row({ expiresAt: new Date('2026-10-20T12:00:00Z') }), NOW), NOW), 7);
});

test('menu hides items without permission or module', () => {
  const items = visibleMenu(MENU, (p) => p === 'pos.use' || p === 'stock.view', (m) => m !== 'pos');
  const hrefs = items.map((i) => i.href);
  assert.ok(hrefs.includes('/'));
  assert.ok(hrefs.includes('/stock'));
  assert.ok(!hrefs.includes('/caja'), 'pos module not licensed');
  assert.ok(!hrefs.includes('/configuracion'), 'neither settings.manage nor users.manage');
});

test('menu: an item with several permissions is visible with any one of them (OR)', () => {
  const onlyUsers = visibleMenu(MENU, (p) => p === 'users.manage', () => true).map((i) => i.href);
  const onlySettings = visibleMenu(MENU, (p) => p === 'settings.manage', () => true).map((i) => i.href);
  const neither = visibleMenu(MENU, () => false, () => true).map((i) => i.href);
  assert.ok(onlyUsers.includes('/configuracion'));
  assert.ok(onlySettings.includes('/configuracion'));
  assert.ok(!neither.includes('/configuracion'));
});
