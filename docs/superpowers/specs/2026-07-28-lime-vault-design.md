# lime — personal Obsidian vault: design spec

**Date:** 2026-07-28
**Status:** approved, ready for implementation planning
**Scope:** Phase A (the vault) only. Phase B (AI agent ecosystem) is a separate future spec.

---

## 1. Purpose

A single Obsidian vault that is the one place the owner manages and views their day-to-day
life. Their words: *"I just want a single point to manage all my day to day tasks. One place
to view everything and manage everything."*

Everything in this spec serves that sentence. Anything that does not is deferred or cut.

## 2. Who this is for

A computer science undergraduate who is simultaneously:

- **studying** — university modules with deadlines and exams
- **interning** — a current software internship
- **job searching** — applying for roles, multiple companies in flight
- **self-learning** — working through learncpp.com and the NeetCode 150 roadmap
- **building side projects** when there is free time
- **reading** books
- **tracking money** — wants every expense logged

Currently uses **Google Calendar and nothing else**. There is no existing system to migrate.

**Devices:** MacBook, Windows PC, iPhone. All three used.
**Obsidian version:** 1.12.7 on macOS — this *is* the current stable release. 1.13.x exists
only as a paid-Catalyst beta. Do not assume the user can upgrade. See §7 for the consequences.

## 3. Reference material

The user brought two links as inspiration:

- Reddit: `r/ObsidianMD` post "my new dashboard" (Reddit blocks automated fetching — not read)
- GitHub: `Nighty3098/OBSIDIAN_SECOND_BRAIN` (read in full)

### What the reference actually is

A stripped template vault from a Russian CS undergraduate who freelances. Numbered PARA-ish
folders (`0-Home` … `9-UNIVERSITY`), a three-column `HOME.md` launchpad built from
`dataviewjs` blocks re-rendering on a 20-second `setInterval`, Obsidian Bases files in
`8-DB/` for card views, and a `sync.sh` that git pulls/commits/pushes.

Widgets present: habit checkboxes writing to daily frontmatter, mini week calendar, daily-note
streak counter, random note, stats (notes / freelance income / books), weekly stats, tag
cloud, open tasks with live checkboxes, recent notes, freelance projects by deadline.

Enabled plugins: `dataview, obsidian-kanban, obsidian-tikzjax, obsidian-latex-suite,
image2latex, obsidian-columns, mehrmaid, drawio-obsidian, iconic, tag-wrangler,
simple-tab-indent, templater-obsidian, obsidian-charts, obsidian-style-settings,
file-explorer-plus, advanced-pdf-export, custom-note-width`

### What we take, and what we reject

**Take:** the numbered-folder skeleton, the dense multi-column dashboard concept, the
Dataview + Bases split (Bases for browsable views, Dataview for custom widgets).

**Reject, with reasons:**

| Rejected | Why |
|---|---|
| His widget *implementations* | Habit names hardcoded in three places; uncleaned `setInterval` loops; inline `onclick` HTML injection; vault name hardcoded as `MY_NOTES` in every link; checkbox handler blind-replaces the first `- [ ]` on a line. Rebuild, do not copy. |
| `obsidian-columns` plugin | Last commit Nov 2024. Layout A needs columns, but ~15 lines of CSS grid we own does the job and behaves better on iOS. Avoids a second unmaintained dependency. |
| Habit tracking | User explicitly parked it. |
| TikZ / LaTeX suite / image2latex / drawio / mehrmaid | His maths-heavy coursework, not the user's. Revisit only if modules demand it. |
| Freelance income tracking | Not applicable. |

**Note:** the reference has *no* Tasks plugin, *no* QuickAdd, and no capture system at all.
Its task handling is the hand-rolled JS criticised above. Adding both is our main improvement.

## 4. Decisions already made (do not relitigate)

