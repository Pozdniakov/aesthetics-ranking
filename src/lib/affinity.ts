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
  /**
   * The actual minimum co-occurrence floor that was applied. Either taken
   * from `options.minCooc` or derived adaptively from `totalSessions`.
   * Surfacing it lets the UI explain why a pair was filtered out.
   */
  minCoocApplied: number;
}

export interface BuildAffinityOptions {
  /**
   * Override the minimum number of co-occurrences for an edge to pass
   * the noise floor. Leave undefined to use `adaptiveMinCooc`, which
   * scales with the number of contributing sessions so the threshold
   * doesn't have to be retuned by hand as more rankings come in.
   */
  minCooc?: number;
}

/**
 * Noise floor that grows with the dataset.
 *
 * Why a single literal (e.g. `>= 2`) doesn't work:
 *  - With 13 sessions, requiring 2 shared appearances keeps real signal
 *    while dropping single-coincidence pairs. Good.
 *  - With 1000 sessions, *every* pair of remotely popular aesthetics
 *    will have >= 2 shared appearances purely by chance, and the graph
 *    becomes a fully connected mush.
 *
 * Jaccard and Lift are already scale-invariant (they're ratios), so the
 * slider thresholds for those don't need to move. But the raw cooc floor
 * absolutely does. ceil(N / 25) keeps the floor at 2 up to ~50 sessions
 * (where 2 still feels conservative), then grows roughly linearly. The
 * divisor was chosen so that with ~5 picks per session and ~90
 * aesthetics, the expected count for a uniformly-random pair stays well
 * below the floor at any N.
 */
export function adaptiveMinCooc(totalSessions: number): number {
  return Math.max(2, Math.ceil(totalSessions / 25));
}

export function buildAffinity(
  sessions: AffinityInput[],
  options: BuildAffinityOptions = {}
): AffinityResult {
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

  // Pick the floor after we know N. Adaptive default; explicit override
  // wins so callers / tests can pin a value.
  const minCoocApplied = options.minCooc ?? adaptiveMinCooc(totalSessions);

  const edges: AffinityEdge[] = [];
  for (const [key, c] of coocMap) {
    if (c < minCoocApplied) continue;
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

  return { counts, edges, totalSessions, minCoocApplied };
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
