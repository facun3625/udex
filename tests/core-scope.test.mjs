import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loader } from './helpers/loader.mjs';

const load = loader();
const { resolveScope, accessibleBranches } = load('modules/core/scope');
const { ALL_PERMISSIONS, SYSTEM_ROLES, isPermission, toPermissionSet } = load('modules/core/permissions');

const companies = [{ id: 'c1', active: true }, { id: 'c2', active: true }, { id: 'cOff', active: false }];
const branches = [
  { id: 'b1', companyId: 'c1', active: true },
  { id: 'b2', companyId: 'c1', active: true },
  { id: 'bOff', companyId: 'c1', active: false },
  { id: 'b3', companyId: 'c2', active: true },
  { id: 'b4', companyId: 'cOff', active: true },
];
const base = { isSuperadmin: false, memberships: [], companies, branches, requested: {} };

test('user without memberships has no scope', () => {
  assert.deepEqual(resolveScope(base), { status: 'none' });
});

test('single accessible branch is selected automatically', () => {
  const s = resolveScope({ ...base, memberships: [{ companyId: 'c2', branchId: 'b3', permissions: ['pos.use'] }] });
  assert.equal(s.status, 'ok');
  assert.equal(s.branchId, 'b3');
  assert.equal(s.companyId, 'c2');
  assert.deepEqual([...s.permissions], ['pos.use']);
});

test('company-wide membership covers its active branches only', () => {
  const access = accessibleBranches({ ...base, memberships: [{ companyId: 'c1', branchId: null, permissions: ['stock.view'] }] });
  assert.deepEqual([...access.keys()].sort(), ['b1', 'b2']);
});

test('several options and nothing chosen → choose', () => {
  const s = resolveScope({ ...base, memberships: [{ companyId: 'c1', branchId: null, permissions: [] }] });
  assert.equal(s.status, 'choose');
  assert.equal(s.options.length, 2);
});

test('requested branch is honored only if accessible', () => {
  const memberships = [{ companyId: 'c1', branchId: null, permissions: ['stock.view'] }];
  assert.equal(resolveScope({ ...base, memberships, requested: { branchId: 'b2' } }).branchId, 'b2');
  assert.equal(resolveScope({ ...base, memberships, requested: { branchId: 'b3' } }).status, 'choose');
  assert.equal(resolveScope({ ...base, memberships, requested: { branchId: 'bOff' } }).status, 'choose');
});

test('company-wide and branch memberships add up in that branch', () => {
  const memberships = [
    { companyId: 'c1', branchId: null, permissions: ['stock.view'] },
    { companyId: 'c1', branchId: 'b1', permissions: ['pos.use'] },
  ];
  const s = resolveScope({ ...base, memberships, requested: { branchId: 'b1' } });
  assert.deepEqual([...s.permissions].sort(), ['pos.use', 'stock.view']);
  const s2 = resolveScope({ ...base, memberships, requested: { branchId: 'b2' } });
  assert.deepEqual([...s2.permissions], ['stock.view']);
});

test('unknown permission keys stored in a role are ignored', () => {
  const s = resolveScope({ ...base, memberships: [{ companyId: 'c2', branchId: null, permissions: ['pos.use', 'old.removed'] }] });
  assert.deepEqual([...s.permissions], ['pos.use']);
});

test('superadmin reaches every active branch of active companies with all permissions', () => {
  const access = accessibleBranches({ ...base, isSuperadmin: true });
  assert.deepEqual([...access.keys()].sort(), ['b1', 'b2', 'b3']);
  assert.equal(access.get('b1').size, ALL_PERMISSIONS.length);
});

test('system roles only use catalog permissions and keys are unique', () => {
  const keys = new Set();
  for (const r of SYSTEM_ROLES) {
    assert.ok(!keys.has(r.key), r.key);
    keys.add(r.key);
    for (const p of r.permissions) assert.ok(isPermission(p), `${r.key}: ${p}`);
  }
  assert.equal(toPermissionSet(['x', 'pos.use']).size, 1);
  assert.ok(!SYSTEM_ROLES.find((r) => r.key === 'manager').permissions.includes('fiscal.configure'));
});
