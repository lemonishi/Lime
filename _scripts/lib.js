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
