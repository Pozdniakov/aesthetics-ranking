/**
 * Guarded Top-K Insertion Sort
 *
 * Finds the ordered top-K from a pool in near-minimum comparisons.
 *
 * Algorithm:
 *  Phase 1 (sorted.length < K): Insert the first K items via binary insertion sort.
 *    Every item is placed correctly — nothing is discarded.
 *  Phase 2 (sorted.length === K): For each remaining item:
 *    a) "Guard" comparison against sorted[K-1] (the current weakest in top-K).
 *       If it loses → discard (1 comparison total).
 *       If it wins → binary-search its position in sorted[0..K-2] (1–3 more).
 *
 * Expected comparisons for ordered top-5:
 *   N=10 → ~18–25   (vs theoretical min 15, full insertion sort ~24)
 *   N=15 → ~22–30   (vs theoretical min 19, full insertion sort ~37)
 *   N=20 → ~25–35   (vs theoretical min 21, full insertion sort ~50)
 *
 * State is plain JSON — safe to store in localStorage and restore.
 *
 * KEY INVARIANT: `remaining[0]` is always the candidate being processed next.
 * Candidates are removed from `remaining` at the START of their processing,
 * before any search state is created. `applySearchStep` therefore never
 * needs to remove anything extra from `remaining`.
 */

export const K = 5;

export interface InsertionState {
  /** Items not yet processed, in order. remaining[0] = next candidate. */
  remaining: string[];
  /** Current top-K in sorted order, best → worst. Length ≤ K. */
  sorted: string[];
  /** Binary-search state while placing a candidate, or null between candidates. */
  pending: PendingSearch | null;
  /** Total comparisons done so far. */
  done: number;
}

interface PendingSearch {
  type: "search";
  candidate: string;
  lo: number; // inclusive
  hi: number; // exclusive
}

export function initInsertion(ids: string[]): InsertionState {
  if (ids.length === 0) return { remaining: [], sorted: [], pending: null, done: 0 };
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  return { remaining: shuffled, sorted: [], pending: null, done: 0 };
}

/**
 * Returns the next pair to show the user, or null when done.
 */
export function nextPair(state: InsertionState): [string, string] | null {
  if (isComplete(state)) return null;

  // Mid-search: continue binary search
  if (state.pending) {
    const mid = Math.floor((state.pending.lo + state.pending.hi) / 2);
    return [state.pending.candidate, state.sorted[mid]];
  }

  if (state.remaining.length === 0) return null;
  const candidate = state.remaining[0];

  if (state.sorted.length < K) {
    // Phase 1: filling the first K slots
    if (state.sorted.length === 0) {
      // First item needs no comparison — handled by advanceNoComparison()
      return null;
    }
    const mid = Math.floor(state.sorted.length / 2);
    return [candidate, state.sorted[mid]];
  }

  // Phase 2: guard comparison
  return [candidate, state.sorted[K - 1]];
}

/**
 * Apply the result of the comparison returned by nextPair().
 * winnerId = the item the user preferred.
 */
export function applyResult(
  state: InsertionState,
  winnerId: string,
  loserId: string
): InsertionState {
  const done = state.done + 1;
  let { remaining, sorted } = state;

  // ── Continuing a binary search ─────────────────────────────
  if (state.pending) {
    return applySearchStep({ ...state, done }, winnerId);
  }

  if (remaining.length === 0) return { ...state, done };

  const candidate = remaining[0];

  // ── Phase 1: insert candidate into a growing sorted list ───
  if (sorted.length < K) {
    remaining = remaining.slice(1); // remove candidate first

    if (sorted.length === 0) {
      // No comparison was needed; shouldn't normally be called here
      return { remaining, sorted: [candidate], pending: null, done: done - 1 };
    }

    // Start binary search within [0, sorted.length)
    const pending: PendingSearch = { type: "search", candidate, lo: 0, hi: sorted.length };
    return applySearchStep({ remaining, sorted, pending, done }, winnerId);
  }

  // ── Phase 2: guard comparison against sorted[K-1] ──────────
  remaining = remaining.slice(1); // remove candidate regardless of outcome

  if (winnerId !== candidate) {
    // Candidate lost to gatekeeper → discard
    return { remaining, sorted, pending: null, done };
  }

  // Candidate beat gatekeeper → search in sorted[0..K-2]
  const pending: PendingSearch = { type: "search", candidate, lo: 0, hi: K - 1 };
  // The guard comparison itself gives no info about sorted[mid], so don't
  // call applySearchStep yet — just store the pending and let nextPair show
  // the first real binary-search comparison.
  return { remaining, sorted, pending, done };
}

/**
 * Process one step of binary search. Called only when state.pending exists.
 * The candidate is already removed from remaining.
 */
function applySearchStep(
  state: InsertionState,
  winnerId: string
): InsertionState {
  const { remaining, sorted, done } = state;
  const { candidate, lo, hi } = state.pending!;

  const mid = Math.floor((lo + hi) / 2);

  let newLo = lo;
  let newHi = hi;

  if (winnerId === candidate) {
    // candidate beats sorted[mid] → position is in [lo, mid)
    newHi = mid;
  } else {
    // candidate loses to sorted[mid] → position is in (mid, hi)
    newLo = mid + 1;
  }

  if (newLo < newHi) {
    // Search not complete yet
    return { remaining, sorted, pending: { type: "search", candidate, lo: newLo, hi: newHi }, done };
  }

  // Found insertion position: newLo
  const newSorted = [
    ...sorted.slice(0, newLo),
    candidate,
    ...sorted.slice(newLo),
  ].slice(0, K);

  // remaining already has candidate removed — no extra slicing needed
  return { remaining, sorted: newSorted, pending: null, done };
}

/**
 * Move the first item into sorted[] without a comparison (used when sorted is empty).
 */
export function advanceNoComparison(state: InsertionState): InsertionState {
  if (state.remaining.length === 0 || state.sorted.length > 0) return state;
  const candidate = state.remaining[0];
  return { ...state, remaining: state.remaining.slice(1), sorted: [candidate] };
}

export function isComplete(state: InsertionState): boolean {
  return state.pending === null && state.remaining.length === 0;
}

export function getTopK(state: InsertionState): string[] {
  return state.sorted;
}

export function getProgress(state: InsertionState, poolSize: number): {
  done: number;
  estimate: number;
} {
  // Estimate: ~1 comparison per item (guard) + K*log2(K) for insertion phase
  const estimate = Math.ceil(poolSize + K * Math.log2(Math.max(K, 2)));
  return { done: state.done, estimate };
}
