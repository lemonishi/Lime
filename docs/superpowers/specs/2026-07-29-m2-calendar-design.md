# lime M2 — Calendar: design spec

**Date:** 2026-07-29
**Status:** approved, ready for implementation planning
**Parent spec:** `docs/superpowers/specs/2026-07-28-lime-vault-design.md` — that document remains the authority; this one details M2 (its §10).
**Depends on:** M1, merged at `28a5817`.

---

## 1. Purpose

Make *"one place to view everything"* literally true by putting the owner's Google
Calendar on the dashboard.

Two panels: what is happening now and next, and when the exams are.

## 2. What we know about the owner's calendar

Established during design, and it shapes everything below:

- **One personal Google Calendar.** Not several. One secret URL, not a set.
- **Everything is in it** — lectures, exams, internship meetings, recruiter calls. No
  separate corporate calendar we cannot reach.
- **Mostly scheduled in advance, but same-day additions happen.** This is why feed
  freshness is a real question rather than an academic one.

## 3. Decisions

Continuing the parent spec's D-series; these are M2's own.

| # | Decision | Rationale |
|---|---|---|
| M2-D1 | **Measure the ICS lag before building anything to work around it.** | See §4. The parent spec asserted "8–24 hours" as fact; that was never measured and is not reliable. |
| M2-D2 | **Events panel = today + tomorrow**, all-day pinned to the top, a "now" line dividing done from upcoming, past events dimmed rather than removed. | Chosen from three mockups. Today-only tells you about a 9am exam at 8:55; a rolling window loses the day boundary and "what did I do today". |
| M2-D3 | **Exam dates join on the module code, never duplicated.** Google Calendar holds *when*; `02-Learning/Modules/` holds *what modules exist*; the panel matches events whose summary contains a known code. | A date stored once cannot drift. Preserves D4 (Google is source of truth) while still surfacing exams next to the module. |
| M2-D4 | **One fetch, shared by both panels, cached ~5 minutes on `globalThis`.** | The plugin does **no caching** — every `getEvents()` call re-downloads and re-parses the whole ICS. Dataview re-renders on any vault change, so without a cache every keystroke in a daily note costs a calendar download. |
| M2-D5 | **21-day lookahead window.** | Exam periods cluster; 14 days would hide much of an exam block. One variadic call covers it. |
| M2-D6 | **Empty and broken must not look the same.** A genuinely clear day hides the panel; a detectable failure renders a visible one-line message. | An empty panel reads as "clear day". If a failed fetch rendered nothing, the owner would miss a meeting. This is a deliberate exception to parent spec §8's "widgets hide when empty". |
| M2-D7 | **Click-to-join where the event carries a meeting link.** | The plugin exposes `callUrl`. For a daily standup this is the most-used affordance on the panel. Rows without a link do nothing. |

## 4. The freshness question — and why M2 ships without resolving it

The parent spec states Google refreshes secret iCal feeds "**8–24 hours**" behind, as
established fact. **That figure was never measured and should not be trusted.** It is
widely repeated but also dated; Google has changed this behaviour over the years and
reports range from minutes to a day. Nobody has measured it on this account.

The decision it gates is expensive: OAuth-authenticated reads mean a Google Cloud
project, credentials, and a dependency on the `google-calendar` plugin whose author has
declared it unmaintained (parent spec D3 explicitly refused to make it a backbone).

**So M2 measures instead of guessing.** The ICS path is small. The acceptance checklist
carries one extra step: add an event on the phone, note the time, and record when it
appears in Obsidian.

| Measured lag | Consequence |
|---|---|
| Minutes | Done. OAuth would have been complexity bought for nothing. |
| Hours | Real problem, given same-day additions. Becomes **M2.5**: OAuth reads via `google-calendar`, same panels, different source. |

**Rejected alternative:** build both now — ICS as a floor, OAuth preferred when alive.
Defensible if the lag were confirmed bad, but it doubles M2's surface area to hedge
against an unmeasured number, and leaves a fallback path maintained forever if the lag
turns out fine.

**Accepted cost:** if the lag *is* bad, the owner spends a few days with a calendar panel
they cannot fully trust. Everything else on the dashboard is already useful, so this is
tolerable.

**The fetch sits behind one function** (§6) precisely so that M2.5 swaps the source
without touching either panel.

## 5. The panels

