import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { satisfiesMinApp } from '../scripts/lib/versions.mjs';

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

test('installed plugins match their pinned versions', () => {
  const cfg = JSON.parse(readFileSync('scripts/plugins.json', 'utf8'));
  for (const p of cfg.plugins) {
    const path = `.obsidian/plugins/${p.id}/manifest.json`;
    assert.ok(existsSync(path), `plugin not installed: ${p.id}`);
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(
      manifest.version, p.pin,
      `PIN DRIFT: ${p.id} is ${manifest.version}, pinned at ${p.pin}. ` +
      `Obsidian's updater probably overwrote it. Re-run: npm run install-plugins`
    );
  }
});

test('no installed plugin requires a newer app than we have', () => {
  const cfg = JSON.parse(readFileSync('scripts/plugins.json', 'utf8'));
  for (const p of cfg.plugins) {
    const manifest = JSON.parse(readFileSync(`.obsidian/plugins/${p.id}/manifest.json`, 'utf8'));
    assert.equal(
      satisfiesMinApp(manifest.minAppVersion, cfg.appVersion), true,
      `${p.id} needs app ${manifest.minAppVersion}, we have ${cfg.appVersion}`
    );
  }
});
