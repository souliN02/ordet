/**
 * localStorage can throw (private windows, blocked site data), so every access
 * goes through these helpers and a failure just means "nothing saved".
 */

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStorage(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    const s = store();
    if (value === null) s?.removeItem(key);
    else s?.setItem(key, value);
  } catch {}
}

export function readJson(key: string): unknown {
  const raw = readStorage(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