Both live in **column 2** of the existing three-column grid.

### 5.1 "Next up" — above Due & overdue

```
┌ NEXT UP ─────────────────────────────────┐
│ ┌ CS3230 Midterm              all day ┐  │  ← all-day pinned top
│ │ 09:30  Standup                      │  │  ← dimmed (past)
│ │ 14:00  CS3230 lecture               │  │  ← dimmed (past)
│ ── NOW 15:10 ─────────────────────────   │  ← divider, only when both sides exist
│ │ 17:00  Recruiter call — Stripe      │  │
│ TOMORROW · THU 30 JUL                    │  ← divider, only when tomorrow has events
│ │ 09:30  Standup                      │  │
│ │ 11:00  CS2106 lab                   │  │
└──────────────────────────────────────────┘
```

- **All-day events pin to the top of their own day's section.** Today's all-day events go
  above today's timed events; tomorrow's go directly under the tomorrow divider, above
  tomorrow's timed events. They have no start time and cannot sort among timed events.
  Note the plugin's own warning: all-day `endDateTime` is **exclusive** — an event running
  through the 14th reports an end of the 15th at 00:00, so display must subtract a day.
- **All-day events never dim.** The now line divides timed events only; an all-day exam is
  relevant all day and must not grey out because the clock passed some arbitrary point.
- **The now line renders only when there is something on both sides.** A morning with
  nothing yet past should not show a divider pinned to the top.
- **The tomorrow divider renders only when tomorrow has events.**
- **Click-to-join** where `callUrl` exists (M2-D7).

### 5.2 "Upcoming dates" — below Due & overdue

Scans the 21-day window for events whose `summary` contains a module code present in
`02-Learning/Modules/`. Renders `CS3230 Midterm · 12 Aug`; clicking opens the module note.

**The join is on the code, not the date** (M2-D3):

```
Google Calendar          02-Learning/Modules/CS3230.md      Dashboard
─────────────────        ─────────────────────────────      ──────────────────
"CS3230 Midterm"    +    code: CS3230                  →    CS3230 Midterm  12 Aug
12 Aug 09:00             (no dates stored)                  → links to the note
```

**Known limitation, accepted by the owner:** this works only when calendar events actually
contain the module code. `CS3230 Midterm` joins; `Midterm` does not. That is a naming habit,
not something the code can enforce. Record it in `SETUP.md` so it is a known convention
rather than a mystery.

## 6. Architecture

Same split as M1, and for the same reason.

**Pure, in `_scripts/lib.js`** — no DOM, no Obsidian API, no Node API, so it is unit-tested
through the real `new Function(src)()` load path:

| Function | Contract |
|---|---|
| `splitEvents(events, todayISO, tomorrowISO, nowMs)` | `{ allDay, past, upcoming, tomorrow }` — groups and orders for the panel |
| `matchModuleEvents(events, moduleCodes)` | events whose summary contains a known code, each tagged with the code it matched |
| `isCacheFresh(entry, nowMs, ttlMs)` | cache TTL predicate |

**Impure, in `00-Home/Home.md`:** one `fetchEvents()` wrapper holding the `getEvents()`
call and the `globalThis` cache, plus DOM rendering. **All calendar access goes through
that one wrapper** — no scattered `getEvents()` calls — because M2.5 may replace its
internals wholesale.

`Home.md` grows from ~140 to roughly 200 lines. Acceptable. **If M4's panels push it past
~250, extract rendering into a second script** rather than letting it sprawl.

> **Update after implementation: the trigger has already fired.** `Home.md` finished M2 at
> **279 lines** (the working `dataviewjs` block alone is ~253), so the ~250 threshold was
> crossed a milestone earlier than anticipated. The file is still comprehensible — each panel
> is a self-contained `{ }` block under a banner comment, reading top-to-bottom in render
> order — so extraction was deliberately *not* done mid-milestone. But M4 queues two more
> panels into the same block, which would push it past 350–400 lines.
>
> **M4's first panel-adding task must therefore open with "extract rendering into
> `_scripts/render.js`" as an explicit step**, not as an afterthought once the file is large
> enough that splitting it cleanly is hard.

## 7. Failure modes

