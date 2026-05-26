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
