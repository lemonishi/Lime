import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const DIRS = [
  '00-Home', '01-Daily',
  '02-Learning/Modules', '02-Learning/Courses',
  '02-Learning/Drills', '02-Learning/Concepts',
  '03-Work', '04-Projects',
  '05-JobSearch/Applications', '05-JobSearch/Companies',
  '06-Money', '07-Reading', '08-Notes', '09-Archive',
  '_assets', '_templates', '_scripts',
];

test('vault skeleton exists', () => {
  for (const d of DIRS) {
    assert.ok(existsSync(d), `missing directory: ${d}`);
  }
});

test('banner image is present', () => {
  assert.ok(existsSync('_assets/home-banner.jpg'), 'missing _assets/home-banner.jpg');
});