| Situation | Detectable? | Behaviour |
|---|---|---|
| ICS plugin not installed | ✅ `app.plugins.getPlugin('ics')` is null | `Calendar plugin not installed` |
| No calendar configured | ✅ `plugin.data.calendars` has no keys | `No calendar configured — see SETUP.md` |
| Fetch failed / secret URL expired | ❌ **swallowed by the plugin; returns `[]`** | plausibility check, below |
| Genuinely no events | ✅ | panel hides (parent spec §8) |

**The gap is real and cannot be closed properly.** The plugin catches fetch errors, logs to
console, and returns an empty array — a broken feed is indistinguishable from a clear day.

**Mitigation:** if the *entire 21-day window* is empty, that is implausible for a calendar
holding the owner's whole life. In that case **render the "Next up" panel** — rather than
hiding it — containing the single line `No events in 21 days — check ICS settings if that
looks wrong`. It does not claim an error; it flags implausibility. Genuine errors also reach
the developer console, which the acceptance checklist already covers.

To be unambiguous about which of the two "empty" cases hides and which shows:

| 21-day window | Today + tomorrow | Panel |
|---|---|---|
| has events | has events | renders normally |
| has events | empty | **hides** — a genuinely clear couple of days |
| empty | empty | **shows** the implausibility line |

## 8. Plugin

| | Version | Notes |
|---|---|---|
| **ICS Calendar** (`ics`) | **1.14.3** | Released 2026-07-26. `minAppVersion` 1.9.12 ✓ against app 1.12.7. `isDesktopOnly: false`. Installed through `scripts/install-plugins.mjs`, so the version gate and pin-drift test cover it. |

`google-calendar` (YukiGasai) is **not** installed in M2. The parent spec called it a bonus;
it only becomes relevant if the §4 measurement forces M2.5, and installing it now would be
an unused dependency.

## 9. Setup the owner must do

Cannot be scripted — needs the Google Calendar web UI:

1. Google Calendar → hover the calendar → **⋮ → Settings**
2. **Integrate calendar → Secret address in iCal format → copy**
3. Obsidian → Settings → ICS → add a calendar, paste the URL
4. Run `ICS: Import events` once to confirm the feed parses

`SETUP.md` gains these steps, the module-code naming convention (§5.2), and the lag
measurement (§4).

> **The secret URL grants read access to the entire calendar to anyone holding it.** It must
> never be committed. `.obsidian/plugins/ics/data.json` holds it, and `.gitignore` already
> excludes `.obsidian/plugins/*/data.json` — the negations are per-plugin allowlists, so ICS
> is excluded by default. **Do not add a negation for it.** This repository is public.

## 10. Testing

- **Unit tests** for the three pure functions, using fixtures modelled on the plugin's real
  `IEvent` interface. Must cover the two edge cases the plugin's own source calls out:
  **all-day events have an exclusive end date**, and **recurring events arrive as separate
  instances**. Also: the now-line and tomorrow-divider suppression rules, and a module code
  that appears mid-summary rather than as a prefix.
- **`tests/dashboard.test.mjs`** already parses `Home.md` through Dataview's exact `await`
  wrapping, so the new blocks are covered against the `SyntaxError: Unexpected end of input`
  class of bug with no new work.
- **Runtime rendering** stays on the human acceptance checklist. `dataviewjs` executes only
  inside Obsidian; there is no headless harness, and building one remains out of scope.

## 11. Acceptance

- [ ] Secret URL configured; `ICS: Import events` reports events
- [ ] **Next up** shows today's real events in order
- [ ] All-day events pin to the top; a multi-day event shows its correct last day
- [ ] The now line appears only when events exist on both sides of it
- [ ] Tomorrow's events appear under the divider; the divider is absent when tomorrow is clear
- [ ] Past events are dimmed, not removed
- [ ] An event with a meeting link joins the call when clicked
- [ ] **Upcoming dates** shows an exam whose calendar summary contains a module code, and clicking opens the module note
- [ ] With the ICS plugin disabled, the panel says so rather than rendering nothing
- [ ] Editing a daily note does not visibly stall the dashboard (the cache is working)
- [ ] **Lag measurement:** add an event on the phone, record the time, record when it appears in Obsidian → **write the result into this spec**

## 12. Out of scope

Writing events from Obsidian (parent spec D4 — Google stays source of truth; the outbox
idea remains deferred), multiple calendars, a month or week grid view, and OAuth reads
unless §4's measurement demands them.
