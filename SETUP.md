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

## 4. Confirm the CSS snippet is on

**Settings → Appearance → CSS snippets** — `lime` should be listed and toggled on.
If it is not, hit the reload icon.

## 5. Set up Obsidian Sync

**Settings → Sync.** Sign in, create a remote vault, connect. Then repeat on the
Windows PC and the iPhone.

**Exclude these from sync** (they are per-device and cause conflicts):
`.obsidian/workspace.json`, `.obsidian/workspace-mobile.json`

## 6. Pick a dark theme

The banner image is dark and heavily saturated (spec §8). It sits naturally on a
dark theme and will read as a heavy dark block on a light one.

---

## Do not do this

**Never accept Obsidian's offer to update Dataview or Tasks.** Their versions are
pinned in `scripts/plugins.json` for reasons recorded in spec §7. Newer Templater
and QuickAdd builds require Obsidian 1.13.0, which you cannot install.

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

- [ ] Obsidian opens the lime vault without errors in the developer console
- [ ] `00-Home/Home.md` shows the banner image, cropped to a strip, with today's date over it
- [ ] The date reads correctly — check it again after 9pm, which is when a UTC bug would show
- [ ] Today's daily note can be created from the command palette (**Open today's daily note**)
- [ ] The new daily note has `type: daily` and today's date in its frontmatter
- [ ] Typing `- [ ] test task 📅 <today>` into the daily note makes it appear in **Due & overdue**
- [ ] Giving a task yesterday's date shows it as `1d overdue`, coloured, above today's tasks
- [ ] Ticking a task's checkbox on the dashboard changes that exact line in the source note
- [ ] Ticking it removes it from the panel on next render
- [ ] Ticking a task's checkbox that has since moved or been edited makes the box spring back rather than staying ticked
- [ ] With no due tasks at all, the **Due & overdue** panel is absent — not an empty box
- [ ] **Recent** lists notes you have just edited, newest first
- [ ] Clicking any row opens the right note
- [ ] Opening `_templates/daily.md` shows no frontmatter parse error in Obsidian's Properties view
- [ ] On iPhone: the vault syncs, the dashboard renders as one column, the banner is short
- [ ] `npm test` passes

## What is deliberately missing in M1

Calendar events (M2), capture buttons (M3), learning panels (M4), job search and
spending (M5), needs-attention (M6). The right-hand column is empty on purpose —
M4 and M5 fill it.
