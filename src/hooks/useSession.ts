"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateSession } from "@/lib/session";
import { getOrCreateShuffleSeed, shuffleWithSeed } from "@/lib/shuffle";
import {
  initInsertion,
  advanceNoComparison,
  nextPair,
  applyResult,
  isComplete,
  getTopK,
  getProgress,
  K,
  type InsertionState,
} from "@/lib/guarded-insertion";
import type { Aesthetic } from "@/lib/supabase/types";

export interface RatedAesthetic extends Aesthetic {
  rank: number; // 1-based position in top-K, or K+1 for unranked
}

const STATE_KEY = "aesthetics_insertion_state_v1";
const POOL_KEY = "aesthetics_insertion_pool_v1";

function loadInsertionState(): InsertionState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as InsertionState) : null;
  } catch { return null; }
}

function saveState(s: InsertionState, pool: string[]) {
  localStorage.setItem(STATE_KEY, JSON.stringify(s));
  localStorage.setItem(POOL_KEY, JSON.stringify(pool));
}

function loadPool(): string[] | null {
  try {
    const raw = localStorage.getItem(POOL_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch { return null; }
}

export function useSession(likedIds: string[]) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>([]);
  const [insertState, setInsertState] = useState<InsertionState | null>(null);
  const [currentPair, setCurrentPair] = useState<[Aesthetic, Aesthetic] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const aestheticsRef = useRef<Aesthetic[]>([]);
  const poolRef = useRef<string[]>([]);
  const historyRef = useRef<InsertionState[]>([]);

  function findAesthetic(id: string): Aesthetic | undefined {
    return aestheticsRef.current.find((a) => a.id === id);
  }

  function resolveAndSetPair(s: InsertionState) {
    // Advance past first item (no comparison needed)
    let cur = s;
    while (cur.sorted.length === 0 && cur.remaining.length > 0 && !cur.pending) {
      cur = advanceNoComparison(cur);
    }
    if (cur !== s) {
      setInsertState(cur);
      saveState(cur, poolRef.current);
    }

    const pair = nextPair(cur);
    if (!pair) { setCurrentPair(null); return; }
    const [aId, bId] = pair;
    const a = findAesthetic(aId);
    const b = findAesthetic(bId);
    if (a && b) setCurrentPair(Math.random() > 0.5 ? [a, b] : [b, a]);
  }

  // Initialize once aesthetics are loaded
  useEffect(() => {
    if (!aesthetics.length) return;

    const storedPool = loadPool();
    const storedState = loadInsertionState();

    // No likes yet (e.g. just viewing /ranking) — restore any saved run.
    if (!likedIds.length) {
      if (storedPool && storedState) {
        poolRef.current = storedPool;
        setInsertState(storedState);
        resolveAndSetPair(storedState);
      }
      return;
    }

    const allIds = aesthetics.map((a) => a.id);
    const pool = likedIds.length >= K ? likedIds : allIds;

    let state: InsertionState;
    if (
      storedPool &&
      storedState &&
      storedPool.length === pool.length &&
      pool.every((id) => storedPool.includes(id))
    ) {
      state = storedState;
    } else {
      state = initInsertion(pool);
      saveState(state, pool);
    }

    poolRef.current = pool;
    setInsertState(state);
    resolveAndSetPair(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aesthetics, likedIds.join(",")]);

  useEffect(() => {
    async function init() {
      try {
        const { data, error: err } = await supabase
          .from("aesthetics").select("*");
        if (err) throw err;
        // Per-user deterministic shuffle (same seed as the swipe phase).
        const seed = getOrCreateShuffleSeed();
        const all = shuffleWithSeed((data ?? []) as Aesthetic[], seed);
        setAesthetics(all);
        aestheticsRef.current = all;

        const sid = await getOrCreateSession();
        setSessionId(sid);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to initialize");
      } finally {
        setLoading(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = useCallback(
    async (winnerId: string, loserId: string) => {
      if (!insertState || !sessionId) return;
      // Push snapshot to undo history before applying
      historyRef.current = [...historyRef.current, insertState];
      const newState = applyResult(insertState, winnerId, loserId);
      setInsertState(newState);
      saveState(newState, poolRef.current);
      resolveAndSetPair(newState);

      // Persist to DB for sharing + niche score
      await supabase.from("comparisons").insert({
        session_id: sessionId,
        winner_id: winnerId,
        loser_id: loserId,
      }).then(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [insertState, sessionId]
  );

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setInsertState(prev);
    saveState(prev, poolRef.current);
    resolveAndSetPair(prev);
    // Note: DB comparisons entry is NOT deleted on undo (acceptable for niche score)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canUndo = historyRef.current.length > 0;

  const skip = useCallback(() => {
    if (insertState) resolveAndSetPair(insertState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertState]);

  const topK = insertState ? getTopK(insertState) : [];
  const complete = !!insertState && isComplete(insertState);
  const { done, estimate } = insertState
    ? getProgress(insertState, poolRef.current.length)
    : { done: 0, estimate: 0 };

  const rankedPool: RatedAesthetic[] = (() => {
    const find = (id: string) => aesthetics.find((a) => a.id === id);
    const result: RatedAesthetic[] = [];
    topK.forEach((id, i) => {
      const a = find(id);
      if (a) result.push({ ...a, rank: i + 1 });
    });
    if (insertState) {
      const inTop = new Set(topK);
      insertState.remaining.forEach((id) => {
        if (!inTop.has(id)) {
          const a = find(id);
          if (a) result.push({ ...a, rank: K + 1 });
        }
      });
    }
    return result;
  })();

  return {
    sessionId,
    aesthetics,
    rankedPool,
    currentPair,
    totalComparisons: done,
    estimatedTotal: estimate,
    confirmedTop: topK,
    K,
    isComplete: complete,
    loading,
    error,
    canUndo,
    choose,
    undo,
    skip,
  };
}
