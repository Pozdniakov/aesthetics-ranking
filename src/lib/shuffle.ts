/**
 * Per-user deterministic shuffle.
 *
 * The seed is generated once and persisted in localStorage so the swipe order
 * stays consistent across reloads for the same user, but differs between users.
 * `clearSession()` removes the seed so "Reset" gives a fresh deck.
 */
import { SHUFFLE_SEED_KEY } from "@/lib/session";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getOrCreateShuffleSeed(): number {
  if (!isBrowser()) return 1;
  try {
    const raw = localStorage.getItem(SHUFFLE_SEED_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    // ignore
  }
  // 31-bit positive seed, plenty of entropy for 90 items.
  const seed = (Math.floor(Math.random() * 0x7fffffff) | 0) || 1;
  try {
    localStorage.setItem(SHUFFLE_SEED_KEY, String(seed));
  } catch {
    // ignore
  }
  return seed;
}

/** Mulberry32 — fast, well-distributed seeded RNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by a seeded RNG; non-mutating. */
export function shuffleWithSeed<T>(arr: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
