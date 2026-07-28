import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Dataview evaluates a dataviewjs block by STRING CONCATENATION when the script
// contains `await` (plugin:dataview, asyncEvalInContext):
//
//     evalInContext("(async () => { " + script + " })()", context)
//
// Obsidian hands the script over with the trailing newline stripped. So if the
// block's last line is a `//` comment, the appended ` })()` lands inside that
// comment, the arrow function is never closed, and Dataview reports
// "Evaluation Error: SyntaxError: Unexpected end of input" — with no hint about
// which block or why.
//
// These tests reproduce that wrapping exactly, so the failure is caught here
// instead of in the app.

const HOME = '00-Home/Home.md';

function dataviewjsBlocks(path) {
  const md = readFileSync(path, 'utf8');
  return [...md.matchAll(/```dataviewjs\n([\s\S]*?)```/g)].map((m) => m[1]);
}

// Mirrors Dataview's asyncEvalInContext. `trimEnd` models Obsidian stripping
// the trailing newline — the condition under which the bug bites.
function wrapAsDataviewDoes(script) {
  const s = script.trimEnd();
  return s.includes('await') ? `(async () => { ${s} })()` : s;
}

test('Home.md has both dataviewjs blocks', () => {
  assert.equal(dataviewjsBlocks(HOME).length, 2);
});

test('every dataviewjs block still parses after Dataview wraps it', () => {
  dataviewjsBlocks(HOME).forEach((script, i) => {
    assert.doesNotThrow(
      () => new Function(wrapAsDataviewDoes(script)),
      `dataviewjs block ${i + 1} does not parse once Dataview appends its closing ` +
      `"})()" — Obsidian will show "SyntaxError: Unexpected end of input"`
    );
  });
});

test('no dataviewjs block ends on a line comment', () => {
  dataviewjsBlocks(HOME).forEach((script, i) => {
    const last = script.trimEnd().split('\n').pop().trim();
    assert.ok(
      !last.startsWith('//'),
      `dataviewjs block ${i + 1} ends on a line comment (${JSON.stringify(last.slice(0, 50))}). ` +
      `Dataview appends "})()" by string concatenation, so it would be commented out. ` +
      `Move the comment above the final statement, or use a /* block comment */.`
    );
  });
});

test('Home.md avoids the anti-patterns the spec names', () => {
  const md = readFileSync(HOME, 'utf8');
  for (const bad of ['innerHTML', 'onclick=', 'setInterval', 'obsidian://open?vault=']) {
    assert.ok(!md.includes(bad), `Home.md contains forbidden pattern: ${bad}`);
  }
});
