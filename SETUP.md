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

## What is deliberately missing in M1

Calendar events (M2), capture buttons (M3), learning panels (M4), job search and
spending (M5), needs-attention (M6). The right-hand column is empty on purpose —
M4 and M5 fill it.