| # | Decision | Rationale |
|---|---|---|
| D1 | **Tasks are inline `- [ ]` checkboxes**, written wherever the user is. Not one-note-per-task. | User's definition: "a task should have a title and an optional due date." Forcing a file per todo kills the habit. |
| D2 | **Obsidian Sync** (official, paid) for all three devices. | User chose it. Removes conflict handling from scope. |
| D3 | **Google Calendar read-only via ICS**; `google-calendar` plugin installed as a *bonus we do not depend on*. | The write-capable plugin is declared stale by its author (last commit Mar 2025). Fine as a bonus, unacceptable as a backbone. |
| D4 | Google Calendar stays **source of truth** for events. Obsidian never writes back. | Avoids three-device edit conflicts entirely. |
| D5 | **Daily notes: yes.** Habits: parked. | User's call. |
| D6 | **Dashboard layout A** — three columns, everything visible at once. | User picked it over "today first" and "now/areas split". |
| D7 | **Accept the Dataview dependency**; skip `obsidian-columns`. | See §7 risk. |
| D8 | **Needs-attention panel (status-vs-activity), with a collapsed plain-stale list underneath.** | Plain staleness surfaces concept notes that are *supposed* to be untouched; the panel would be ignored within a fortnight. |
| D9 | **Expense categories: `food, transport, books, subscriptions, fun, other`.** Fixed list, picker only, no free text. | Free text produces `food` / `Food` / `lunch` within a fortnight and silently wrong totals. No `delivery` split — user rejected it; the description field remains free text and searchable. |
| D10 | **Do not bulk-import all 150 NeetCode problems.** A drill note is created on first attempt. A roadmap tracker note carries the checkbox list for the progress bar. | 150 empty notes make the vault feel abandoned on day one. |
| D11 | **`git init` the vault.** Git for history, Obsidian Sync for propagation. | User approved. |
| D12 | **Checkpoint after every milestone** — plan the next one only after the user has lived with the last. | User approved. Waterfall with review gates. |
| D13 | **WhatsApp integration: refused.** Telegram/Discord: possible, deferred to phase B. | No personal WhatsApp API exists; `whatsapp-web.js` / Baileys violate ToS with real ban risk. Telegram Bot API and a Discord bot in one's own server are both legitimate. Reading Discord DMs via user token is self-botting and out of scope. |

## 5. Structure

```
lime/
├─ 00-Home/
│   ├─ Home.md              ← the dashboard (layout A)
│   └─ Inbox.md             ← unsorted capture
├─ 01-Daily/                ← 2026-07-28.md, one per day
├─ 02-Learning/
│   ├─ Modules/             ← type: module   (university)
│   ├─ Courses/             ← type: course   (learncpp, textbooks)
│   ├─ Drills/              ← type: drill    (NeetCode problems)
│   └─ Concepts/            ← type: concept  (Dynamic Programming)
├─ 03-Work/                 ← internship hub + ad-hoc notes
├─ 04-Projects/             ← one note per project
├─ 05-JobSearch/
│   ├─ Applications/        ← type: application
│   └─ Companies/           ← type: company (backlink magnets)
├─ 06-Money/                ← 2026-07.md, one ledger per month
├─ 07-Reading/              ← one note per book
├─ 08-Notes/                ← anything that doesn't fit above
├─ 09-Archive/              ← done, dead, abandoned
├─ _assets/                 ← images used by the vault (home-banner.jpg)
└─ _templates/              ← Templater templates + source PDFs for later RAG
```

**Numbered prefixes** keep the sidebar in deliberate rather than alphabetical order.
**`08-Notes` is deliberately vague** — its existence protects the other folders from bloat.
**There is no `Tasks/` folder** — see D1.

## 6. Note schema

Governing principle: **one note per thing — frontmatter tracks it, the body is where you
write.** This dissolves the "is this a tracking area or a writing area" question; no note is
ever the wrong kind.

