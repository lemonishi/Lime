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
