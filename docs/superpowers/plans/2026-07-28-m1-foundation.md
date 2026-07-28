# lime M1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the lime Obsidian vault so the owner can run their day off it — folder skeleton, pinned plugins, auto-created daily notes, and a three-column `Home.md` dashboard showing the banner header, due & overdue tasks, and recent notes.

**Architecture:** The vault is plain markdown on disk. All dashboard logic lives in `_scripts/lib.js` as pure, side-effect-free functions attached to `globalThis.lime`; `Home.md` reads that file through Obsidian's vault adapter and evaluates it, which is the one loading mechanism that works identically on desktop and iOS. Because tests load `lib.js` through *exactly the same* `new Function(src)()` path, they exercise the real load, not a mock of it. A separate Node script installs community plugins at pinned versions with `minAppVersion` gating, so the app-version constraint can never be violated silently.

**Tech Stack:** Obsidian 1.12.7 · Dataview 0.5.68 · Tasks 8.3.0 · core Daily Notes · Node 24 with the built-in `node:test` runner · **zero npm dependencies**

## Global Constraints

Every task's requirements implicitly include this section.

- **Obsidian is 1.12.7 and cannot be upgraded** — 1.13.x is a paid-Catalyst beta. Never install a plugin whose manifest `minAppVersion` exceeds `1.12.7`.
- **Version pins are load-bearing.** Templater `2.20.6` and QuickAdd `2.12.3` (both arrive in M3) break above these versions. Dataview `0.5.68`, Tasks `8.3.0` are M1's pins. Obsidian's plugin updater will offer newer builds — the pin-drift test exists to catch that.
- **No npm dependencies.** Node 24's built-in `node:test` and `node:assert` only. Nothing in `package.json` beyond scripts.
- **The full-suite command is bare `node --test`** (that is, `npm test`). Node 22+ treats positional arguments to `--test` as **globs, not directories** — `node --test tests/` tries to import a module literally named `tests` and dies with `MODULE_NOT_FOUND`. Bare `node --test` recursively discovers `*.test.mjs` from the working directory, including subdirectories, and skips `node_modules`. Explicit single-file paths (`node --test tests/lib.test.mjs`) work normally and are what the per-task RED/GREEN steps use. Verified on Node v24.0.2.
- **Every note stays plain markdown with plain frontmatter.** No plugin may become a store of data. If Dataview died tonight, zero notes are lost.
- **Dashboard code must work on iOS.** No `require()`, no `child_process`, no Node APIs in anything under `_scripts/` that `Home.md` loads. Vault adapter reads only.
- **No uncleaned `setInterval`.** The reference vault leaks a timer per render. Re-render on Dataview's own refresh; if an interval is ever unavoidable, register it for disposal.
- **No inline `onclick` with string-built HTML.** Note titles contain quotes. Attach listeners with `addEventListener`.
- **No hardcoded vault name.** Use `app.workspace.openLinkText`, never a literal `obsidian://open?vault=…` URL.
- **Spec:** `docs/superpowers/specs/2026-07-28-lime-vault-design.md`. It is the authority; this plan implements M1 (§10) only.

### Scope note — one deviation from spec §10, made deliberately

Spec §10 lists M1's dashboard panels as "Today, Due & overdue, Recent". **The "Today" panel is calendar events, which do not exist until M2.** Building an empty events panel in M1 would violate the spec's own "widgets hide themselves when empty" rule (§8) and give the owner a dead box on day one.

So M1 builds: **banner header with today's date**, **Due & overdue**, and **Recent**. M2 inserts the events panel above Due & overdue. The three-column grid is built to take it without restructuring.

Likewise, **M1 installs only Dataview and Tasks.** Templater and QuickAdd are pinned in spec §7 but are not used by any M1 panel; they arrive in M3 with capture. The installer built in Task 2 handles their pins when that time comes.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` | Test script only. No dependencies. |
| `scripts/plugins.json` | Declarative plugin manifest: id, repo, pinned version. Single source of truth for pins. |
| `scripts/install-plugins.mjs` | CLI. Reads `plugins.json`, downloads pinned releases into `.obsidian/plugins/<id>/`, refuses anything whose `minAppVersion` exceeds the installed app. |
| `scripts/lib/versions.mjs` | Pure version comparison + gating logic. The only part of install with real branching, so the only part worth unit-testing in isolation. |
| `_scripts/lib.js` | Pure dashboard helpers on `globalThis.lime`. Loaded by `Home.md` via vault adapter. **No DOM, no Obsidian API, no Node API.** |
| `_assets/home-banner.jpg` | Header image. Already committed. |
| `.obsidian/snippets/lime.css` | Three-column grid, banner, panel/row styling, mobile collapse. |
| `00-Home/Home.md` | The dashboard. Thin — loads `lib.js`, then one `dataviewjs` block per panel. |
| `00-Home/Inbox.md` | Capture landing pad. Empty in M1; fed in M3. |
| `_templates/daily.md` | Daily note template, core `{{date}}` substitution (no Templater dependency). |
| `.obsidian/daily-notes.json` | Core Daily Notes config: folder, format, template. |
| `.obsidian/community-plugins.json` | Enabled plugin list. |
| `tests/versions.test.mjs` | Unit tests for version gating. |
| `tests/lib.test.mjs` | Unit tests for dashboard helpers, loaded the same way Obsidian loads them. |
| `tests/vault.test.mjs` | Structural guard: skeleton exists, installed plugin versions still match pins. |
| `SETUP.md` | The manual steps only a human with the GUI can do, plus the M1 acceptance checklist. |

---

## Task 1: Vault skeleton

**Files:**
- Create: `package.json`, `tests/vault.test.mjs`
- Create: the folder tree from spec §5, each with `.gitkeep`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: the directory layout every later task writes into. Folder names are exactly as in spec §5 — later tasks hardcode these paths.

- [ ] **Step 1: Write the failing test**

Create `tests/vault.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/vault.test.mjs`
Expected: FAIL — `missing directory: 00-Home`

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "lime",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 4: Create the folder tree**

```bash
for d in 00-Home 01-Daily \
         02-Learning/Modules 02-Learning/Courses 02-Learning/Drills 02-Learning/Concepts \
         03-Work 04-Projects \
         05-JobSearch/Applications 05-JobSearch/Companies \
         06-Money 07-Reading 08-Notes 09-Archive \
         _templates _scripts; do
  mkdir -p "$d" && touch "$d/.gitkeep"