```yaml
# type: daily — 01-Daily/2026-07-28.md
type: daily
date: "2026-07-28"   # quoted — see note below
# body: ## Log (freeform, [[links]] encouraged) + ## Tasks

# type: module — university course
type: module
code: CS3230
semester: 2026-S1
dates:            # assignment/exam dates, feed the dashboard
  - { label: midterm, date: 2026-08-12 }

# type: course — self-directed linear resource
type: course
source: learncpp.com
url: https://learncpp.com
progress: 8.3     # renders as progress bar against `total`
total: 27
status: active    # active | paused | done
last_touched: 2026-07-26

# type: drill — a practice problem
type: drill
source: neetcode
topic: "[[Dynamic Programming]]"
difficulty: medium          # easy | medium | hard
status: solved              # todo | attempted | solved
last_attempted: 2026-06-27
attempts: 2
confidence: 1               # 1–5, drives "due for review"

# type: concept — a linked idea note
type: concept
# body: freeform. No required fields — this is the Zettelkasten-ish layer.

# type: project
type: project
status: active              # active | paused | done | abandoned
stack: [react, vercel]
repo: https://github.com/…
updated: 2026-07-25

# type: application — a job application
type: application
company: "[[Stripe]]"
role: Backend Intern
status: applied             # applied | oa | interview | offer | rejected | ghosted
applied: 2026-07-18
next_action: 2026-07-31

# type: company — backlink magnet, assembles itself
type: company
status: active

# type: book
type: book
status: reading             # want | reading | done
author: Martin Kleppmann
rating:                     # 1–5, set on finish
finished:

# type: ledger — one file per month, 06-Money/2026-07.md
type: ledger
month: 2026-07
# body: one line per expense, written by capture, never hand-typed:
# - 28 Jul · 4.50 · food · lunch
```

### A note on quoting dates in frontmatter

**Values written by a *template* must be quoted; values written by a human or by capture need not be.**

The daily note's `date` comes from core Daily Notes' `{{date:YYYY-MM-DD}}` placeholder. Unquoted, YAML reads a value starting with `{` as a flow mapping, so `{{...}}` is a mapping used as a key — which YAML rejects. The template file would sit permanently unparseable in the vault, and Obsidian's metadata cache and Dataview index *every* markdown file, template folders included, before any filter applies. Verified against a standards-compliant parser.

Quoting has a second effect worth knowing: the substituted value stays a **string** (`"2026-07-29"`) instead of becoming a YAML date object. That is what we want here — `_scripts/lib.js` works in `YYYY-MM-DD` strings throughout, and those sort correctly lexicographically.

The other date fields in this spec (`due`, `applied`, `last_attempted`, `finished`, `next_action`) are written directly into real notes, never through a `{{...}}` placeholder, so they carry no such hazard. Leaving them unquoted lets Dataview type them as dates, which is what its date filters expect. Do not "normalise" the two cases to match — they differ for a reason.

### Linking policy

Links are a **byproduct of writing, never a chore**. No MOCs, no index notes, no link-hygiene
rituals. The graph view is explicitly not designed for — it is decorative.

Two places linking genuinely pays, and the design supports exactly these:

1. **Job search.** `[[Stripe]]` is a real note. Applications, call notes, daily-note mentions
   and interview prep all link to it, so the company page assembles itself from backlinks.
   This is the strongest case — scattered fragments about a recurring entity.
2. **Study concepts.** `[[Dynamic Programming]]` referenced from a lecture note, a drill, and
   a project. Convergence makes it the thing worth revising from before an interview.

Linking earns nothing for finances, calendar events, or most internship notes. Do not build
for it there.

## 7. Stack

| Component | Version | Notes |
|---|---|---|
| **Templater** | **2.20.6 — PINNED** | 2.21+ requires app 1.13.0. 2.20.6 (minApp 1.12.2) is the newest that runs on 1.12.7. |
| **QuickAdd** | **2.12.3 — PINNED** | 2.13+ requires 1.13.0 and renders a blank settings pane on 1.12.7. |
| **Tasks** | 8.3.0 | Due-date semantics, done-dates, recurrence, query language. Replaces the reference's hand-rolled checkbox JS. |
| **Dataview** | 0.5.68 | Dashboard widgets. See risk below. |
| **Bases** | core | No install. Browsable table/card views per note type. |
| **ICS Calendar** | 1.14.3 | Reads the Google secret ICS URL. Actively maintained. |
| **Google Calendar** (YukiGasai) | 1.10.16 | **Bonus only.** Author declares it stale. Never a dependency. |
| **Obsidian Sync** | — | Three devices. |
| CSS snippet (ours) | — | Three-column grid + dashboard styling. Replaces `obsidian-columns`. |

