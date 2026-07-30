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

// Strip the Tasks plugin's date markers ("… 📅 2026-07-29") for display.
//
// The /u flag is load-bearing. 📅 is U+1F4C5, a surrogate pair; without /u a
// character class matches a single code UNIT, so the pattern consumed only the
// low half plus the date and orphaned the high half — an unpaired surrogate that
// renders as a tofu box at the end of every task.
//
// Matching \p{Extended_Pictographic} rather than a hand-listed emoji set means a
// marker Tasks adds later still gets stripped. It only fires when the pictograph
// is followed by an ISO date, so emoji the user typed in the task text survive,
// and so do priority markers (⏫ etc.) which carry meaning and take no date.
function cleanTaskText(text) {
  return String(text)
    .replace(/\s*\p{Extended_Pictographic}️?\s*\d{4}-\d{2}-\d{2}/gu, '')
    .trim();
}

// ── calendar events ──────────────────────────────────────────────────────────
//
// Shapes ICS Calendar plugin events (its IEvent interface) for display. Stays
// pure: takes plain objects, returns plain data, touches no plugin API.

// Which local day an event belongs to.
//
// All-day events carry a bare date at midnight. Round-tripping that through Date
// and back can shift it a day depending on the offset, so its date part is taken
// verbatim. Timed events are parsed, because their local day is what matters.
function eventStartISO(event) {
  if (event.allDay) return String(event.startDateTime).slice(0, 10);
  return fmtISO(new Date(event.startDateTime));
}

// An all-day event's true final day.
//
// The plugin documents that all-day DTEND is EXCLUSIVE: an event running through
// Sep 14 reports endDateTime of Sep 15 00:00. Showing the raw end is off by one.
function allDayLastDayISO(event) {
  const end = parseISO(String(event.endDateTime).slice(0, 10));
  end.setDate(end.getDate() - 1);
  return fmtISO(end);
}

function fmtShortDate(iso) {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// The ICS plugin re-downloads and re-parses the whole feed on every getEvents()
// call, and Dataview re-renders on any vault change — so without a cache every
// keystroke in a daily note costs a calendar download.
function isCacheFresh(entry, nowMs, ttlMs) {
  if (!entry || typeof entry.at !== 'number') return false;
  return nowMs - entry.at < ttlMs;
}

// Undated tasks sink to the bottom; everything else is chronological, so the
// most-overdue item is always the first thing read.
function compareTasks(a, b) {
  if (!a.dueISO && !b.dueISO) return 0;
  if (!a.dueISO) return 1;
  if (!b.dueISO) return -1;
  return a.dueISO < b.dueISO ? -1 : a.dueISO > b.dueISO ? 1 : 0;
}

// Group a day's events for the "Next up" panel.
//
// All-day events are kept apart from timed ones: they have no start time, so they
// cannot sort among them, and spec §5.1 pins them above their own day's section.
// A multi-day all-day event counts for every day it covers, so a revision week
// still shows on the Wednesday.
//
// "past" means ENDED. An event that has started but not finished is what is
// happening right now, so it belongs in upcoming — dimming it as history would be
// actively misleading.
function splitEvents(events, todayISO, tomorrowISO, nowMs) {
  const out = {
    today: { allDay: [], past: [], upcoming: [] },
    tomorrow: { allDay: [], timed: [] },
  };
  const byStart = (a, b) => new Date(a.startDateTime) - new Date(b.startDateTime);

  for (const e of events) {
    if (e.allDay) {
      const from = eventStartISO(e);
      const to = allDayLastDayISO(e);
      if (todayISO >= from && todayISO <= to) out.today.allDay.push(e);
      if (tomorrowISO >= from && tomorrowISO <= to) out.tomorrow.allDay.push(e);
      continue;
    }
    const day = eventStartISO(e);
    if (day === todayISO) {
      const ended = new Date(e.endDateTime).getTime() <= nowMs;
      (ended ? out.today.past : out.today.upcoming).push(e);
    } else if (day === tomorrowISO) {
      out.tomorrow.timed.push(e);
    }
  }

  out.today.past.sort(byStart);
  out.today.upcoming.sort(byStart);
  out.tomorrow.timed.sort(byStart);
  return out;
}

// Join calendar events to module notes on the MODULE CODE, never on the date.
//
// Google Calendar owns when an exam is; 02-Learning/Modules/ owns which modules
// exist. Matching on the code means the date is stored exactly once and cannot
// drift (spec M2-D3).
//
// Word boundaries matter: a plain substring test would let 'CS210' match
// 'CS2106' and attach an event to the wrong module.
function matchModuleEvents(events, moduleCodes) {
  const out = [];
  for (const event of events) {
    const summary = String(event.summary || '');
    for (const code of moduleCodes) {
      const escaped = String(code).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(summary)) {
        out.push({ event, code });
        break;
      }
    }
  }
  return out.sort((a, b) => new Date(a.event.startDateTime) - new Date(b.event.startDateTime));
}

globalThis.lime = {
  fmtISO, fmtDayLabel, relativeAge, dueStatus, cleanTaskText, compareTasks,
  parseISO, daysBetween,
  eventStartISO, allDayLastDayISO, fmtShortDate, isCacheFresh, splitEvents,
  matchModuleEvents,
};
