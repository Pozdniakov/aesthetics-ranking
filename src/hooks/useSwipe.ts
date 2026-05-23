"use client";

import { useState, useEffect } from "react";
import type { Aesthetic } from "@/lib/supabase/types";

const LIKES_KEY = "aesthetics_likes_v2";
const INDEX_KEY = "aesthetics_swipe_index_v2";

interface HistoryEntry {
  prevIndex: number;
  wasLiked: boolean;
  aestheticId: string;
}

export function useSwipe(aesthetics: Aesthetic[]) {
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // History is only in-memory (not persisted) — undo only within the session
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    // Load persisted likes/index regardless of aesthetic list length so that
    // pages that just want to display saved progress (e.g. /ranking) can read them.
    try {
      const likes = localStorage.getItem(LIKES_KEY);
      const index = localStorage.getItem(INDEX_KEY);
      if (likes) setLikedIds(JSON.parse(likes));
      if (index) {
        const parsed = parseInt(index, 10);
        setCurrentIndex(
          aesthetics.length > 0 ? Math.min(parsed, aesthetics.length) : parsed
        );
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [aesthetics.length]);

  function persist(likes: string[], index: number) {
    localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
    localStorage.setItem(INDEX_KEY, String(index));
  }

  const like = () => {
    if (currentIndex >= aesthetics.length) return;
    const id = aesthetics[currentIndex].id;
    const newLikes = [...likedIds, id];
    const next = currentIndex + 1;
    setHistory((h) => [...h, { prevIndex: currentIndex, wasLiked: true, aestheticId: id }]);
    setLikedIds(newLikes);
    setCurrentIndex(next);
    persist(newLikes, next);
  };

  const dislike = () => {
    if (currentIndex >= aesthetics.length) return;
    const id = aesthetics[currentIndex].id;
    const next = currentIndex + 1;
    setHistory((h) => [...h, { prevIndex: currentIndex, wasLiked: false, aestheticId: id }]);
    setCurrentIndex(next);
    persist(likedIds, next);
  };

  // Skip = same effect as dislike (advance without liking)
  const skip = dislike;

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCurrentIndex(last.prevIndex);
    const newLikes = last.wasLiked
      ? likedIds.filter((id) => id !== last.aestheticId)
      : likedIds;
    setLikedIds(newLikes);
    persist(newLikes, last.prevIndex);
  };

  const reset = () => {
    setLikedIds([]);
    setCurrentIndex(0);
    setHistory([]);
    localStorage.removeItem(LIKES_KEY);
    localStorage.removeItem(INDEX_KEY);
  };

  const isDone = loaded && currentIndex >= aesthetics.length;
  const current = aesthetics[currentIndex] ?? null;
  const canUndo = history.length > 0;

  return {
    current,
    currentIndex,
    total: aesthetics.length,
    likedIds,
    isDone,
    loaded,
    canUndo,
    like,
    dislike,
    skip,
    undo,
    reset,
  };
}