done
```

`_assets/` already exists and holds the banner, so it needs no `.gitkeep`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: vault folder skeleton with structural test"
```

---

## Task 2: Version gating logic

**Files:**
- Create: `scripts/lib/versions.mjs`
- Test: `tests/versions.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `parseVersion(v: string) => number[]` — `"1.12.7"` → `[1,12,7]`. Tolerates a leading `v`.
  - `compareVersions(a: string, b: string) => -1 | 0 | 1`
  - `satisfiesMinApp(minAppVersion: string, appVersion: string) => boolean` — true when the app is at or above the floor.
  - Task 3's installer imports all three.

- [ ] **Step 1: Write the failing test**

Create `tests/versions.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/versions.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/lib/versions.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/versions.mjs`:

```js
export function parseVersion(v) {
  const parts = String(v).replace(/^v/, '').split('.');
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const n = Number.parseInt(parts[i] ?? '0', 10);
    out[i] = Number.isNaN(n) ? 0 : n;
  }
  return out;
}

export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function satisfiesMinApp(minAppVersion, appVersion) {
  if (!minAppVersion) return true;
  return compareVersions(appVersion, minAppVersion) >= 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/versions.test.mjs`
Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/versions.mjs tests/versions.test.mjs
git commit -m "feat: version comparison and minAppVersion gating"
```

---

## Task 3: Plugin installer

**Files:**
- Create: `scripts/plugins.json`, `scripts/install-plugins.mjs`
- Modify: `tests/vault.test.mjs` (add pin-drift test)

**Interfaces:**
- Consumes: `parseVersion`, `compareVersions`, `satisfiesMinApp` from Task 2.
- Produces: `.obsidian/plugins/<id>/{main.js,manifest.json,styles.css}` at pinned versions, and `.obsidian/community-plugins.json` listing the enabled ids. Task 6's dashboard depends on `dataview` and `obsidian-tasks-plugin` being present.

- [ ] **Step 1: Create the plugin manifest**

Create `scripts/plugins.json`. **`id` must match the plugin's own manifest id** — that is the folder name Obsidian looks for. Note Tasks' id is `obsidian-tasks-plugin`, not `tasks`.

```json
{
  "appVersion": "1.12.7",
  "plugins": [
    {
      "id": "dataview",
      "repo": "blacksmithgu/obsidian-dataview",
      "pin": "0.5.68",
      "why": "dashboard widgets; unmaintained since Apr 2025, accepted knowingly (spec D7)"
    },
    {
      "id": "obsidian-tasks-plugin",
      "repo": "obsidian-tasks-group/obsidian-tasks",
      "pin": "8.3.0",
      "why": "due-date semantics for inline checkboxes"
    }
  ]
}
```

- [ ] **Step 2: Write the failing pin-drift test**

Append to `tests/vault.test.mjs`:

```js
import { readFileSync } from 'node:fs';

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
```

Add to the imports at the top of `tests/vault.test.mjs`:

```js
import { satisfiesMinApp } from '../scripts/lib/versions.mjs';
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test tests/vault.test.mjs`
Expected: FAIL — `plugin not installed: dataview`

- [ ] **Step 4: Write the installer**

Create `scripts/install-plugins.mjs`:

```js
#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { satisfiesMinApp } from './lib/versions.mjs';

const CFG = 'scripts/plugins.json';
const FILES = ['main.js', 'manifest.json', 'styles.css']; // styles.css is optional

async function fetchAsset(repo, tag, file) {
  const url = `https://github.com/${repo}/releases/download/${tag}/${file}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.text();
}