> **PIN WARNING.** Obsidian's plugin updater will offer newer Templater and QuickAdd builds
> that silently break on 1.12.7. These two pins must survive; do not blind-update. Before
> installing or updating *any* plugin, check its manifest `minAppVersion` against
> `defaults read /Applications/Obsidian.app/Contents/Info.plist CFBundleShortVersionString`.

### Primary risk: Dataview

Dataview's last commit was **April 2025**. It powers every dashboard widget and is not
actively maintained. Accepted knowingly (D7) because:

1. **No data depends on it.** Every note is plain markdown with plain frontmatter. If Dataview
   died tonight the dashboard breaks; not one note is lost.
2. **Bases is core, first-party, and improving.** The migration path is real and the gap
   narrows each Obsidian release.
3. **The dashboard is one file.** Rebuilding `Home.md` against another engine is a day.

Rejected alternative: Bases-only. Cannot render progress bars or multi-field sorted lists —
a visibly worse dashboard today to dodge a risk that may never arrive.

### Cost-to-undo, ranked

- **Frontmatter schema** — *moderate.* Renaming a field across 80 notes is a scripted
  find-and-replace, but real work. This is why fields were challenged during design.
- **Dataview dependency** — *moderate, deferred.* Above.
- **Numbered folder names** — *cheap.* Obsidian rewrites links on rename.
- **Sync choice** — *cheap.* A folder of files; revisited in phase B.

## 8. The dashboard — `00-Home/Home.md`

Layout **A**: three columns, everything visible. Built from `dataviewjs` blocks in a CSS-grid
container we own.

```
┌ COLUMN 1 ────────┬ COLUMN 2 ──────────────┬ COLUMN 3 ─────────────┐
│ Capture buttons  │ Today · <date>         │ Learning progress     │
│ This week strip  │   (calendar events)    │   learncpp   8.3/27   │
│ Areas nav        │ Due & overdue          │   NeetCode  47/150    │
│ Reading          │   (Tasks query)        │ Due for review        │
│ Recent           │ Applications needing   │   (stale drills,      │
│ Needs attention  │   action               │    weakest first)     │
│  + collapsed     │ Upcoming dates         │ This month  $412      │
│    stale list    │   (module deadlines)   │ Active projects       │
└──────────────────┴────────────────────────┴───────────────────────┘
```

### Header banner

A cropped banner strip above the three columns — the reference's idea, sized so it does not
cost a scroll. Rejected alternatives: full-height image (pushes "Due & overdue" below the
fold — the single most important panel) and a corner thumbnail (cheapest, but too plain for
what the user wanted).

- **Image:** `_assets/home-banner.jpg` — 1920×1080, committed to the repo.
- **Embed, not a plugin.** A plain `![[home-banner.jpg]]` at the top of `Home.md` plus our CSS
  snippet. No banners plugin; consistent with rejecting `obsidian-columns`.
- **Height ~170px**, `object-fit: cover`, `object-position: 50% 30%`. The subject's face sits
  ~30% down the frame; that offset centres the strip on it instead of slicing across the eyes
  or landing on the monitors behind her.
- **Today's date overlaid** bottom-left in white with a soft text-shadow, over a subtle
  bottom gradient so it stays legible whatever the crop lands on.
- **Filename referenced in exactly one place** so swapping the image is a one-line edit.
  `object-fit: cover` means any replacement works without resizing.
- **Mobile:** reduce to ~110px. The columns already collapse to one scrolling column; the
  banner must not eat a third of an iPhone screen.
