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
- Open Tab Settings `2.3.1`

## 4. Confirm Dataview's JavaScript queries are on

**Settings → Dataview → JavaScript Queries** — this must be enabled.

The dashboard is built from `dataviewjs` blocks, and Dataview ships with them
**off** by default. If this is off you will see "Dataview JS queries are disabled"
where the banner and panels should be, with nothing in the console to explain it.

The repo ships this setting turned on, so it should already be correct — but
Obsidian rewrites plugin settings files as you change other options, so check it
here and again if the dashboard ever goes blank.

## 5. Confirm the CSS snippet is on

**Settings → Appearance → CSS snippets** — `lime` should be listed and toggled on.
If it is not, hit the reload icon.

## 6. Set up Obsidian Sync

**Settings → Sync.** Sign in, create a remote vault, connect. Then repeat on the
Windows PC and the iPhone.

**Exclude these from sync** (they are per-device and cause conflicts):
`.obsidian/workspace.json`, `.obsidian/workspace-mobile.json`

## 7. Pick a dark theme

The banner image is dark and heavily saturated (spec §8). It sits naturally on a
dark theme and will read as a heavy dark block on a light one.

## 8. Connect your Google Calendar

The vault reads your calendar; it never writes to it. Google Calendar stays the
place you create and edit events.

1. Open **Google Calendar** in a browser (not the phone app — the secret address
   is only exposed in the web UI)
2. Hover your calendar in the left sidebar → **⋮ → Settings and sharing**
3. Scroll to **Integrate calendar**
4. Copy **Secret address in iCal format**. Google will warn you not to share it —
   that warning is real, see below
5. In Obsidian: **Settings → ICS Calendar → Add a new calendar**, give it a name,
   paste the URL
6. Open **today's daily note**, then run the command **ICS Calendar: Import
   events**, then **undo** (`Cmd+Z`).

   This command is the only way to confirm the feed parses, but it is built to
   insert formatted event lines into whichever note has focus — it is not a
   "test the connection" command, and Obsidian will label it **ICS Calendar:
   Import events** in the command palette, not "ICS: Import events". Running it
   against a note that is not a daily note fails with `⚠️ Unable to get valid
   date from filename. ICS only works with daily notes.` — that error is about
   the note you ran it in, not your calendar setup. Confirm event lines were
   inserted, then undo to leave the daily note clean; the undo is deliberate,
   not a sign anything went wrong.

   If it reports no events at all (rather than the daily-note error above), the
   usual cause is having copied the public address instead of the secret one.

> **The secret address grants read access to your whole calendar to anyone who
> has it.** It is stored in `.obsidian/plugins/ics/data.json`, which is gitignored
> — this repository is public, so that file must never be committed. Do not add a
> `.gitignore` negation for it.

### Naming convention for exam and class events

The **Upcoming dates** panel joins a calendar event to a module note by matching
the module code in the event title against a `code:` property in a note under
`02-Learning/Modules/`. **Both halves are required** — a note with `code:`, and
events whose titles contain that code. Neither one alone makes the panel appear.

For example, to have `CS3230 Midterm` show up and link to its module, create
`02-Learning/Modules/CS3230.md` containing:

```markdown
---
type: module
code: CS3230
semester: 2026-S1
---
```

Then name calendar events like:

- `CS3230 Midterm` ✅ — links to `02-Learning/Modules/CS3230.md`
- `Midterm` ❌ — shows in *Next up* on the day, but never in *Upcoming dates*

This is why exam dates are not stored in your module notes: the date lives in
Google Calendar only, so changing it on your phone updates everything at once and
nothing can go stale. The cost is the naming habit.

**Module codes must be unique ignoring case.** The join matches case-insensitively,
so two module notes whose `code` differs only by case — `cs3230` and `CS3230` — would
collide, and a click could open the wrong note. Pick one casing and keep to it.

## A note on Open Tab Settings

Installed so the quick switcher (`Cmd+O`), links, and the file explorer **focus a
tab that's already open** instead of opening the same note twice.

Its defaults ship `openInNewTab: true`, which would make *every* click spawn a new
tab. `.obsidian/plugins/open-tab-settings/data.json` turns that off and keeps only
the de-duplication — the reason it was installed. Flip `openInNewTab` back on if
you want VSCode-style always-new-tab behaviour.

## A note on the Tasks plugin