async function install(plugin, appVersion) {
  const { id, repo, pin } = plugin;
  const dir = `.obsidian/plugins/${id}`;

  const manifestText = await fetchAsset(repo, pin, 'manifest.json');
  if (!manifestText) throw new Error(`${id}: no manifest.json at tag ${pin} of ${repo}`);
  const manifest = JSON.parse(manifestText);

  // The gate. Never install something the app cannot run.
  if (!satisfiesMinApp(manifest.minAppVersion, appVersion)) {
    throw new Error(
      `${id} ${manifest.version} needs Obsidian >= ${manifest.minAppVersion}, ` +
      `but this vault targets ${appVersion}. Refusing to install.`
    );
  }
  if (manifest.version !== pin) {
    throw new Error(`${id}: tag ${pin} contains version ${manifest.version} — pin mismatch`);
  }

  await mkdir(dir, { recursive: true });
  for (const file of FILES) {
    const body = file === 'manifest.json' ? manifestText : await fetchAsset(repo, pin, file);
    if (body === null) {
      if (file === 'styles.css') continue; // genuinely optional
      throw new Error(`${id}: missing required asset ${file}`);
    }
    await writeFile(`${dir}/${file}`, body);
  }
  console.log(`  ok  ${id} ${manifest.version} (needs app >= ${manifest.minAppVersion ?? 'any'})`);
}

async function enable(ids) {
  const path = '.obsidian/community-plugins.json';
  const existing = existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : [];
  const merged = [...new Set([...existing, ...ids])];
  await writeFile(path, JSON.stringify(merged, null, 2) + '\n');
  console.log(`  ok  enabled: ${merged.join(', ')}`);
}

const cfg = JSON.parse(await readFile(CFG, 'utf8'));
console.log(`Installing plugins for Obsidian ${cfg.appVersion}`);
for (const plugin of cfg.plugins) {
  await install(plugin, cfg.appVersion);
}
await enable(cfg.plugins.map((p) => p.id));
console.log('Done. Restart Obsidian for changes to take effect.');
```

- [ ] **Step 5: Add the npm script**

Modify `package.json` — add to `scripts`:

```json
"install-plugins": "node scripts/install-plugins.mjs"
```

- [ ] **Step 6: Run the installer**

Run: `npm run install-plugins`
Expected output:

```
Installing plugins for Obsidian 1.12.7
  ok  dataview 0.5.68 (needs app >= 0.13.11)
  ok  obsidian-tasks-plugin 8.3.0 (needs app >= 1.8.7)
  ok  enabled: dataview, obsidian-tasks-plugin
