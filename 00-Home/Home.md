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
// colRight stays empty in M1 — learning progress and spending arrive in M4/M5.
const colRight = grid.createDiv({ cls: 'lime-col' });

function panel(col, title) {
  const p = col.createDiv({ cls: 'lime-panel' });
  p.createEl('h5', { text: title });
  return p;
}

function openNote(path) {
  // If the note is already open somewhere, focus that tab rather than opening a
  // second copy of it. openLinkText alone does not check, so clicking a row for
  // an already-open note used to leave you with duplicate tabs of the same file.
  const open = app.workspace.getLeavesOfType('markdown')
    .find((leaf) => leaf.view && leaf.view.file && leaf.view.file.path === path);
  if (open) {
    app.workspace.setActiveLeaf(open, { focus: true });
    return;
  }
  // never build an obsidian:// URL — that would hardcode the vault name (spec §8)
  app.workspace.openLinkText(path, '', false);
}

// ── DUE & OVERDUE (middle column) ────────────────────────────────────────
// M2 inserts the calendar events panel above this one.
{
  const tasks = dv.pages()
    .where((p) => !p.file.path.startsWith('_templates/'))
    .where((p) => !p.file.path.startsWith('09-Archive/'))
    .where((p) => !p.file.path.startsWith('docs/'))
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
        // '*' and '+' are valid markdown bullets too, and Dataview parses them as tasks.
        try {
          await app.vault.process(file, (data) => {
            const lines = data.split('\n');
            if (lines[t.line] && /^\s*[-*+] \[ \]/.test(lines[t.line])) {
              lines[t.line] = lines[t.line].replace(/^(\s*[-*+] )\[ \]/, '$1[x]');
              rewrote = true;
            }
            return lines.join('\n');
          });
        } catch (err) {
          console.error('lime: failed to write checkbox toggle', err);
          cb.checked = false;
          return;
        }
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
    .where((p) => !p.file.path.startsWith('docs/'))
    .where((p) => p.file.path !== '00-Home/Home.md')
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
```
