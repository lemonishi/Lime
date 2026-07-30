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
// colRight stays empty until M4/M5 bring learning progress and spending.
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

// ── calendar fetch ───────────────────────────────────────────────────────
// The ICS plugin re-downloads and re-parses the entire feed on every
// getEvents() call, and Dataview re-renders on any vault change — so an
// uncached fetch would cost a calendar download per keystroke. Cached on
// globalThis with a 5-minute TTL.
//
// Everything calendar-related goes through here. M2.5 may replace the innards
// with OAuth reads; nothing downstream should need to change.
const EVENT_DAYS = 21;
const EVENT_TTL_MS = 5 * 60 * 1000;

async function fetchEvents(days) {
  const ics = app.plugins.getPlugin('ics');
  if (!ics) return { events: [], problem: 'Calendar plugin not installed' };
  if (!ics.data || !ics.data.calendars || Object.keys(ics.data.calendars).length === 0) {
    return { events: [], problem: 'No calendar configured — see SETUP.md' };
  }

  const nowMs = Date.now();
  const cached = globalThis._limeEvents;
  if (L.isCacheFresh(cached, nowMs, EVENT_TTL_MS) && cached.days === days) {
    return { events: cached.data, problem: null };
  }

  const dates = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(L.fmtISO(d));
  }

  let events = [];
  try {
    events = await ics.getEvents(...dates);
  } catch (err) {
    console.error('lime: calendar fetch failed', err);
    return { events: [], problem: 'Could not read calendar' };
  }

  globalThis._limeEvents = { at: nowMs, days, data: events };
  return { events, problem: null };
}

const CAL = await fetchEvents(EVENT_DAYS);
const EVENTS = CAL.events;

// ── NEXT UP (middle column, above Due & overdue) ─────────────────────────
{
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = L.fmtISO(tomorrow);
  const split = L.splitEvents(EVENTS, todayISO, tomorrowISO, now.getTime());

  const todayCount = split.today.allDay.length + split.today.past.length + split.today.upcoming.length;
  const tomorrowCount = split.tomorrow.allDay.length + split.tomorrow.timed.length;

  // Empty and broken must not look the same (spec M2-D6). A clear couple of
  // days hides the panel; a real problem, or a 21-day window with nothing in it
  // at all, says so out loud — otherwise a dead feed reads as a free day.
  const implausible = !CAL.problem && EVENTS.length === 0;
  const message = CAL.problem
    || (implausible ? `No events in ${EVENT_DAYS} days — either genuinely clear, or the feed is failing silently. Check ICS settings and the console.` : null);

  if (message) {
    const p = panel(colMid, 'Next up');
    p.createDiv({ cls: 'lime-msg', text: message });
  } else if (todayCount + tomorrowCount > 0) {
    const p = panel(colMid, 'Next up');

    const eventRow = (parent, event, opts) => {
      const row = parent.createDiv({ cls: `lime-row${opts.past ? ' lime-past' : ''}${event.allDay ? ' lime-allday' : ''}` });
      let label;
      if (event.allDay) {
        label = row.createSpan({ cls: 'lime-text', text: event.summary });
        const last = L.allDayLastDayISO(event);
        row.createSpan({ cls: 'lime-meta', text: last === opts.dayISO ? 'all day' : `until ${L.fmtShortDate(last)}` });
      } else {
        row.createSpan({ cls: 'lime-time', text: event.time });
        label = row.createSpan({ cls: 'lime-text', text: event.summary });
      }
      // callUrl arrives from a remote feed via best-effort pattern matching, so it
      // is not guaranteed URL-shaped. Gate on http(s) and pass noopener.
      if (/^https?:\/\//.test(String(event.callUrl || ''))) {
        row.addClass('lime-joinable');
        label.addEventListener('click', () => window.open(event.callUrl, '_blank', 'noopener,noreferrer'));
      }
      return row;
    };

    for (const e of split.today.allDay) eventRow(p, e, { past: false, dayISO: todayISO });
    for (const e of split.today.past) eventRow(p, e, { past: true, dayISO: todayISO });

    // The divider only earns its place when there is something on both sides.
    if (split.today.past.length > 0 && split.today.upcoming.length > 0) {
      const line = p.createDiv({ cls: 'lime-nowline' });
      line.createSpan({ text: `NOW ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` });
      line.createEl('i');
    }

    for (const e of split.today.upcoming) eventRow(p, e, { past: false, dayISO: todayISO });

    if (tomorrowCount > 0) {
      p.createDiv({ cls: 'lime-daydivider', text: `Tomorrow · ${L.fmtDayLabel(tomorrow)}` });
      for (const e of split.tomorrow.allDay) eventRow(p, e, { past: false, dayISO: tomorrowISO });
      for (const e of split.tomorrow.timed) eventRow(p, e, { past: false, dayISO: tomorrowISO });
    }
  }
}

// ── DUE & OVERDUE (middle column) ────────────────────────────────────────
// The Next up panel sits above this one.
{
  const tasks = dv.pages()
    .where((p) => !p.file.path.startsWith('_templates/'))
    .where((p) => !p.file.path.startsWith('09-Archive/'))
    .where((p) => !p.file.path.startsWith('docs/'))
    .file.tasks
    .where((t) => !t.completed)
    .array()
    .map((t) => ({
      text: L.cleanTaskText(t.text),
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

// ── UPCOMING DATES (middle column, below Due & overdue) ──────────────────
// Joins calendar events to module notes on the module CODE, so an exam date is
// stored once — in Google Calendar — and cannot drift (spec M2-D3).
{
  const modules = dv.pages('"02-Learning/Modules"')
    .where((p) => p.code)
    .array()
    .map((p) => ({ code: String(p.code), path: p.file.path }));

  const byCode = new Map(modules.map((m) => [m.code.toUpperCase(), m.path]));
  const matches = L.matchModuleEvents(EVENTS, modules.map((m) => m.code));

  if (matches.length > 0) {
    const p = panel(colMid, 'Upcoming dates');
    for (const { event, code } of matches) {
      const row = p.createDiv({ cls: 'lime-row' });
      const text = row.createSpan({ cls: 'lime-text', text: event.summary });
      row.createSpan({ cls: 'lime-meta', text: L.fmtShortDate(L.eventStartISO(event)) });
      const path = byCode.get(code.toUpperCase());
      if (path) text.addEventListener('click', () => openNote(path));
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
