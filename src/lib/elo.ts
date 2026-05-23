const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function newRatings(
  winnerRating: number,
  loserRating: number
): { winner: number; loser: number } {
  const expectedWinner = expectedScore(winnerRating, loserRating);
  const expectedLoser = expectedScore(loserRating, winnerRating);

  return {
    winner: Math.round(winnerRating + K * (1 - expectedWinner)),
    loser: Math.round(loserRating + K * (0 - expectedLoser)),
  };
}

export function selectPair(
  aestheticIds: string[],
  ratings: Record<string, number>,
  comparisons: Set<string>,
  totalComparisons: number
): [string, string] | null {
  if (aestheticIds.length < 2) return null;

  // For first 20 comparisons, pick purely random pairs to seed the ratings.
  // After that, prefer close-rated pairs for more accurate ranking.
  const useRandom = totalComparisons < 20;

  const uncompared = aestheticIds.filter((id) => {
    return aestheticIds.some((other) => {
      if (other === id) return false;
      const key = [id, other].sort().join(":");
      return !comparisons.has(key);
    });
  });

  if (uncompared.length < 2) {
    // All pairs compared — fall back to closest-rated pair
    return closestPair(aestheticIds, ratings);
  }

  if (useRandom) {
    const shuffled = [...uncompared].sort(() => Math.random() - 0.5);
    return findUncomparedPair(shuffled, comparisons);
  }

  // Sort by rating, find adjacent pair that hasn't been compared
  const sorted = [...aestheticIds].sort(
    (a, b) => (ratings[b] ?? 1000) - (ratings[a] ?? 1000)
  );
  const pair = findUncomparedPair(sorted, comparisons);
  return pair ?? closestPair(aestheticIds, ratings);
}

function findUncomparedPair(
  ids: string[],
  comparisons: Set<string>
): [string, string] | null {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const key = [ids[i], ids[j]].sort().join(":");
      if (!comparisons.has(key)) {
        return [ids[i], ids[j]];
      }
    }
  }
  return null;
}

function closestPair(
  ids: string[],
  ratings: Record<string, number>
): [string, string] | null {
  if (ids.length < 2) return null;
  const sorted = [...ids].sort(
    (a, b) => (ratings[b] ?? 1000) - (ratings[a] ?? 1000)
  );
  // Pick random adjacent pair to avoid always showing the same two
  const maxIdx = sorted.length - 2;
  const idx = Math.floor(Math.random() * Math.min(maxIdx + 1, 10));
  return [sorted[idx], sorted[idx + 1]];
}

export const DEFAULT_RATING = 1000;
