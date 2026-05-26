import type { Aesthetic } from "@/lib/supabase/types";

/**
 * Shared year/range formatter for an aesthetic row.
 *
 * Priority chain:
 *  1. start_year + end_year → "1970s – 1990s" (or "1970s – now" when
 *     end_year is the special CARI sentinel "Current").
 *  2. start_year alone     → "1970s".
 *  3. decade fallback      → "1970s".
 *  4. null when nothing useful is available.
 *
 * Previously the ranking lists (personal + global + share) only rendered
 * the `decade` column, which silently dropped the end of the range and
 * made every aesthetic look like a single-decade fad.
 */
export function formatYears(
  a: Pick<Aesthetic, "start_year" | "end_year" | "decade">
): string | null {
  if (a.start_year) {
    if (!a.end_year) return a.start_year;
    return a.end_year === "Current"
      ? `${a.start_year} – now`
      : `${a.start_year} – ${a.end_year}`;
  }
  return a.decade ?? null;
}

/**
 * Extracts a coarse decade label (e.g. "1980s") for an aesthetic.
 *
 * `start_year` is the most specific field but it is a free-form string from
 * CARI ("Early 1960s", "Mid 1980s", "Late 1990s", etc.); sorting it
 * lexicographically interleaves Early/Mid/Late and looks broken in the UI.
 * Mapping everything down to its parent decade gives a small, monotonically
 * sortable filter set: 1950s, 1960s, ..., 2010s, plus "Timeless" for rows
 * that explicitly bucket themselves outside any decade.
 */
export function decadeOf(
  a: Pick<Aesthetic, "start_year" | "decade">
): string | null {
  const fromStart = a.start_year?.match(/(19|20)\d{2}s?/i)?.[0];
  if (fromStart) {
    return fromStart.endsWith("s") ? fromStart : `${fromStart}s`;
  }
  if (a.decade && a.decade.trim()) return a.decade.trim();
  return null;
}

/**
 * Numeric sort key for a decade label. Numeric decades parse to their first
 * year ("1980s" -> 1980). Non-numeric buckets like "Timeless" sort to the
 * end of the list.
 */
export function decadeSortKey(decade: string): number {
  const match = decade.match(/(19|20)\d{2}/);
  if (!match) return Number.POSITIVE_INFINITY;
  return parseInt(match[0], 10);
}

/** Floor the first 4-digit year found in `s` to its decade (e.g. 1987 → 1980). */
function parseDecadeYear(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  if (!m) return null;
  return Math.floor(parseInt(m[0], 10) / 10) * 10;
}

/**
 * Every decade an aesthetic's lifespan touches.
 *
 * Unlike `decadeOf`, which buckets by the start decade only, this walks
 * the inclusive range [start decade … end decade] and emits every step.
 * That makes the global decade filter behave the way users intuitively
 * expect: items that span multiple decades (e.g. "Mid 1950s" → "Mid
 * 1970s") appear under each of them, and aesthetics still active today
 * (`end_year === "Current"`) show up under the current decade even when
 * CARI didn't backfill anything tagged "2020s".
 *
 * Falls back to `decadeOf` for rows where one of the endpoints can't be
 * parsed (CARI sometimes only labels a `decade` peak without a numeric
 * start/end).
 */
export function decadesOf(
  a: Pick<Aesthetic, "start_year" | "end_year" | "decade">
): string[] {
  const startDecade = parseDecadeYear(a.start_year);
  const endDecade =
    a.end_year === "Current"
      ? Math.floor(new Date().getFullYear() / 10) * 10
      : parseDecadeYear(a.end_year);

  if (startDecade !== null && endDecade !== null && startDecade <= endDecade) {
    const out: string[] = [];
    for (let y = startDecade; y <= endDecade; y += 10) {
      out.push(`${y}s`);
    }
    return out;
  }
  const single = decadeOf(a);
  return single ? [single] : [];
}
