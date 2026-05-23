/**
 * Bottom-up merge sort for pair comparison ranking.
 *
 * Instead of comparing all possible pairs (n*(n-1)/2),
 * merge sort needs only n*log2(n) comparisons for a complete ordering.
 * For 90 items: ~600 comparisons vs 4005.
 *
 * The user can stop at any point — the ranking is best-effort
 * based on comparisons done so far.
 */

export interface MergeSortState {
  // Queue of sorted groups waiting to be merged
  pending: string[][];
  // Currently active merge
  active: {
    left: string[];
    right: string[];
    merged: string[];
  } | null;
  // Set when all items are fully sorted
  result: string[] | null;
  // Total comparisons done
  done: number;
}

export function initMergeSort(ids: string[]): MergeSortState {
  // Shuffle to avoid systematic bias
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  return {
    pending: shuffled.map((id) => [id]),
    active: null,
    result: null,
    done: 0,
  };
}

export function getNextPair(
  state: MergeSortState
): [string, string] | null {
  if (state.result) return null; // fully sorted

  // Continue active merge
  if (state.active) {
    const { left, right } = state.active;
    if (left.length > 0 && right.length > 0) {
      return [left[0], right[0]];
    }
  }

  // Need to start a new merge
  if (state.pending.length >= 2) {
    return [state.pending[0][0], state.pending[1][0]];
  }

  return null;
}

export function applyChoice(
  state: MergeSortState,
  winnerId: string
): MergeSortState {
  let { pending, active } = state;

  // Start a new merge if nothing active
  if (!active) {
    if (pending.length < 2) return state;
    const [left, right, ...rest] = pending;
    active = { left, right, merged: [] };
    pending = rest;
  }

  const { left, right, merged } = active;
  let newLeft = left;
  let newRight = right;

  if (left.length > 0 && left[0] === winnerId) {
    newLeft = left.slice(1);
  } else {
    newRight = right.slice(1);
  }

  const newMerged = [...merged, winnerId];

  // Merge complete when one side is exhausted
  if (newLeft.length === 0 || newRight.length === 0) {
    const completed = [...newMerged, ...newLeft, ...newRight];
    const newPending = [...pending, completed];

    if (newPending.length === 1) {
      // Fully sorted!
      return {
        pending: [],
        active: null,
        result: newPending[0],
        done: state.done + 1,
      };
    }

    return {
      pending: newPending,
      active: null,
      result: null,
      done: state.done + 1,
    };
  }

  return {
    pending,
    active: { left: newLeft, right: newRight, merged: newMerged },
    result: null,
    done: state.done + 1,
  };
}

/**
 * Estimate total comparisons for n items.
 * Merge sort: n * ceil(log2(n)) comparisons worst case.
 */
export function estimateTotal(n: number): number {
  if (n <= 1) return 0;
  return Math.ceil(n * Math.log2(n));
}

/**
 * Get the best current ranking from an incomplete sort state.
 * Within each sorted group the order is accurate.
 * Between groups, we use group size as a proxy (larger groups
 * have been merged more and tend to contain stronger items).
 */
export function getCurrentRanking(state: MergeSortState): string[] {
  if (state.result) return state.result;

  const allGroups: string[][] = [];

  if (state.active) {
    // Items already merged in the active merge (decided, ordered)
    const { merged, left, right } = state.active;
    // Pending items in this merge — order within each side is known
    // but relative order between sides is unknown for remaining items.
    // Combine: merged first (decided winners), then interleave left/right
    const remaining = interleaveUnknown(left, right);
    allGroups.push([...merged, ...remaining]);
  }

  // Add all pending groups (each internally sorted)
  // Larger / later groups tend to be stronger (more merges won)
  for (const group of state.pending) {
    allGroups.push(group);
  }

  // Flatten: prioritize groups with more items at top
  allGroups.sort((a, b) => b.length - a.length);
  return allGroups.flat();
}

// Interleave two arrays without known ordering
function interleaveUnknown(a: string[], b: string[]): string[] {
  const result: string[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    result.push(a[i++], b[j++]);
  }
  while (i < a.length) result.push(a[i++]);
  while (j < b.length) result.push(b[j++]);
  return result;
}

/**
 * Serialize/deserialize for Supabase storage (JSON-safe).
 */
export function serializeState(state: MergeSortState): string {
  return JSON.stringify(state);
}

export function deserializeState(json: string): MergeSortState {
  return JSON.parse(json) as MergeSortState;
}
