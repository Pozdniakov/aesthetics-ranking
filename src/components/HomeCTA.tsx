"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EraseRankingButton } from "./EraseRankingButton";
import { LIKES_KEY, SESSION_KEY, SWIPE_INDEX_KEY } from "@/lib/session";

function detectProgress(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const likes = localStorage.getItem(LIKES_KEY);
    const idx = localStorage.getItem(SWIPE_INDEX_KEY);
    const sessionId = localStorage.getItem(SESSION_KEY);
    const hasLikes = !!likes && JSON.parse(likes).length > 0;
    const hasSwiped = !!idx && parseInt(idx, 10) > 0;
    return !!sessionId || hasLikes || hasSwiped;
  } catch {
    return false;
  }
}

export function HomeCTA() {
  // `null` = still detecting on the client. Avoid flashing the wrong CTA.
  const [hasProgress, setHasProgress] = useState<boolean | null>(null);

  useEffect(() => {
    queueMicrotask(() => setHasProgress(detectProgress()));
  }, []);

  // Placeholder with same dimensions to prevent layout shift on initial render.
  if (hasProgress === null) {
    return (
      <div className="flex flex-col sm:flex-row gap-3 opacity-0 pointer-events-none">
        <span className="px-8 py-3.5 rounded-xl text-sm">placeholder</span>
      </div>
    );
  }

  // No previous ranking → the only sensible action is to start comparing.
  if (!hasProgress) {
    return (
      <Link
        href="/compare"
        className="px-8 py-3.5 rounded-xl bg-white text-black font-semibold text-sm tracking-wide uppercase hover:bg-white/90 transition-colors"
      >
        Compare →
      </Link>
    );
  }

  // Existing ranking → view it, or wipe-and-restart with explicit confirmation.
  return (
    <div className="flex flex-col items-center gap-4">
      <Link
        href="/ranking"
        className="px-8 py-3.5 rounded-xl bg-white text-black font-semibold text-sm tracking-wide uppercase hover:bg-white/90 transition-colors"
      >
        My ranking →
      </Link>
      <EraseRankingButton className="text-white/40 hover:text-white/80 text-xs uppercase tracking-[0.15em] underline-offset-4 hover:underline transition-colors">
        Erase ranking & compare again
      </EraseRankingButton>
    </div>
  );
}
