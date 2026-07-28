import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVersion, compareVersions, satisfiesMinApp } from '../scripts/lib/versions.mjs';

test('parseVersion splits into numbers and tolerates a v prefix', () => {
  assert.deepEqual(parseVersion('1.12.7'), [1, 12, 7]);
  assert.deepEqual(parseVersion('v2.20.6'), [2, 20, 6]);
  assert.deepEqual(parseVersion('0.5.68'), [0, 5, 68]);
});

test('parseVersion pads missing segments with zero', () => {
  assert.deepEqual(parseVersion('1.13'), [1, 13, 0]);
  assert.deepEqual(parseVersion('2'), [2, 0, 0]);
});

test('compareVersions orders numerically, not lexically', () => {
  // the bug this guards: "0.5.68" < "0.5.7" is TRUE as strings, FALSE as versions
  assert.equal(compareVersions('0.5.68', '0.5.7'), 1);
  assert.equal(compareVersions('1.12.7', '1.13.0'), -1);
  assert.equal(compareVersions('1.12.7', '1.12.7'), 0);
  assert.equal(compareVersions('2.20.6', '2.9.4'), 1);
});

test('satisfiesMinApp allows equal and higher app versions', () => {
  assert.equal(satisfiesMinApp('1.12.2', '1.12.7'), true);
  assert.equal(satisfiesMinApp('1.12.7', '1.12.7'), true);
  assert.equal(satisfiesMinApp('1.1.0', '1.12.7'), true);
});

test('satisfiesMinApp blocks plugins that need a newer app', () => {
  // the real constraint: Templater 2.21+ and QuickAdd 2.13+ need 1.13.0
  assert.equal(satisfiesMinApp('1.13.0', '1.12.7'), false);
});

test('satisfiesMinApp treats a missing floor as permissive', () => {
  assert.equal(satisfiesMinApp(undefined, '1.12.7'), true);
  assert.equal(satisfiesMinApp('', '1.12.7'), true);
});
