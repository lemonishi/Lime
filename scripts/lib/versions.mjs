export function parseVersion(v) {
  const parts = String(v).replace(/^v/, '').split('.');
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const n = Number.parseInt(parts[i] ?? '0', 10);
    out[i] = Number.isNaN(n) ? 0 : n;
  }
  return out;
}

export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function satisfiesMinApp(minAppVersion, appVersion) {
  if (!minAppVersion) return true;
  return compareVersions(appVersion, minAppVersion) >= 0;
}
