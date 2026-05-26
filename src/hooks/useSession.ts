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
import { INSERTION_POOL_KEY, INSERTION_STATE_KEY } from "@/lib/session";

export interface RatedAesthetic extends Aesthetic {
  rank: number; // 1-based position in top-K, or K+1 for unranked
}

function loadInsertionState(): InsertionState | null {
  try {
    const raw = localStorage.getItem(INSERTION_STATE_KEY);
    return raw ? (JSON.parse(raw) as InsertionState) : null;
  } catch { return null; }
}

function saveState(s: InsertionState, pool: string[]) {
  localStorage.setItem(INSERTION_STATE_KEY, JSON.stringify(s));
  localStorage.setItem(INSERTION_POOL_KEY, JSON.stringify(pool));
}

function loadPool(): string[] | null {
  try {
    const raw = localStorage.getItem(INSERTION_POOL_KEY);
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
  const [poolSize, setPoolSize] = useState(0);
  const [historyLength, setHistoryLength] = useState(0);

  const supabase = createClient();
  const aestheticsRef = useRef<Aesthetic[]>([]);
  const poolRef = useRef<string[]>([]);
  const historyRef = useRef<InsertionState[]>([]);

  function findAesthetic(id: string): Aesthetic | undefined {
    return aestheticsRef.current.find((a) => a.id === id);
  }

  function resolveAndSetPair(s: InsertionState) {
    // Advance past first item (no comparison needed) and skip any
    // candidate that would otherwise produce a degenerate "A vs A" pair
    // (this can only happen with a broken pool that contains duplicates;
    // we keep the guard so older localStorage states don't get stuck).
    let cur = s;
    // Hard ceiling — prevents an unexpected loop from hanging the UI.
    for (let safety = 0; safety < 1000; safety++) {
      if (
        cur.sorted.length === 0 &&
        cur.remaining.length > 0 &&
        !cur.pending
      ) {
        cur = advanceNoComparison(cur);
        continue;
      }
      const candidatePair = nextPair(cur);
      if (!candidatePair) break;
      if (candidatePair[0] !== candidatePair[1]) break;

      console.warn(
        "[useSession] dropped duplicate candidate from comparison pool",
        candidatePair[0]
      );
      // Remove the duplicate candidate from `remaining` without emitting
      // a comparison. Pending state (if any) is cleared because its
      // candidate is the bad id.
      const broken = cur.pending?.candidate ?? cur.remaining[0];
      cur = {
        ...cur,
        remaining: cur.remaining.filter((id) => id !== broken),
        pending: null,
      };
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

  const likedIdsKey = likedIds.join(",");

  // Initialize once aesthetics are loaded
  useEffect(() => {
    if (!aesthetics.length) return;

    const storedPool = loadPool();
    const storedState = loadInsertionState();

    // No likes yet (e.g. just viewing /ranking) — restore any saved run.
    if (!likedIds.length) {
      if (storedPool && storedState) {
        poolRef.current = storedPool;
        queueMicrotask(() => {
          setPoolSize(storedPool.length);
          setInsertState(storedState);
          resolveAndSetPair(storedState);
        });
      }
      return;
    }

    const allIds = aesthetics.map((a) => a.id);
    const rawPool = likedIds.length >= K ? likedIds : allIds;
    // Defensive dedupe — see resolveAndSetPair for why duplicates would be
    // disastrous (they'd produce "A vs A" comparison pairs).
    const seen = new Set<string>();
    const pool = rawPool.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

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
    queueMicrotask(() => {
      setPoolSize(pool.length);
      setInsertState(state);
      resolveAndSetPair(state);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aesthetics, likedIdsKey]);

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
      setHistoryLength(historyRef.current.length);
      const newState = applyResult(insertState, winnerId);
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
    setHistoryLength(historyRef.current.length);
    setInsertState(prev);
    saveState(prev, poolRef.current);
    resolveAndSetPair(prev);
    // Note: DB comparisons entry is NOT deleted on undo (acceptable for niche score)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canUndo = historyLength > 0;

  const skip = useCallback(() => {
    if (insertState) resolveAndSetPair(insertState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertState]);

  const topK = insertState ? getTopK(insertState) : [];
  const complete = !!insertState && isComplete(insertState);
  const { done, estimate } = insertState
    ? getProgress(insertState, poolSize)
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
