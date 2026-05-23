/**
 * Focused ranking: find the top-K items from a pool with minimum comparisons.
 *
 * Completion criteria (whichever comes first):
 *  1. ELO gap between #K and #K+1 is large enough AND each item has ≥ MIN_COMPARISONS
 *  2. Hard cap: pool_size × MAX_COMPS_PER_ITEM total comparisons — just use the current ranking
 *  3. All pairs in the pool have been compared at least once
 */

export const K = 5;

const MIN_COMPARISONS = 2;   // per item before a position can be confirmed
const ELO_GAP = 20;          // points gap between #K and #K+1 to confirm top-K
const MAX_COMPS_PER_ITEM = 4; // hard cap: pool_size × 4 → declare done

export interface RankingStats {
  id: string;
  rating: number;
  wins: number;
  losses: number;
}

function totalComps(s: RankingStats) {
  return s.wins + s.losses;
}

function bySorted(stats: RankingStats[]) {
  return [...stats].sort((a, b) => b.rating - a.rating);
}

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/** Total comparisons done within this pool (some pairs may be outside the pool). */
function poolCompsCount(stats: RankingStats[]): number {
  return stats.reduce((sum, s) => sum + totalComps(s), 0) / 2;
}

/** True when we should stop regardless of confirmation. */
function hitHardCap(stats: RankingStats[]): boolean {
  const n = stats.length;
  const maxTotal = n * MAX_COMPS_PER_ITEM;
  return poolCompsCount(stats) >= maxTotal;
}

/** True when all possible pairs within the pool have been compared. */
function allPairsCompared(stats: RankingStats[], compared: Set<string>): boolean {
  for (let i = 0; i < stats.length - 1; i++) {
    for (let j = i + 1; j < stats.length; j++) {
      if (!compared.has(pairKey(stats[i].id, stats[j].id))) return false;
    }
  }
  return true;
}

/** Pick the next most informative pair from the pool. */
export function selectPair(
  stats: RankingStats[],
  compared: Set<string>
): [string, string] | null {
  if (stats.length < 2) return null;

  // Don't pick any more pairs if we've hit the completion criteria
  if (isTopKComplete(stats, compared)) return null;

  const covered = stats.filter((s) => totalComps(s) > 0).length;
  const inPhase1 = covered / stats.length < 0.8;

  if (inPhase1) return broadPair(stats, compared);
  return boundaryPair(stats, compared);
}

function broadPair(stats: RankingStats[], compared: Set<string>): [string, string] | null {
  const byComps = [...stats].sort((a, b) => totalComps(a) - totalComps(b));
  for (let i = 0; i < byComps.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 10, byComps.length); j++) {
      if (!compared.has(pairKey(byComps[i].id, byComps[j].id)))
        return [byComps[i].id, byComps[j].id];
    }
  }
  return anyPair(stats, compared);
}

function boundaryPair(stats: RankingStats[], compared: Set<string>): [string, string] | null {
  const s = bySorted(stats);
  const n = s.length;
  // Compare items near rank K boundary
  const lo = Math.max(0, K - 2);
  const hi = Math.min(n, K + 3);
  const window = s.slice(lo, hi);
  for (let i = 0; i < window.length - 1; i++) {
    for (let j = i + 1; j < window.length; j++) {
      if (!compared.has(pairKey(window[i].id, window[j].id)))
        return [window[i].id, window[j].id];
    }
  }
  return anyPair(stats, compared);
}

function anyPair(stats: RankingStats[], compared: Set<string>): [string, string] | null {
  const s = bySorted(stats);
  for (let i = 0; i < s.length - 1; i++) {
    for (let j = i + 1; j < Math.min(i + 15, s.length); j++) {
      if (!compared.has(pairKey(s[i].id, s[j].id)))
        return [s[i].id, s[j].id];
    }
  }
  return null;
}

/** IDs of confirmed top-K positions. If hard cap hit, returns top-K as-is. */
export function getConfirmedTop(
  stats: RankingStats[],
  compared?: Set<string>
): string[] {
  if (stats.length <= K) return bySorted(stats).map((s) => s.id);

  // If hard cap or all pairs done — just return best K
  if (hitHardCap(stats) || (compared && allPairsCompared(stats, compared))) {
    return bySorted(stats)
      .slice(0, K)
      .map((s) => s.id);
  }

  const s = bySorted(stats);
  const confirmed: string[] = [];
  for (let i = 0; i < Math.min(K, s.length); i++) {
    const item = s[i];
    const next = s[i + 1];
    const ok =
      totalComps(item) >= MIN_COMPARISONS &&
      (!next || item.rating - next.rating >= ELO_GAP);
    if (ok) confirmed.push(item.id);
    else break;
  }
  return confirmed;
}

/** Done when top-K is confirmed OR we hit a hard cap. */
export function isTopKComplete(
  stats: RankingStats[],
  compared?: Set<string>
): boolean {
  if (stats.length <= K) return true;
  if (hitHardCap(stats)) return true;
  if (compared && allPairsCompared(stats, compared)) return true;
  return getConfirmedTop(stats, compared).length >= K;
}