Tasks runs on its **defaults** in M1 — nothing here configures it. What it gives
us is the `📅 YYYY-MM-DD` due-date syntax you type into a checkbox; `_scripts/lib.js`
and `Home.md` parse that emoji themselves via Dataview's task index. There is
nothing else to set up, so do not go looking for a Tasks settings step that isn't
there — it's not an oversight.

---

## Do not do this

**Never accept Obsidian's offer to update Dataview or Tasks.** Their versions are
pinned in `scripts/plugins.json` for reasons recorded in spec §7:
Dataview because it has been unmaintained since April 2025 and a version bump could
change dashboard behaviour with no upstream fix available; Tasks for reproducibility
across the three devices. Do not blind-update either.

**Separately:** Templater and QuickAdd are not installed in M1 at all — they arrive
in M3. When they do, their own pins (2.20.6 and 2.12.3) will carry the *same*
constraint as Dataview and Tasks do here, because newer builds of both require
Obsidian 1.13.0, which this Mac cannot run. That is a fact about M3's plugins, not
about the two pins above.

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

- [x] Obsidian opens the lime vault without errors in the developer console ✅ 2026-07-29
- [x] `00-Home/Home.md` renders panels, **not** an "Evaluation Error: SyntaxError" message ✅ 2026-07-29
- [x] `00-Home/Home.md` shows the banner image, cropped to a strip, with today's date over it ✅ 2026-07-29
- [x] The date reads correctly — check it again after 9pm, which is when a UTC bug would show ✅ 2026-07-29
- [x] Today's daily note can be created from the command palette (**Open today's daily note**) ✅ 2026-07-29
- [x] The new daily note has `type: daily` and today's date in its frontmatter ✅ 2026-07-29
- [x] Typing `- [ ] test task 📅 <today>` into the daily note makes it appear in **Due & overdue** ✅ 2026-07-29
- [x] Giving a task yesterday's date shows it as `1d overdue`, coloured, above today's tasks ✅ 2026-07-29
- [x] Ticking a task's checkbox on the dashboard changes that exact line in the source note ✅ 2026-07-29
- [x] Ticking it removes it from the panel on next render ✅ 2026-07-29
- [ ] Ticking a task's checkbox that has since moved or been edited makes the box spring back rather than staying ticked
- [x] With no due tasks at all, the **Due & overdue** panel is absent — not an empty box ✅ 2026-07-29
- [x] **Recent** lists notes you have just edited, newest first ✅ 2026-07-29
- [x] Clicking any row opens the right note ✅ 2026-07-29
- [x] Opening `_templates/daily.md` shows no frontmatter parse error in Obsidian's Properties view ✅ 2026-07-29
- [ ] On iPhone: the vault syncs, the dashboard renders as one column, the banner is short
- [x] `npm test` passes ✅ 2026-07-29

## M2 acceptance checklist

- [ ] Secret URL configured; **ICS: Import events** reports events
- [ ] **Next up** shows today's real events in the right order
- [ ] All-day events sit at the top of their day and are not dimmed
- [ ] A multi-day all-day event shows its correct **last** day, not one day later
- [ ] The `NOW` line appears only when events exist both before and after it
- [ ] Tomorrow's events appear under the divider; the divider is absent when tomorrow is clear
- [ ] Past events are dimmed but still listed; an event happening right now is **not** dimmed
- [ ] An event with a Google Meet or Zoom link opens the call when clicked
- [ ] **Upcoming dates** shows an exam whose title contains a module code, and clicking opens the module note
- [ ] Disable the ICS plugin → **Next up** says so rather than rendering nothing
- [ ] Typing in a daily note does not stall the dashboard (the 5-minute cache is working)
- [ ] **Lag measurement — the point of shipping this way.** Add an event on your phone for later today. Note the time. Check the dashboard every so often and record when it appears:

      event created at: ______    appeared in Obsidian at: ______

      Under ~15 minutes → done, no M2.5 needed.
      Hours → M2.5 (OAuth reads) is justified. Record the result in
      `docs/superpowers/specs/2026-07-29-m2-calendar-design.md` §4 either way.

## What is deliberately missing so far

Capture buttons (M3), learning panels (M4), job search and spending (M5),
needs-attention (M6). The right-hand column of the dashboard is empty on purpose —
M4 and M5 fill it.

Writing events *from* Obsidian is not planned: Google Calendar stays the place you
create and edit events, which is what keeps three devices from fighting over them.