Done. Restart Obsidian for changes to take effect.
```

- [ ] **Step 7: Verify the gate actually refuses a bad install**

This is the single most important behaviour in the script — prove it works rather than trusting it. Temporarily add a plugin known to need 1.13.0:

```bash
node -e "
const fs=require('fs');
const c=JSON.parse(fs.readFileSync('scripts/plugins.json','utf8'));
c.plugins.push({id:'templater-obsidian',repo:'silentvoid13/Templater',pin:'2.24.3',why:'GATE TEST'});
fs.writeFileSync('/tmp/lime-gate-test.json', JSON.stringify(c,null,2));
"
cp scripts/plugins.json /tmp/lime-plugins-backup.json
cp /tmp/lime-gate-test.json scripts/plugins.json
npm run install-plugins; echo "exit code: $?"
cp /tmp/lime-plugins-backup.json scripts/plugins.json
```

Expected: the run **fails** with
`templater-obsidian 2.24.3 needs Obsidian >= 1.13.0, but this vault targets 1.12.7. Refusing to install.`
and a non-zero exit code. Confirm `scripts/plugins.json` is restored to two plugins afterwards.

- [ ] **Step 8: Run the full test suite**

Run: `npm test`
Expected: PASS — 10 tests (2 from Task 1, 6 from Task 2, 2 added here)

- [ ] **Step 9: Commit**

The plugin binaries are committed deliberately: it makes the vault reproducible and makes pin drift visible in `git diff`.

```bash
git add scripts/ package.json tests/vault.test.mjs .obsidian/
git commit -m "feat: pinned plugin installer with minAppVersion gate"
```

---

## Task 4: Dashboard helpers

**Files:**
- Create: `_scripts/lib.js`
- Test: `tests/lib.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces `globalThis.lime` with:
  - `fmtDayLabel(date: Date) => string` — `"Tuesday 28 July"`
  - `fmtISO(date: Date) => string` — `"2026-07-28"`
  - `relativeAge(ms: number, nowMs: number) => string` — `"2h"`, `"3d"`, `"just now"`
  - `dueStatus(dueISO: string|null, todayISO: string) => { label: string, tone: 'overdue'|'today'|'soon'|'later'|'none' }`
  - `compareTasks(a, b) => number` — sorts task-like `{ dueISO }` objects: overdue first (most overdue first), then today, then soonest, undated last.
  - Task 6 calls all of these from `Home.md`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib.test.mjs`. Note it loads the file the **same way Obsidian will** — read the source, `new Function`, evaluate — so the test covers the real load path.

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let lime;
before(() => {
  const src = readFileSync('_scripts/lib.js', 'utf8');
  new Function(src)();
  lime = globalThis.lime;
});

test('lib attaches itself to globalThis', () => {
  assert.ok(lime, 'globalThis.lime was not defined');
});

test('fmtISO formats local date, not UTC', () => {
  // guards the classic toISOString() bug: late-evening local dates rolling forward a day
  assert.equal(lime.fmtISO(new Date(2026, 6, 28, 23, 30)), '2026-07-28');
  assert.equal(lime.fmtISO(new Date(2026, 0, 1, 0, 5)), '2026-01-01');
});

test('fmtDayLabel renders a human date', () => {
  assert.equal(lime.fmtDayLabel(new Date(2026, 6, 28)), 'Tuesday 28 July');
});

test('relativeAge renders compact ages', () => {
  const now = new Date(2026, 6, 28, 12, 0).getTime();
  assert.equal(lime.relativeAge(now - 30 * 1000, now), 'just now');
  assert.equal(lime.relativeAge(now - 2 * 3600 * 1000, now), '2h');
  assert.equal(lime.relativeAge(now - 3 * 86400 * 1000, now), '3d');
});

test('dueStatus flags overdue with day count', () => {
  assert.deepEqual(lime.dueStatus('2026-07-26', '2026-07-28'), { label: '2d overdue', tone: 'overdue' });
  assert.deepEqual(lime.dueStatus('2026-07-27', '2026-07-28'), { label: '1d overdue', tone: 'overdue' });
});

test('dueStatus flags today and tomorrow by name', () => {
  assert.deepEqual(lime.dueStatus('2026-07-28', '2026-07-28'), { label: 'today', tone: 'today' });
  assert.deepEqual(lime.dueStatus('2026-07-29', '2026-07-28'), { label: 'tomorrow', tone: 'soon' });
});

test('dueStatus uses weekday names within a week, dates beyond', () => {
  assert.deepEqual(lime.dueStatus('2026-07-31', '2026-07-28'), { label: 'Fri', tone: 'soon' });
  assert.deepEqual(lime.dueStatus('2026-08-12', '2026-07-28'), { label: '12 Aug', tone: 'later' });
});

test('dueStatus handles undated tasks', () => {
  assert.deepEqual(lime.dueStatus(null, '2026-07-28'), { label: '', tone: 'none' });
});

test('compareTasks sorts most-overdue first, undated last', () => {
  const tasks = [
    { id: 'undated', dueISO: null },
    { id: 'later',   dueISO: '2026-08-12' },
    { id: 'veryOld', dueISO: '2026-07-20' },
    { id: 'today',   dueISO: '2026-07-28' },
    { id: 'old',     dueISO: '2026-07-26' },
  ];
  const order = tasks.sort(lime.compareTasks).map((t) => t.id);
  assert.deepEqual(order, ['veryOld', 'old', 'today', 'later', 'undated']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/lib.test.mjs`
Expected: FAIL — `ENOENT: no such file or directory, open '_scripts/lib.js'`

- [ ] **Step 3: Write the implementation**

Create `_scripts/lib.js`. **Pure functions only** — no DOM, no `app`, no `dv`, no Node APIs, so it loads identically in Node, on desktop, and on iOS.

```js
// Pure helpers for the lime dashboard.
// Loaded by 00-Home/Home.md via the vault adapter and by tests via new Function(src)().
// Must stay free of DOM, Obsidian, and Node APIs so it runs identically in all three.

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n) => String(n).padStart(2, '0');

// Local date, deliberately not toISOString() — that converts to UTC and rolls
// late-evening dates forward a day.
function fmtISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fmtDayLabel(date) {
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(fromISO, toISO) {
  const MS = 86400000;
  return Math.round((parseISO(toISO) - parseISO(fromISO)) / MS);
}

function relativeAge(ms, nowMs) {
  const secs = Math.max(0, Math.floor((nowMs - ms) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  return `${Math.floor(secs / 86400)}d`;
}

function dueStatus(dueISO, todayISO) {
  if (!dueISO) return { label: '', tone: 'none' };
  const delta = daysBetween(todayISO, dueISO);
  if (delta < 0) return { label: `${Math.abs(delta)}d overdue`, tone: 'overdue' };
  if (delta === 0) return { label: 'today', tone: 'today' };
  if (delta === 1) return { label: 'tomorrow', tone: 'soon' };
  if (delta <= 6) return { label: DAYS_SHORT[parseISO(dueISO).getDay()], tone: 'soon' };
  const d = parseISO(dueISO);
  return { label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, tone: 'later' };
}

// Undated tasks sink to the bottom; everything else is chronological, so the
// most-overdue item is always the first thing read.
function compareTasks(a, b) {
  if (!a.dueISO && !b.dueISO) return 0;
  if (!a.dueISO) return 1;
  if (!b.dueISO) return -1;
  return a.dueISO < b.dueISO ? -1 : a.dueISO > b.dueISO ? 1 : 0;
}

globalThis.lime = { fmtISO, fmtDayLabel, relativeAge, dueStatus, compareTasks, parseISO, daysBetween };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/lib.test.mjs`
Expected: PASS — 9 tests

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — 19 tests (10 from Tasks 1–3, 9 added here)

