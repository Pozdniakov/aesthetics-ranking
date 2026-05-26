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
