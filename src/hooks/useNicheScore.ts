"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface NicheResult {
  score: number;          // 0 = очень мейнстрим, 100 = очень нишевый
  label: string;          // "Very niche" / "Niche" / etc.
  totalRankings: number;  // сколько чужих сессий сравнивалось
  loading: boolean;
}

const LABELS: Array<{ max: number; label: string }> = [
  { max: 20,  label: "Very mainstream" },
  { max: 40,  label: "Mainstream" },
  { max: 60,  label: "Mixed taste" },
  { max: 80,  label: "Niche" },
  { max: 101, label: "Very niche" },
];

function labelFor(score: number) {
  return LABELS.find((l) => score < l.max)?.label ?? "Very niche";
}

/**
 * Calculates how niche the user's top-K is compared to the global pool.
 *
 * Method:
 *  1. Fetch winner_id from all comparisons (excluding current session).
 *  2. Count wins per aesthetic → global popularity ranking.
 *  3. For each item in the user's top-K, find its popularity percentile
 *     (0 = most popular globally, 1 = least popular / most niche).
 *  4. Niche score = mean percentile * 100, rounded.
 */
export function useNicheScore(
  topKIds: string[],
  currentSessionId: string | null,
  enabled: boolean
): NicheResult {
  const [result, setResult] = useState<Omit<NicheResult, "loading">>({
    score: 0,
    label: "",
    totalRankings: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || topKIds.length === 0) return;

    setLoading(true);
    const supabase = createClient();

    supabase
      .from("comparisons")
      .select("winner_id, session_id")
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }

        // Exclude current user's session
        const rows = currentSessionId
          ? data.filter((r) => r.session_id !== currentSessionId)
          : data;

        if (rows.length === 0) {
          setLoading(false);
          return;
        }

        // Count wins per aesthetic
        const wins = new Map<string, number>();
        const sessions = new Set<string>();
        for (const { winner_id, session_id } of rows) {
          wins.set(winner_id, (wins.get(winner_id) ?? 0) + 1);
          sessions.add(session_id);
        }

        // Sort by popularity (most wins first)
        const ranked = [...wins.keys()].sort(
          (a, b) => (wins.get(b) ?? 0) - (wins.get(a) ?? 0)
        );
        const total = ranked.length;

        // For each item in user's top-K, compute popularity percentile
        // percentile 0 = #1 globally (most mainstream)
        // percentile 1 = last globally (most niche)
        const percentiles = topKIds.map((id) => {
          const rank = ranked.indexOf(id);
          if (rank === -1) return 1; // never appeared in others' data = maximally niche
          return rank / Math.max(total - 1, 1);
        });

        const avgPercentile =
          percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
        const score = Math.round(avgPercentile * 100);

        setResult({ score, label: labelFor(score), totalRankings: sessions.size });
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, topKIds.join(","), currentSessionId]);

  return { ...result, loading };
}