- [ ] **Step 6: Commit**

```bash
git add _scripts/lib.js tests/lib.test.mjs
git commit -m "feat: pure dashboard date and task-sorting helpers"
```

---

## Task 5: Dashboard stylesheet

**Files:**
- Create: `.obsidian/snippets/lime.css`
- Modify: `.obsidian/appearance.json`

**Interfaces:**
- Consumes: nothing.
- Produces the class names Task 6's widgets emit: `.lime-grid`, `.lime-col`, `.lime-banner`, `.lime-banner-date`, `.lime-panel`, `.lime-panel h5`, `.lime-row`, `.lime-row .lime-text`, `.lime-row .lime-meta`, and tone modifiers `.lime-tone-overdue`, `.lime-tone-today`, `.lime-tone-soon`, `.lime-tone-later`.

**Every selector in this file is `.lime-`-prefixed.** Obsidian applies CSS snippets globally across the app, so an unprefixed generic selector like `.tone-today` could restyle elements belonging to another snippet or theme. The `lime-tone-` prefix is deliberate namespacing, not verbosity.

- [ ] **Step 1: Write the stylesheet**

Create `.obsidian/snippets/lime.css`. This replaces the `obsidian-columns` plugin (spec §3) — three columns from CSS grid we own.

```css
/* lime dashboard — replaces the obsidian-columns plugin (spec §3) */

.lime-banner {
  position: relative;
  height: 170px;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 14px;
}
.lime-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* the subject's face sits ~30% down the frame (spec §8) */
  object-position: 50% 30%;
  display: block;
}
.lime-banner::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 70px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
}
.lime-banner-date {
  position: absolute;
  left: 18px;
  bottom: 12px;
  z-index: 1;
  color: #fff;
  font-size: 1.35em;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.7);
}

.lime-grid {
  display: grid;
  grid-template-columns: 1fr 1.35fr 1fr;
  gap: 12px;
  align-items: start;
}
.lime-col { min-width: 0; }

.lime-panel {
  border: 1px solid var(--background-modifier-border);
  border-radius: 9px;
  background: var(--background-secondary);
  padding: 11px 12px;
  margin-bottom: 10px;
}
.lime-panel h5 {
  margin: 0 0 8px;
  font-size: 0.68em;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.6;
  font-weight: 700;
}

.lime-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 5px;
  background: var(--background-primary);
  margin-bottom: 4px;
  font-size: 0.88em;
}
.lime-row .lime-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.lime-row .lime-meta {
  margin-left: auto;
  flex-shrink: 0;
  opacity: 0.55;
  font-size: 0.85em;
}
.lime-row input[type='checkbox'] {
  flex: none;
  width: 15px;
  height: 15px;
  accent-color: var(--text-accent);
  cursor: pointer;
}

.lime-tone-overdue { color: var(--text-error); opacity: 1; font-weight: 600; }
.lime-tone-today   { color: var(--text-accent); opacity: 1; }
.lime-tone-soon    { opacity: 0.65; }
.lime-tone-later   { opacity: 0.45; }

/* iPhone: one scrolling column, shorter banner (spec §8) */
@media (max-width: 700px) {
  .lime-grid { grid-template-columns: 1fr; }
  .lime-banner { height: 110px; }
  .lime-banner-date { font-size: 1.1em; left: 12px; bottom: 9px; }
}
```

- [ ] **Step 2: Enable the snippet**

Create `.obsidian/appearance.json`:

```json
{
  "enabledCssSnippets": ["lime"]
}
```

- [ ] **Step 3: Verify the file is valid CSS**

Run:

```bash
node -e "
const css = require('fs').readFileSync('.obsidian/snippets/lime.css','utf8');
const open = (css.match(/{/g)||[]).length, close = (css.match(/}/g)||[]).length;
if (open !== close) { console.error('brace mismatch:', open, 'vs', close); process.exit(1); }
console.log('braces balanced:', open);
"
```

Expected: `braces balanced: 20`

(16 top-level rules, plus the `@media` block itself and its 3 nested rules.)

- [ ] **Step 4: Commit**

```bash
git add .obsidian/snippets/lime.css .obsidian/appearance.json
git commit -m "feat: dashboard stylesheet with CSS-grid columns and banner"
```

---

## Task 6: The dashboard

**Files:**
- Create: `00-Home/Home.md`, `00-Home/Inbox.md`

**Interfaces:**
- Consumes: `globalThis.lime` from Task 4; the CSS classes from Task 5 (**tone modifiers are `lime-tone-*`, prefixed**); the `dataview` and `obsidian-tasks-plugin` installs from Task 3.
- Produces: the dashboard. M2 will insert an events panel as the first child of the middle column.

- [ ] **Step 1: Create the Inbox**

Create `00-Home/Inbox.md`:

```markdown
---
type: inbox
---

Unsorted capture lands here. Fed by QuickAdd from M3.
```

- [ ] **Step 2: Write the dashboard**

Create `00-Home/Home.md`.

