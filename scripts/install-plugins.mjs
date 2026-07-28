#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { satisfiesMinApp } from './lib/versions.mjs';

const CFG = 'scripts/plugins.json';
const FILES = ['main.js', 'manifest.json', 'styles.css']; // styles.css is optional

async function fetchAsset(repo, tag, file) {
  const url = `https://github.com/${repo}/releases/download/${tag}/${file}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.text();
}

async function install(plugin, appVersion) {
  const { id, repo, pin } = plugin;
  const dir = `.obsidian/plugins/${id}`;

  const manifestText = await fetchAsset(repo, pin, 'manifest.json');
  if (!manifestText) throw new Error(`${id}: no manifest.json at tag ${pin} of ${repo}`);
  const manifest = JSON.parse(manifestText);

  // The gate. Never install something the app cannot run.
  if (!satisfiesMinApp(manifest.minAppVersion, appVersion)) {
    throw new Error(
      `${id} ${manifest.version} needs Obsidian >= ${manifest.minAppVersion}, ` +
      `but this vault targets ${appVersion}. Refusing to install.`
    );
  }
  if (manifest.version !== pin) {
    throw new Error(`${id}: tag ${pin} contains version ${manifest.version} — pin mismatch`);
  }

  await mkdir(dir, { recursive: true });
  for (const file of FILES) {
    const body = file === 'manifest.json' ? manifestText : await fetchAsset(repo, pin, file);
    if (body === null) {
      if (file === 'styles.css') continue; // genuinely optional
      throw new Error(`${id}: missing required asset ${file}`);
    }
    await writeFile(`${dir}/${file}`, body);
  }
  console.log(`  ok  ${id} ${manifest.version} (needs app >= ${manifest.minAppVersion ?? 'any'})`);
}

async function enable(ids) {
  const path = '.obsidian/community-plugins.json';
  const existing = existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : [];
  const merged = [...new Set([...existing, ...ids])];
  await writeFile(path, JSON.stringify(merged, null, 2) + '\n');
  console.log(`  ok  enabled: ${merged.join(', ')}`);
}

const cfg = JSON.parse(await readFile(CFG, 'utf8'));
console.log(`Installing plugins for Obsidian ${cfg.appVersion}`);
for (const plugin of cfg.plugins) {
  await install(plugin, cfg.appVersion);
}
await enable(cfg.plugins.map((p) => p.id));
console.log('Done. Restart Obsidian for changes to take effect.');
