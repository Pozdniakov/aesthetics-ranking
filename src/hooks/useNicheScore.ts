"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { calculateNicheScore } from "@/lib/niche";

export interface NicheResult {
  score: number;          // 0 = очень мейнстрим, 100 = очень нишевый
  label: string;          // "Very niche" / "Niche" / etc.
  totalRankings: number;  // сколько чужих сессий сравнивалось
  loading: boolean;
}

/**
 * Calculates how niche the user's top-K is compared to the global pool.
 *
 * Method:
 *  1. Fetch all comparisons (excluding current session).
 *  2. Rank aesthetics by smoothed win-rate → global popularity ranking.
 *  3. For each item in the user's top-K, find its popularity percentile
 *     (0 = most popular globally, 1 = least popular / most niche).
 *  4. Niche score = mean percentile * 100, rounded.
 */
export function useNicheScore(
  topKIds: string[],
  currentSessionId: string | null,
  enabled: boolean
): NicheResult {
  const topKKey = topKIds.join(",");
  const [result, setResult] = useState<Omit<NicheResult, "loading">>({
    score: 0,
    label: "",
    totalRankings: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || topKIds.length === 0) return;

    queueMicrotask(() => setLoading(true));
    const supabase = createClient();

    supabase
      .from("comparisons")
      .select("winner_id, loser_id, session_id")
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }

        const score = calculateNicheScore(topKIds, data, currentSessionId);
        if (score) setResult(score);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, topKKey, currentSessionId]);

  return { ...result, loading };
}