Three deliberate choices, each traceable to a spec constraint: `dv.container` is populated with `createEl`/`createDiv` rather than `innerHTML` (spec §8 — note titles contain quotes); the loader reads through `app.vault.adapter` rather than `require` (works on iOS); and each panel returns early without rendering when it has nothing to show (spec §8 — widgets hide when empty, which is what keeps layout A honest).

````markdown
---
cssclasses:
  - lime-home
---

```dataviewjs
// ── loader ───────────────────────────────────────────────────────────────
// Vault-adapter read, not require() — this is the path that also works on iOS.
if (!globalThis.lime) {
  const src = await app.vault.adapter.read('_scripts/lib.js');
  new Function(src)();
}
const L = globalThis.lime;
const now = new Date();
const todayISO = L.fmtISO(now);

// ── banner ───────────────────────────────────────────────────────────────
const banner = dv.container.createDiv({ cls: 'lime-banner' });
const img = banner.createEl('img');
img.src = app.vault.adapter.getResourcePath('_assets/home-banner.jpg');
img.alt = '';
banner.createDiv({ cls: 'lime-banner-date', text: L.fmtDayLabel(now) });
```

```dataviewjs
// Same idempotent loader as the first block. Dataview does not guarantee that a
// previous block ran, or succeeded — without this, a failure up there surfaces
// down here as "Cannot read properties of undefined" and the whole dashboard
// vanishes behind an opaque error.
if (!globalThis.lime) {
  const src = await app.vault.adapter.read('_scripts/lib.js');
  new Function(src)();
}
const L = globalThis.lime;
const now = new Date();
const todayISO = L.fmtISO(now);

const grid = dv.container.createDiv({ cls: 'lime-grid' });
const colLeft = grid.createDiv({ cls: 'lime-col' });
const colMid = grid.createDiv({ cls: 'lime-col' });
const colRight = grid.createDiv({ cls: 'lime-col' });

function panel(col, title) {
  const p = col.createDiv({ cls: 'lime-panel' });
  p.createEl('h5', { text: title });
  return p;
}

function openNote(path) {
  // never build an obsidian:// URL — that would hardcode the vault name (spec §8)
  app.workspace.openLinkText(path, '', false);
}

// ── DUE & OVERDUE (middle column) ────────────────────────────────────────
// M2 inserts the calendar events panel above this one.
{
  const tasks = dv.pages()
    .where((p) => !p.file.path.startsWith('_templates/'))
    .where((p) => !p.file.path.startsWith('09-Archive/'))
    .file.tasks
    .where((t) => !t.completed)
    .array()
    .map((t) => ({
      text: t.text.replace(/\s*[📅⏳🛫➕✅]\s*\d{4}-\d{2}-\d{2}/g, '').trim(),
      dueISO: t.due ? L.fmtISO(new Date(t.due.ts)) : null,
      path: t.path,
      line: t.line,
    }))
    .filter((t) => t.dueISO !== null && t.dueISO <= todayISO)
    .sort(L.compareTasks);

  if (tasks.length > 0) {           // hide when empty (spec §8)
    const p = panel(colMid, 'Due & overdue');
    for (const t of tasks) {
      const row = p.createDiv({ cls: 'lime-row' });
      const cb = row.createEl('input', { type: 'checkbox' });
      const text = row.createSpan({ cls: 'lime-text', text: t.text });
      const status = L.dueStatus(t.dueISO, todayISO);
      row.createSpan({ cls: `lime-meta lime-tone-${status.tone}`, text: status.label });

      text.addEventListener('click', () => openNote(t.path));
      cb.addEventListener('click', async (e) => {
        e.stopPropagation();
        // The browser has already flipped the box by the time we get here. If we
        // end up not writing, we must flip it back — otherwise the dashboard shows
        // a ticked task that is still open in the file, and nothing re-renders to
        // correct it (Dataview only refreshes on a real file-change event).
        const file = app.vault.getAbstractFileByPath(t.path);
        if (!file) { cb.checked = false; return; }
        let rewrote = false;
        // Target the exact line; never blind-replace the first "- [ ]" (spec §8).
        await app.vault.process(file, (data) => {
          const lines = data.split('\n');
          if (lines[t.line] && lines[t.line].includes('- [ ]')) {
            lines[t.line] = lines[t.line].replace('- [ ]', '- [x]');
            rewrote = true;
          }
          return lines.join('\n');
        });
        if (!rewrote) cb.checked = false;
      });
    }
  }
}

// ── RECENT (left column) ─────────────────────────────────────────────────
{
  const recent = dv.pages()
    .where((p) => !p.file.path.startsWith('_templates/'))
    .where((p) => !p.file.path.startsWith('09-Archive/'))
    .where((p) => p.file.name !== 'Home')
    .sort((p) => p.file.mtime, 'desc')
    .slice(0, 8)
    .array();

  if (recent.length > 0) {
    const p = panel(colLeft, 'Recent');
    for (const page of recent) {
      const row = p.createDiv({ cls: 'lime-row' });
      const text = row.createSpan({ cls: 'lime-text', text: page.file.name });
      row.createSpan({ cls: 'lime-meta', text: L.relativeAge(page.file.mtime.ts, now.getTime()) });
      text.addEventListener('click', () => openNote(page.file.path));
    }
  }
}

// colRight stays empty in M1 — learning progress and spending arrive in M4/M5.
```
````

