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

test('lib.js uses no DOM, Obsidian or Node APIs', () => {
  // lib.js is loaded by Home.md via new Function(src)() so it runs unchanged on
  // desktop and iOS. Any of these would break it on mobile or in Node.
  const raw = readFileSync('_scripts/lib.js', 'utf8');
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')      // block comments
    .replace(/^\s*\/\/.*$/gm, '');          // line comments
  for (const banned of ['document', 'window.', 'require(', 'import ', 'export ', 'app.', 'dv.', 'process.']) {
    assert.ok(!code.includes(banned), `lib.js must not use ${banned} — it has to run on iOS`);
  }
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

test('cleanTaskText strips the due-date marker without orphaning a surrogate', () => {
  // The bug this guards: 📅 is U+1F4C5, a surrogate pair. In a character class
  // WITHOUT the /u flag, the regex matches a single code unit — so it ate the low
  // half plus the date and left the high half behind, which renders as a tofu box
  // at the end of every task on the dashboard.
  const out = lime.cleanTaskText('Email recruiter back 📅 2026-07-29');
  assert.equal(out, 'Email recruiter back');
  assert.equal(/[\uD800-\uDFFF]/.test(out), false, 'left an unpaired surrogate behind');
});

test('cleanTaskText strips every Tasks date marker, including cancelled', () => {
  for (const emoji of ['📅', '⏳', '🛫', '➕', '✅', '❌']) {
    assert.equal(lime.cleanTaskText(`do the thing ${emoji} 2026-07-29`), 'do the thing');
  }
});

test('cleanTaskText strips several markers on one task', () => {
  assert.equal(
    lime.cleanTaskText('finish OA ➕ 2026-07-18 📅 2026-07-31'),
    'finish OA'
  );
});

test('cleanTaskText keeps priority markers, which carry meaning', () => {
  // Priority emoji are not followed by a date, so they must survive.
  assert.equal(lime.cleanTaskText('urgent thing ⏫ 📅 2026-07-29'), 'urgent thing ⏫');
});

test('cleanTaskText keeps emoji the user wrote in the task itself', () => {
  assert.equal(lime.cleanTaskText('ship 🚀 the release 📅 2026-07-29'), 'ship 🚀 the release');
  assert.equal(lime.cleanTaskText('ship 🚀 the release'), 'ship 🚀 the release');
});

test('cleanTaskText tolerates a variation selector after the marker', () => {
  assert.equal(lime.cleanTaskText('thing ✅️ 2026-07-29'), 'thing');
});

test('cleanTaskText leaves an unmarked task alone', () => {
  assert.equal(lime.cleanTaskText('renew student pass'), 'renew student pass');
});

test('eventStartISO uses the date part directly for all-day events', () => {
  // All-day events carry a bare date. Parsing it as a Date and reformatting can
  // shift it a day depending on timezone, so the string is used as-is.
  assert.equal(
    lime.eventStartISO({ allDay: true, startDateTime: '2026-08-12T00:00:00+08:00' }),
    '2026-08-12'
  );
});

test('eventStartISO uses local time for timed events', () => {
  // The instant is built from LOCAL parts and serialised, so this expectation
  // holds in any timezone. Reporting the LOCAL day is the whole point of the
  // function — a fixture with a hardcoded offset would pass or fail depending
  // on where the machine is, which is not what we want to be testing.
  const local = new Date(2026, 6, 30, 14, 0);
  assert.equal(
    lime.eventStartISO({ allDay: false, startDateTime: local.toISOString() }),
    '2026-07-30'
  );
});

test('allDayLastDayISO subtracts a day because the plugin end is exclusive', () => {
  // The plugin documents this: a holiday running through Sep 14 reports an
  // endDateTime of Sep 15 00:00. Displaying the raw end is off by one.
  assert.equal(
    lime.allDayLastDayISO({ allDay: true, startDateTime: '2026-09-10T00:00:00+08:00', endDateTime: '2026-09-15T00:00:00+08:00' }),
    '2026-09-14'
  );
});

test('allDayLastDayISO handles a single-day all-day event', () => {
  assert.equal(
    lime.allDayLastDayISO({ allDay: true, startDateTime: '2026-08-12T00:00:00+08:00', endDateTime: '2026-08-13T00:00:00+08:00' }),
    '2026-08-12'
  );
});

test('allDayLastDayISO crosses a month boundary correctly', () => {
  assert.equal(
    lime.allDayLastDayISO({ allDay: true, startDateTime: '2026-07-30T00:00:00+08:00', endDateTime: '2026-08-01T00:00:00+08:00' }),
    '2026-07-31'
  );
});

test('fmtShortDate renders a compact day and month', () => {
  assert.equal(lime.fmtShortDate('2026-08-12'), '12 Aug');
  assert.equal(lime.fmtShortDate('2026-01-05'), '5 Jan');
});

test('isCacheFresh accepts a recent entry and rejects a stale one', () => {
  const now = 1_000_000;
  assert.equal(lime.isCacheFresh({ at: now - 1000, data: [] }, now, 5000), true);
  assert.equal(lime.isCacheFresh({ at: now - 9000, data: [] }, now, 5000), false);
});

test('isCacheFresh rejects a missing or malformed entry', () => {
  const now = 1_000_000;
  assert.equal(lime.isCacheFresh(null, now, 5000), false);
  assert.equal(lime.isCacheFresh(undefined, now, 5000), false);
  assert.equal(lime.isCacheFresh({ data: [] }, now, 5000), false);
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

// 2026-07-30 is a Thursday. "now" is 15:10 local.
const T_TODAY = '2026-07-30';
const T_TOMORROW = '2026-07-31';
const T_NOW = new Date(2026, 6, 30, 15, 10).getTime();

// Timed fixtures are built from LOCAL date parts and serialised, so they round-trip
// to the same local day wherever the tests run. Hardcoding a +08:00 offset here
// would make these tests pass in Singapore and fail in California, testing the
// machine's timezone rather than splitEvents.
function timed(startH, endH, summary, day = 30) {
  const start = new Date(2026, 6, day, startH, 0);
  const end = new Date(2026, 6, day, endH, 0);
  return {
    allDay: false,
    summary,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
  };
}
function allDayOn(day, summary) {
  const p = (n) => String(n).padStart(2, '0');
  return {
    allDay: true,
    summary,
    startDateTime: `2026-07-${p(day)}T00:00:00+08:00`,
    endDateTime: `2026-07-${p(day + 1)}T00:00:00+08:00`,
  };
}

test('splitEvents separates today from tomorrow and drops other days', () => {
  const out = lime.splitEvents([
    timed(9, 10, 'standup'),
    timed(11, 12, 'lab', 31),
    timed(9, 10, 'next week', 6),
  ], T_TODAY, T_TOMORROW, T_NOW);
  assert.deepEqual(out.today.past.map((e) => e.summary), ['standup']);
  assert.deepEqual(out.tomorrow.timed.map((e) => e.summary), ['lab']);
});

test('splitEvents puts ended events in past and future ones in upcoming', () => {
  const out = lime.splitEvents([
    timed(9, 10, 'standup'),
    timed(17, 18, 'recruiter call'),
  ], T_TODAY, T_TOMORROW, T_NOW);
  assert.deepEqual(out.today.past.map((e) => e.summary), ['standup']);
  assert.deepEqual(out.today.upcoming.map((e) => e.summary), ['recruiter call']);
});

test('splitEvents treats an in-progress event as upcoming, not past', () => {
  // It is 15:10 and this runs 14:00-16:00. It has not finished, so dimming it
  // as history would be wrong — it is what is happening right now.
  const out = lime.splitEvents([timed(14, 16, 'lecture')], T_TODAY, T_TOMORROW, T_NOW);
  assert.deepEqual(out.today.past, []);
  assert.deepEqual(out.today.upcoming.map((e) => e.summary), ['lecture']);
});

test('splitEvents keeps all-day events out of past and upcoming', () => {
  const out = lime.splitEvents([
    allDayOn(30, 'CS3230 Midterm'),
    allDayOn(31, 'public holiday'),
  ], T_TODAY, T_TOMORROW, T_NOW);
  assert.deepEqual(out.today.allDay.map((e) => e.summary), ['CS3230 Midterm']);
  assert.deepEqual(out.tomorrow.allDay.map((e) => e.summary), ['public holiday']);
  assert.deepEqual(out.today.past, []);
  assert.deepEqual(out.today.upcoming, []);
});

test('splitEvents sorts timed events ascending by start', () => {
  const out = lime.splitEvents([
    timed(17, 18, 'third'),
    timed(9, 10, 'first'),
    timed(14, 15, 'second'),
  ], T_TODAY, T_TOMORROW, T_NOW);
  assert.deepEqual(
    [...out.today.past, ...out.today.upcoming].map((e) => e.summary),
    ['first', 'second', 'third']
  );
});

test('splitEvents returns empty buckets rather than undefined', () => {
  const out = lime.splitEvents([], T_TODAY, T_TOMORROW, T_NOW);
  assert.deepEqual(out, {
    today: { allDay: [], past: [], upcoming: [] },
    tomorrow: { allDay: [], timed: [] },
  });
});

test('splitEvents includes a multi-day all-day event that spans today', () => {
  // A revision week starting Monday is still "today's" all-day event on Wednesday.
  const out = lime.splitEvents([{
    allDay: true, summary: 'revision week',
    startDateTime: '2026-07-27T00:00:00+08:00',
    endDateTime: '2026-08-03T00:00:00+08:00',
  }], T_TODAY, T_TOMORROW, T_NOW);
  assert.deepEqual(out.today.allDay.map((e) => e.summary), ['revision week']);
  assert.deepEqual(out.tomorrow.allDay.map((e) => e.summary), ['revision week']);
});

test('matchModuleEvents joins an event to a module code in its summary', () => {
  const events = [{ summary: 'CS3230 Midterm', startDateTime: '2026-08-12T09:00:00+08:00' }];
  const out = lime.matchModuleEvents(events, ['CS3230', 'CS2106']);
  assert.equal(out.length, 1);
  assert.equal(out[0].code, 'CS3230');
  assert.equal(out[0].event.summary, 'CS3230 Midterm');
});

test('matchModuleEvents finds a code mid-summary, not just as a prefix', () => {
  const out = lime.matchModuleEvents(
    [{ summary: 'Midterm for CS3230 (MPSH2)', startDateTime: '2026-08-12T09:00:00+08:00' }],
    ['CS3230']
  );
  assert.deepEqual(out.map((m) => m.code), ['CS3230']);
});

test('matchModuleEvents ignores events with no known code', () => {
  const out = lime.matchModuleEvents(
    [{ summary: 'Dentist', startDateTime: '2026-08-12T09:00:00+08:00' }],
    ['CS3230']
  );
  assert.deepEqual(out, []);
});

test('matchModuleEvents does not match a code that is part of a longer code', () => {
  // 'CS210' must not match 'CS2106' — a naive substring test would.
  const out = lime.matchModuleEvents(
    [{ summary: 'CS2106 lab', startDateTime: '2026-08-02T11:00:00+08:00' }],
    ['CS210']
  );
  assert.deepEqual(out, []);
});

test('matchModuleEvents is case-insensitive on the code', () => {
  const out = lime.matchModuleEvents(
    [{ summary: 'cs3230 tutorial', startDateTime: '2026-08-12T09:00:00+08:00' }],
    ['CS3230']
  );
  assert.deepEqual(out.map((m) => m.code), ['CS3230']);
});

test('matchModuleEvents sorts by start and tolerates an empty code list', () => {
  const events = [
    { summary: 'CS3230 Midterm', startDateTime: '2026-08-12T09:00:00+08:00' },
    { summary: 'CS2106 lab', startDateTime: '2026-08-02T11:00:00+08:00' },
  ];
  assert.deepEqual(
    lime.matchModuleEvents(events, ['CS3230', 'CS2106']).map((m) => m.code),
    ['CS2106', 'CS3230']
  );
  assert.deepEqual(lime.matchModuleEvents(events, []), []);
});