- **Note:** this image is dark and heavily saturated. It sits naturally on a dark Obsidian
  theme. If the user later switches to a light theme, the banner will read as a heavy dark
  block and may want a different image — not a blocker, just a known interaction.

### Implementation requirements

- **Widgets hide themselves when empty.** Layout A's weakness is visible dead zones; an
  unfed reading widget must vanish rather than render an empty box every morning.
- **Never end a `dataviewjs` block with a `//` line comment.** When a script contains `await`,
  Dataview wraps it by *string concatenation* — `"(async () => { " + script + " })()"` — and
  Obsidian strips the trailing newline first. A final line comment therefore swallows the
  closing `})()`, and the block dies with `SyntaxError: Unexpected end of input`, naming
  neither the block nor the cause. Put trailing notes above the last statement, or use
  `/* … */`. Guarded by `tests/dashboard.test.mjs`, which applies Dataview's exact wrapping.
- **No uncleaned `setInterval`.** The reference leaks a timer per render. Register any
  interval so Obsidian can dispose of it, or re-render on vault events instead.
- **No inline `onclick` string-built HTML.** Attach listeners properly; note titles can
  contain quotes.
- **No hardcoded vault name.** The reference hardcodes `MY_NOTES` in every `obsidian://`
  link. Use `app.workspace.openLinkText` or read the vault name at runtime.
- **Checkbox toggles must target the exact task**, by file path and line, and must not blind-
  replace the first `- [ ]` on a line. Prefer the Tasks plugin's own toggle where possible.
- **Mobile:** three columns collapse to one scrolling column on iPhone via CSS, not JS.

### "Needs attention" panel rules (D8)

Surfaces only notes whose **declared status contradicts their activity**:

| Group | Rule |
|---|---|
| Stalled | `type: project` or `course` with `status: active` and file `mtime` > 21d ago |
| Ghosted | `type: application` with non-terminal status and file `mtime` > 30d ago |
| Unsorted | count of items in `00-Home/Inbox.md` + age of the oldest |
| Stubs | any note with a body under 20 words, created > 7d ago |

**Use file `mtime`, not a frontmatter `updated` field**, for every staleness rule. A
hand-maintained `updated` field is exactly the thing that stops being maintained on a note
the user has abandoned — which would make abandoned notes look fresh. The one exception is
`type: course`, where `last_touched` is set by the user as part of logging progress and is
therefore more meaningful than `mtime`; use `last_touched` there and fall back to `mtime`
if absent.

Below these, a **collapsed** plain-stale list (oldest `mtime` first) for the raw view.
A concept note has no status to contradict and must never appear in the top groups.

### "Due for review" rules

`type: drill`, `status` in {attempted, solved}, sorted by staleness × (6 − confidence).
Low confidence and long absence float to the top. This is deliberately a poor-man's spaced
repetition built from a Dataview query — no extra plugin.

## 9. Capture

**Rule: nothing entered more than once a day may require typing syntax.** The user never
hand-writes a ledger line or YAML frontmatter — QuickAdd generates both.

Six QuickAdd actions, each with a desktop hotkey, a mobile toolbar button, and a dashboard
button firing the same command (one implementation, three surfaces):

| Action | Prompts | Destination |
|---|---|---|
| **+ task** | text, optional due date | today's daily note, under `## Tasks` |
| **+ expense** | amount, category *(picker, D9)*, short note | `06-Money/YYYY-MM.md`, one formatted line |
| **+ note** | title | new note in `08-Notes/` |
| **+ drill** | name, topic, difficulty | `02-Learning/Drills/`, from template |
| **+ book** | title, author | `07-Reading/`, `status: want` |
| **+ application** | company, role | `05-JobSearch/Applications/`, `status: applied` |

`+ task` is primarily a *mobile* affordance — at a keyboard, typing
`- [ ] thing 📅 tomorrow` into the daily note is faster, and both paths produce identical
markdown. Do not build the button as if it were the primary path.