- [ ] **Step 3: Sanity-check the markdown structure**

Run:

```bash
node -e "
const md = require('fs').readFileSync('00-Home/Home.md','utf8');
const blocks = (md.match(/\`\`\`dataviewjs/g)||[]).length;
if (blocks !== 2) { console.error('expected 2 dataviewjs blocks, found', blocks); process.exit(1); }
for (const bad of ['innerHTML', 'onclick=', 'setInterval', 'obsidian://open?vault=']) {
  if (md.includes(bad)) { console.error('forbidden pattern present:', bad); process.exit(1); }
}
console.log('Home.md structure ok:', blocks, 'blocks, no forbidden patterns');
"
```

Expected: `Home.md structure ok: 2 blocks, no forbidden patterns`

- [ ] **Step 4: Commit**

```bash
git add 00-Home/Home.md 00-Home/Inbox.md
git commit -m "feat: home dashboard with banner, due-and-overdue, and recent panels"
```

---

## Task 7: Daily notes

**Files:**
- Create: `_templates/daily.md`, `.obsidian/daily-notes.json`
- Modify: `.obsidian/core-plugins.json`

**Interfaces:**
- Consumes: the `01-Daily/` folder from Task 1.
- Produces: `01-Daily/YYYY-MM-DD.md` files matching the `type: daily` schema in spec §6. Task 6's Due & overdue panel reads tasks out of these.

- [ ] **Step 1: Write the template**

Create `_templates/daily.md`. Core Daily Notes substitutes `{{date}}` — **no Templater dependency in M1**, which is why Templater is deferred to M3.

```markdown
---
type: daily
date: "{{date:YYYY-MM-DD}}"
---

## Log

## Tasks
```

**The quotes around `{{date:YYYY-MM-DD}}` are required, not stylistic.** Unquoted, a YAML value starting with `{` is read as the beginning of a flow mapping, so `{{...}}` is a mapping used as a key — which YAML rejects outright. Verified with a standards-compliant parser: the unquoted form raises `ConstructorError: while constructing a mapping`, and Obsidian's metadata cache and Dataview both index every markdown file in the vault, including this template, before any folder filter applies. So the unquoted form puts a permanently unparseable file in the vault.

Quoting also makes the substituted value a **string** (`date: "2026-07-29"`) rather than a YAML date object. That is the behaviour we want: `_scripts/lib.js` works in `YYYY-MM-DD` strings throughout, and `YYYY-MM-DD` sorts correctly lexicographically.

- [ ] **Step 2: Configure Daily Notes**

Create `.obsidian/daily-notes.json`:

```json
{
  "folder": "01-Daily",
  "format": "YYYY-MM-DD",
  "template": "_templates/daily",
  "autorun": false
}
```

`autorun: false` deliberately — opening today's note is a choice, not something that hijacks startup. The dashboard is what you land on.

- [ ] **Step 3: Enable the core plugins**

Create `.obsidian/core-plugins.json`:

```json
{
  "file-explorer": true,
  "global-search": true,
  "switcher": true,
  "graph": false,
  "backlink": true,
  "outgoing-link": true,
  "tag-pane": true,
  "daily-notes": true,
  "templates": true,
  "command-palette": true,
  "editor-status": true,
  "bookmarks": true,
  "outline": true,
  "word-count": true,
  "file-recovery": true
}
```

`graph: false` — spec §6 is explicit that the graph view is decorative and not designed for.

- [ ] **Step 4: Verify the config is internally consistent**

Run:

```bash
node -e "
const fs=require('fs');
const dn=JSON.parse(fs.readFileSync('.obsidian/daily-notes.json','utf8'));
const core=JSON.parse(fs.readFileSync('.obsidian/core-plugins.json','utf8'));
if (!core['daily-notes']) { console.error('daily-notes core plugin not enabled'); process.exit(1); }
if (!fs.existsSync(dn.template + '.md')) { console.error('template missing:', dn.template + '.md'); process.exit(1); }
if (!fs.existsSync(dn.folder)) { console.error('daily folder missing:', dn.folder); process.exit(1); }
console.log('daily notes config ok →', dn.folder + '/' + dn.format + '.md from ' + dn.template);
"
```

Expected: `daily notes config ok → 01-Daily/YYYY-MM-DD.md from _templates/daily`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — 19 tests

- [ ] **Step 6: Commit**

```bash
git add _templates/daily.md .obsidian/daily-notes.json .obsidian/core-plugins.json
git commit -m "feat: daily notes with template and core plugin config"
```

---

## Task 8: Setup guide and acceptance

