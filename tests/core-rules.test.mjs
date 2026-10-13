import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const load = loader();
const { branchLimit, limitReached, normalizeAccesses, keepsPermission, cleanPermissions, roleKeyFromName, generatePassword, MIN_PASSWORD_LENGTH } = load('modules/core/rules');
const { licenseState } = load('modules/core/modules');
const { permissionGroups } = load('modules/core/permissionGroups');
const { ALL_PERMISSIONS } = load('modules/core/permissions');

const lic = (modules, maxBranches = null) => licenseState({ clientName: 'x', plan: 'p', modules, maxCompanies: null, maxBranches, maxUsers: null, expiresAt: null });

test('branch limit: one without multi_branch, license limit with it', () => {
  assert.equal(branchLimit(lic(['pos'], 10)), 1);
  assert.equal(branchLimit(lic(['multi_branch'], 3)), 3);
  assert.equal(branchLimit(lic(['multi_branch'])), null);
  assert.equal(branchLimit(licenseState(null)), null, 'no license configured: unlimited');
});

test('limitReached', () => {
  assert.equal(limitReached(null, 1000), false);
  assert.equal(limitReached(3, 2), false);
  assert.equal(limitReached(3, 3), true);
});

test('normalizeAccesses: one per branch, last wins, empty roles dropped', () => {
  const r = normalizeAccesses([
    { branchId: null, roleId: 'a' },
    { branchId: 'b1', roleId: 'x' },
    { branchId: 'b1', roleId: 'y' },
    { branchId: 'b2', roleId: '' },
  ]);
  assert.deepEqual(r, [{ branchId: null, roleId: 'a' }, { branchId: 'b1', roleId: 'y' }]);
});

test('keepsPermission considers company-wide and branch accesses', () => {
  const roles = new Map([['owner', ['users.manage']], ['cashier', ['pos.use']]]);
  assert.equal(keepsPermission([{ branchId: null, roleId: 'owner' }], roles, 'b1', 'users.manage'), true);
  assert.equal(keepsPermission([{ branchId: 'b2', roleId: 'owner' }], roles, 'b1', 'users.manage'), false);
  assert.equal(keepsPermission([{ branchId: 'b1', roleId: 'cashier' }], roles, 'b1', 'users.manage'), false);
  assert.equal(keepsPermission([], roles, 'b1', 'users.manage'), false);
});

test('cleanPermissions drops unknown and duplicates', () => {
  assert.deepEqual(cleanPermissions(['pos.use', 'pos.use', 'nope']), ['pos.use']);
});

test('roleKeyFromName', () => {
  assert.equal(roleKeyFromName('Encargado de Depósito'), 'custom-encargado-de-deposito');
  assert.equal(roleKeyFromName('!!!'), 'custom-rol');
});

test('generatePassword uses an unambiguous alphabet and the requested length', () => {
  let n = 0;
  const fake = (len) => Uint8Array.from({ length: len }, () => n++);
  const p = generatePassword(fake, 12);
  assert.equal(p.length, 12);
  assert.ok(p.length >= MIN_PASSWORD_LENGTH);
  assert.doesNotMatch(p, /[01lIO]/);
});

test('permission groups cover every permission exactly once', () => {
  const keys = permissionGroups().flatMap((g) => g.items.map((i) => i.key));
  assert.equal(keys.length, ALL_PERMISSIONS.length);
  assert.equal(new Set(keys).size, ALL_PERMISSIONS.length);
});
