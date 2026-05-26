/**
 * Co-occurrence / affinity calculations for the global graph view.
 *
 * Source of truth is each session's `top_k_ids` (the user's chosen top 5).
 * Raw pairwise comparisons in `comparisons` tell us who won which duel, not
 * which aesthetics "go together" in someone's taste, so they would give a
 * misleading affinity signal. Top-5 membership is the right granularity.
 *
 * Three metrics are exposed simultaneously:
 *  - `cooc`    raw count of sessions where both ids appear in top 5.
 *  - `jaccard` |A ∩ B| / |A ∪ B|. Symmetric, bounded 0–1, naturally
 *              penalises pairs that are both very popular.
 *  - `lift`    P(A ∧ B) / (P(A) · P(B)). 1 = independent, >1 = co-occur
 *              more than chance, <1 = anti-correlate. Highlights surprising
 *              pairings even when neither aesthetic is broadly popular.
 *
 * A small floor (`minCooc`) is applied to drop noise from one-off sessions.
 */

export interface AffinityInput {
  top_k_ids: string[] | null;
}

export interface AffinityEdge {
  a: string;
  b: string;
  cooc: number;
  jaccard: number;
  lift: number;
}

export interface AffinityResult {
  /** Number of sessions each id appears in (top-5 membership). */
  counts: Map<string, number>;
  /** All unordered pairs (a, b) with `cooc >= minCooc`, with `a < b`. */
  edges: AffinityEdge[];
  /** Sessions actually used (with valid `top_k_ids` of length >= 2). */
  totalSessions: number;
}

export interface BuildAffinityOptions {
  /**
   * Minimum number of co-occurrences for an edge to make it into the
   * result. Defaults to 2 — single-session pairs are almost always
   * uninteresting (one user happened to pick this combo).
   */
  minCooc?: number;
}

export function buildAffinity(
  sessions: AffinityInput[],
  options: BuildAffinityOptions = {}
): AffinityResult {
  const minCooc = options.minCooc ?? 2;
  const counts = new Map<string, number>();
  const coocMap = new Map<string, number>();
  let totalSessions = 0;

  for (const s of sessions) {
    if (!s.top_k_ids || s.top_k_ids.length < 2) continue;
    // Dedupe defensively — `top_k_ids` should never contain a duplicate
    // (the algorithm builds it from a Set), but the column type doesn't
    // enforce uniqueness so we belt-and-suspenders it.
    const ids = Array.from(new Set(s.top_k_ids));
    if (ids.length < 2) continue;
    totalSessions += 1;

    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i] < ids[j] ? ids[i] : ids[j];
        const b = ids[i] < ids[j] ? ids[j] : ids[i];
        const key = `${a}|${b}`;
        coocMap.set(key, (coocMap.get(key) ?? 0) + 1);
      }
    }
  }

  const edges: AffinityEdge[] = [];
  for (const [key, c] of coocMap) {
    if (c < minCooc) continue;
    const sep = key.indexOf("|");
    const a = key.slice(0, sep);
    const b = key.slice(sep + 1);
    const ca = counts.get(a) ?? 0;
    const cb = counts.get(b) ?? 0;
    const union = ca + cb - c;
    const jaccard = union > 0 ? c / union : 0;
    // Lift = P(A∧B) / (P(A)·P(B)) = c·N / (ca·cb). N cancels nicely so
    // we keep it explicit to make the formula readable in the source.
    const lift =
      ca > 0 && cb > 0 ? (c * totalSessions) / (ca * cb) : 0;
    edges.push({ a, b, cooc: c, jaccard, lift });
  }

  return { counts, edges, totalSessions };
}

export type AffinityMetric = "jaccard" | "lift";

/**
 * Extracts the chosen metric value from an edge. Convenience wrapper so
 * the UI doesn't sprinkle `metric === "jaccard" ? ... : ...` everywhere.
 */
export function getMetric(edge: AffinityEdge, metric: AffinityMetric): number {
  return metric === "jaccard" ? edge.jaccard : edge.lift;
}

/**
 * Sensible default threshold per metric. Jaccard tops out at 1; lift is
 * unbounded above but anything below ~1.0 is "less than chance" and is
 * rarely interesting on a small dataset.
 */
export const DEFAULT_THRESHOLD: Record<AffinityMetric, number> = {
  jaccard: 0.2,
  lift: 1.5,
};

/**
 * Reasonable slider range per metric, used to drive the threshold UI.
 */
export const METRIC_RANGE: Record<
  AffinityMetric,
  { min: number; max: number; step: number }
> = {
  jaccard: { min: 0, max: 0.6, step: 0.02 },
  lift: { min: 0.5, max: 6, step: 0.1 },
};
