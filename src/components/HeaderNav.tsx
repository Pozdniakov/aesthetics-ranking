"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EraseRankingButton } from "./EraseRankingButton";

function detectProgress(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const likes = localStorage.getItem("aesthetics_likes_v2");
    const idx = localStorage.getItem("aesthetics_swipe_index_v2");
    const sessionId = localStorage.getItem("aesthetics_session_id");
    const hasLikes = !!likes && JSON.parse(likes).length > 0;
    const hasSwiped = !!idx && parseInt(idx, 10) > 0;
    return !!sessionId || hasLikes || hasSwiped;
  } catch {
    return false;
  }
}

export function HeaderNav() {
  // HeaderNav lives in the root layout, so it doesn't unmount on client-side
  // navigation. We re-detect localStorage state on every route change and
  // also listen for storage events so cross-tab edits stay in sync.
  const pathname = usePathname();
  const [hasProgress, setHasProgress] = useState<boolean | null>(null);

  useEffect(() => {
    setHasProgress(detectProgress());
  }, [pathname]);

  useEffect(() => {
    const onStorage = () => setHasProgress(detectProgress());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Whitespace-nowrap on every link is the difference between a slim
  // single-row header and one that wraps onto two lines on narrow
  // viewports. The labels are intentionally shorter on `<sm` so the row
  // always fits next to the logo without growing the header.
  return (
    <div className="flex items-center gap-3 sm:gap-5">
      {hasProgress ? (
        <>
          <EraseRankingButton className="text-white/60 hover:text-white text-sm transition-colors whitespace-nowrap">
            <span className="hidden sm:inline">Erase ranking &amp; compare again</span>
            <span className="sm:hidden">Reset</span>
          </EraseRankingButton>
          <Link
            href="/ranking"
            className="text-white/60 hover:text-white text-sm transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">My Ranking</span>
            <span className="sm:hidden">Ranking</span>
          </Link>
        </>
      ) : (
        <Link
          href="/compare"
          className="text-white/60 hover:text-white text-sm transition-colors whitespace-nowrap"
        >
          Compare
        </Link>
      )}
      <Link
        href="/global"
        className="text-white/60 hover:text-white text-sm transition-colors whitespace-nowrap"
      >
        Global
      </Link>
    </div>
  );
}
