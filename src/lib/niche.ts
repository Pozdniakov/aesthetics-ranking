export interface PopularityInput {
  winner_id: string;
  loser_id?: string | null;
  session_id: string;
}

export interface NicheScoreResult {
  score: number;
  label: string;
  totalRankings: number;
}

const LABELS: Array<{ max: number; label: string }> = [
  { max: 20, label: "Very mainstream" },
  { max: 40, label: "Mainstream" },
  { max: 60, label: "Mixed taste" },
  { max: 80, label: "Niche" },
  { max: 101, label: "Very niche" },
];

export function labelForNicheScore(score: number): string {
  return LABELS.find((l) => score < l.max)?.label ?? "Very niche";
}

/**
 * Calculates a 0-100 mainstream-to-niche score for a top-K list.
 *
 * Popularity is ranked by smoothed win-rate:
 *   popularity(a) = (wins(a) + 1) / (appearances(a) + 2)
 *
 * This matches the global leaderboard and avoids over-rewarding aesthetics
 * that simply appeared in more comparisons.
 */
export function calculateNicheScore(
  topKIds: string[],
  comparisons: PopularityInput[],
  currentSessionId: string | null = null
): NicheScoreResult | null {
  if (topKIds.length === 0) return null;

  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const sessions = new Set<string>();

  for (const row of comparisons) {
    if (currentSessionId && row.session_id === currentSessionId) continue;

    wins.set(row.winner_id, (wins.get(row.winner_id) ?? 0) + 1);
    sessions.add(row.session_id);

    if (row.loser_id) {
      losses.set(row.loser_id, (losses.get(row.loser_id) ?? 0) + 1);
    }
  }

  const ids = new Set([...wins.keys(), ...losses.keys()]);
  if (ids.size === 0) return null;

  const ranked = [...ids].sort((a, b) => {
    const aWins = wins.get(a) ?? 0;
    const bWins = wins.get(b) ?? 0;
    const aAppearances = aWins + (losses.get(a) ?? 0);
    const bAppearances = bWins + (losses.get(b) ?? 0);
    const aRate = (aWins + 1) / (aAppearances + 2);
    const bRate = (bWins + 1) / (bAppearances + 2);
    if (bRate !== aRate) return bRate - aRate;
    if (bAppearances !== aAppearances) return bAppearances - aAppearances;
    return a.localeCompare(b);
  });

  const total = ranked.length;
  const percentiles = topKIds.map((id) => {
    const rank = ranked.indexOf(id);
    return rank === -1 ? 1 : rank / Math.max(total - 1, 1);
  });

  const avgPercentile =
    percentiles.reduce((sum, p) => sum + p, 0) / percentiles.length;
  const score = Math.round(avgPercentile * 100);

  return {
    score,
    label: labelForNicheScore(score),
    totalRankings: sessions.size,
  };
}
