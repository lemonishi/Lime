# lime

A personal Obsidian vault built to be **one place to view and manage everything day-to-day** — tasks, study, work, job applications, money, and reading.

Not a general-purpose PKM system. It was designed around one person's actual life: a CS undergraduate who is simultaneously interning, job hunting, working through learncpp and the NeetCode 150, building side projects, and logging every expense. Where a generic template would offer options, this makes a decision.

> **Status: M2 (Calendar) of 6 milestones.** The vault runs and you can work out of it today, and the dashboard now reads your Google Calendar. Capture, and the learning/money/job-search panels are not built yet — see the [roadmap](#roadmap).

---

## The dashboard

`00-Home/Home.md` is the thing you open every morning. Three columns, everything visible at once, built from `dataviewjs` over plain markdown.

```
┌ banner ────────────────────────────────────────────────────────────┐
│                                          Wednesday 29 July         │
├ COLUMN 1 ─────────┬ COLUMN 2 ───────────────┬ COLUMN 3 ────────────┤
│ Recent            │ Next up                 │ (M4/M5)              │
│                   │   today + tomorrow's    │                      │
│                   │   calendar events       │                      │
│                   │ Due & overdue           │                      │
│                   │   overdue first, then   │                      │
│                   │   today, colour-coded   │                      │
│                   │ Upcoming dates          │                      │
│                   │   exams joined to       │                      │
│                   │   module notes          │                      │
└───────────────────┴─────────────────────────┴──────────────────────┘
```

**Panels hide themselves when empty.** Nothing renders a sad "no items" box — with no due tasks, the Due & overdue panel simply isn't there. That is what keeps a dense layout honest as your usage shifts. (Next up is a deliberate exception: a genuinely empty 21-day calendar window still renders a one-line message, because an empty panel would otherwise be indistinguishable from a silently broken feed — see the design spec's M2-D6.)

Tasks are ordinary `- [ ]` checkboxes written wherever you happen to be, with an optional `📅 2026-07-29`. The dashboard sweeps the whole vault into one list. Ticking a box there rewrites that exact line in the source note — and springs back if the write doesn't land, so the dashboard never shows a completed task that is still open on disk.

The calendar panels read a Google Calendar via the ICS Calendar plugin, cached for five minutes so typing in a daily note never costs a network round-trip. See [SETUP.md](SETUP.md) for connecting your own calendar.

## Structure

```
00-Home/      dashboard + capture inbox
01-Daily/     one note per day
02-Learning/  Modules · Courses · Drills · Concepts
03-Work/      internship hub, deliberately unstructured
04-Projects/  one note per project
05-JobSearch/ Applications · Companies
06-Money/     one ledger file per month
07-Reading/   one note per book
08-Notes/     everything that doesn't fit above
09-Archive/   done, dead, abandoned
```

One principle throughout: **one note per thing — frontmatter tracks it, the body is where you write.** No note is ever the wrong kind.

## Setup

Requires **Obsidian 1.12.7+** and **Node 24**. Zero npm dependencies.

```bash
git clone https://github.com/lemonishi/Lime.git
cd Lime
npm test               # 56 tests, no install step needed
npm run install-plugins  # only if plugin versions have drifted
```

Then follow **[SETUP.md](SETUP.md)** for the parts that need Obsidian's GUI — the whole thing is about ten minutes, and it ends with M1 and M2 acceptance checklists.

Drop your own image at `_assets/home-banner.jpg` to change the header; `object-fit: cover` crops anything sensibly.

## Decisions worth knowing

**Plugin versions are pinned, and the installer enforces it.** `scripts/install-plugins.mjs` refuses to install any plugin whose manifest `minAppVersion` exceeds your app version, and `npm test` fails loudly if Obsidian's updater overwrites a pin. This exists because several popular plugins ship current releases that fail *silently* on older Obsidian — a blank settings pane, no error.

**Dataview is a knowing bet.** It has been unmaintained since April 2025 and powers every dashboard widget. It is acceptable because no data depends on it: every note is plain markdown with plain frontmatter, so if Dataview died tonight the dashboard breaks and not one note is lost. Rebuilding `Home.md` against Bases is a day's work, not a redesign.

**No `obsidian-columns`.** Three columns come from a plain CSS grid in `.obsidian/snippets/lime.css`. The plugin has been unmaintained since November 2024, and this avoids a second dependency for something CSS does natively — and it collapses to one column on iOS with a media query rather than JavaScript.

**Dashboard logic works on mobile.** `_scripts/lib.js` holds pure functions with no DOM, Obsidian, or Node APIs, loaded via `app.vault.adapter` + `new Function` — the one mechanism that works identically on desktop and iOS. The tests load it through that same path, so they exercise the real load rather than a mock.

**`Dataview → JavaScript Queries` must be on.** Dataview ships it *off*, which renders every block as a disabled-queries message with nothing in the console. This repo commits the setting turned on.

## Roadmap

| | Milestone | Status |
|---|---|---|
| M1 | Foundation — skeleton, plugins, daily notes, dashboard | **done** |
| M2 | Calendar — Google Calendar read-only via ICS | **done** |
| M3 | Capture — QuickAdd actions, mobile toolbar | next |
| M4 | Learning — courses, drills, spaced-repetition review panel | |
| M5 | Job search + money — applications, backlinked companies, ledger | |
| M6 | Housekeeping — needs-attention panel, Bases views, archive flow | |

Each milestone ends in a checkpoint: use it for a few days, then the next one gets planned against what actually annoyed you.

## Design docs

The full reasoning lives in [`docs/superpowers/`](docs/superpowers/) — a design spec per milestone covering every decision and why, plus the matching implementation plans. Worth reading if you want the *why* rather than the *what*.

## Privacy

This repository is public and holds **only the scaffolding**. Every personal folder is gitignored down to its `.gitkeep`: daily notes, learning, work, projects, job search, money, reading, archive, and the capture inbox never leave your machine. `.gitignore` documents the boundary — read it before adding a new content folder.

---

Header image is [Steins;Gate](https://en.wikipedia.org/wiki/Steins;Gate) artwork, © 5pb./Nitroplus/White Fox — included for personal use, not owned by this project. Swap in your own.