**Daily notes** are auto-created by the core Daily Notes plugin from a Templater template.

**Deliberately not built:** capture for calendar events (Google Calendar app is better), for
work notes (too varied to template), for concepts (created by clicking a `[[link]]`).

## 10. Milestones

Every milestone leaves a usable vault. **Checkpoint after each (D12)** — the user lives with
it, then the next milestone is planned against what actually annoyed them.

| M | Deliverable | Done when |
|---|---|---|
| **M1 · Foundation** | Folder skeleton, plugins + pins, daily notes from template, Tasks configured, `Home.md` with Today / Due & overdue / Recent | The user can run their day off it |
| **M2 · Calendar** | ICS Calendar wired to the Google secret URL; Today panel shows real events. `google-calendar` installed as bonus | "One place to view everything" is literally true |
| **M3 · Capture** | Six QuickAdd actions, mobile toolbar, dashboard capture row | iPhone capture is frictionless |
| **M4 · Learning** | Modules, courses, drills, concepts. Progress bars. Due-for-review panel | learncpp + NeetCode properly tracked |
| **M5 · Job search + money** | Applications, company backlink notes, monthly ledger, spending panel | Nothing falls through on applications |
| **M6 · Housekeeping** | Needs-attention panel + collapsed stale list, Bases browse views, archive flow, CSS polish | The vault maintains itself |

M2 is deliberately early and small: seeing a real calendar in the dashboard on day two is the
highest motivation-per-hour work in the plan.

> **M2 caveat — ICS feeds lag, and the user must be told before M2 is called done.**
> Google refreshes its secret-address ICS feeds lazily, often **8–24 hours behind**. An event
> added on the phone this morning may not appear in Obsidian until tomorrow. This is a Google-
> side limitation, not a bug in the plugin or our code, and it cannot be fixed by polling more
> often.
>
> It is acceptable for "what does my week look like" and unacceptable for "what is my next
> meeting". If the lag turns out to bother the user in daily use, the fix is OAuth-authenticated
> reads (near real-time — a Google Cloud project and credentials, roughly an hour of setup),
> which the `google-calendar` bonus plugin already does. Do not silently absorb the lag; surface
> it at the M2 checkpoint and let the user decide.

## 11. Deferred

| Item | Why deferred, not cut |
|---|---|
| **RAG over the vault** (Copilot + Text Extractor, both mobile-capable and healthy) | Wanted for study. RAG over one's own notes is *worse than Ctrl-F* until there are a few hundred notes; switching it on early is how people conclude it doesn't work. Design supports it now — consistent frontmatter and `_templates/` as a known home for source PDFs — cost of enabling later is near zero. |
| Habit tracking | User parked it. |
| Google Calendar **write** path (outbox → push script, or our own plugin) | Build only if the user finds they reach for it. Node scripts cannot run on iOS; an Obsidian plugin can (web APIs + `requestUrl`), so a mobile-capable write path is possible but is real plugin work. |
| Telegram / Discord capture | Phase B. Telegram Bot API is the clean route — text a bot, it becomes a note. |
| Bulk NeetCode import | D10. |

## 12. Phase B — the constraint that will shape it

The user wants to extend this into an AI agent ecosystem (agent roster, orchestration, a
visual control centre). That is a separate spec. One finding from this phase must carry over:

> **Obsidian Sync is end-to-end encrypted and has no API. No cloud service can read or write
> the vault.** Anything that writes to it must run on a machine that physically holds it.

So a 24/7 cloud agent cannot touch this vault as designed. The options — decided in phase B,
not now — are (a) agents run on the Mac, only while it is awake, or (b) add a Git or S3 sync
path a cloud process can commit into, accepting merge conflicts and weaker iOS support.

This is **not expensive to undo**: the vault is a folder of markdown files and sync is a
swappable layer (D2, §7). Nothing in M1–M6 forecloses it.

A well-linked, consistently-typed vault (§6) is what makes phase B tractable at all — the
"Librarian Agent" the user imagines has nothing to work with otherwise.