**Files:**
- Create: `SETUP.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the human-only steps and the M1 acceptance checklist that gates the M2 checkpoint.

- [ ] **Step 1: Write SETUP.md**

Create `SETUP.md`:

````markdown
# lime — setup

Everything that a script cannot do, because it needs the Obsidian GUI.

## 1. Open the vault

Obsidian's vault registry already points at `~/personal/lime`. Open Obsidian; if it
does not open lime, use **Open folder as vault** and pick `~/personal/lime`.

## 2. Turn off Restricted Mode

**Settings → Community plugins → Turn off Restricted Mode.**

Community plugins do not load at all until this is done. The installer has already
placed Dataview and Tasks on disk and listed them as enabled — this is the switch
that lets Obsidian actually run them.

## 3. Restart Obsidian

Plugin files are read at startup. After restarting, confirm under
**Settings → Community plugins** that both are present and enabled:

- Dataview `0.5.68`
- Tasks `8.3.0`

## 4. Confirm the CSS snippet is on

**Settings → Appearance → CSS snippets** — `lime` should be listed and toggled on.
If it is not, hit the reload icon.

## 5. Set up Obsidian Sync

**Settings → Sync.** Sign in, create a remote vault, connect. Then repeat on the
Windows PC and the iPhone.

**Exclude these from sync** (they are per-device and cause conflicts):
`.obsidian/workspace.json`, `.obsidian/workspace-mobile.json`

## 6. Pick a dark theme

The banner image is dark and heavily saturated (spec §8). It sits naturally on a
dark theme and will read as a heavy dark block on a light one.

---

## Do not do this

**Never accept Obsidian's offer to update Dataview or Tasks.** Their versions are
pinned in `scripts/plugins.json` for reasons recorded in spec §7. Newer Templater
and QuickAdd builds require Obsidian 1.13.0, which you cannot install.

To check nothing has drifted:

```bash
npm test
```

A pin-drift failure names the plugin and the version it drifted to. To fix:

```bash
npm run install-plugins
```

Then restart Obsidian.

---

## M1 acceptance checklist

Work through this before we plan M2.

- [ ] Obsidian opens the lime vault without errors in the developer console
- [ ] `00-Home/Home.md` shows the banner image, cropped to a strip, with today's date over it
- [ ] The date reads correctly — check it again after 9pm, which is when a UTC bug would show
- [ ] Today's daily note can be created from the command palette (**Open today's daily note**)
- [ ] The new daily note has `type: daily` and today's date in its frontmatter
- [ ] Typing `- [ ] test task 📅 <today>` into the daily note makes it appear in **Due & overdue**
- [ ] Giving a task yesterday's date shows it as `1d overdue`, coloured, above today's tasks
- [ ] Ticking a task's checkbox on the dashboard changes that exact line in the source note
- [ ] Ticking it removes it from the panel on next render
- [ ] With no due tasks at all, the **Due & overdue** panel is absent — not an empty box
- [ ] **Recent** lists notes you have just edited, newest first
- [ ] Clicking any row opens the right note
- [ ] On iPhone: the vault syncs, the dashboard renders as one column, the banner is short
- [ ] `npm test` passes

## What is deliberately missing in M1

Calendar events (M2), capture buttons (M3), learning panels (M4), job search and
spending (M5), needs-attention (M6). The right-hand column is empty on purpose —
M4 and M5 fill it.
````

- [ ] **Step 2: Run the full suite one final time**

Run: `npm test`
Expected: PASS — 19 tests across 3 files

- [ ] **Step 3: Commit**

```bash
git add SETUP.md
git commit -m "docs: setup guide and M1 acceptance checklist"
```

---

## Plan self-review

**Spec coverage.** §5 structure → Task 1. §7 stack and pins → Tasks 2–3 (Templater/QuickAdd deferred to M3, stated above). §8 banner → Tasks 5–6. §8 implementation requirements (no `setInterval`, no `innerHTML`, no hardcoded vault name, exact-line checkbox targeting, mobile collapse) → Tasks 5–6, enforced by the Task 6 Step 3 grep. §6 `type: daily` schema → Task 7. §10 M1 row → all tasks. Deferred by design and *not* gaps: needs-attention (M6), Bases views (M6), learning/money/job panels (M4–M5), calendar (M2).

**Known limitation, accepted.** The dashboard's rendering is verified by the human acceptance checklist in Task 8, not by automated tests — the pure logic underneath it is unit-tested, but `dataviewjs` executing inside Obsidian is not reachable from Node without an Obsidian harness, which is disproportionate for M1. The Task 6 Step 3 grep catches the specific regressions the spec calls out by name.

**Type consistency.** `dueISO` is a `YYYY-MM-DD` string everywhere. `compareTasks(a, b)` takes exactly two arguments and is passed directly to `Array.prototype.sort`. `dueStatus` returns `{ label, tone }` with `tone` in `overdue|today|soon|later|none`; Task 6 emits `lime-tone-${tone}` and the Task 5 CSS defines `.lime-tone-overdue`, `.lime-tone-today`, `.lime-tone-soon`, `.lime-tone-later` — the `none` case emits `.lime-tone-none`, which has no rule and therefore renders an unstyled empty label, which is correct. Plugin ids match their upstream manifests: `dataview` and `obsidian-tasks-plugin`.
