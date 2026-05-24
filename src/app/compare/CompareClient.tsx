"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RotateCw, Undo2 } from "lucide-react";
import { SwipeCard } from "@/components/SwipeCard";
import { AestheticCard } from "@/components/AestheticCard";
import { StageIndicator } from "@/components/StageIndicator";
import { NameGate } from "@/components/NameGate";
import { useSwipe } from "@/hooks/useSwipe";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateShuffleSeed, shuffleWithSeed } from "@/lib/shuffle";
import { getStoredDisplayName } from "@/lib/session";
import type { Aesthetic } from "@/lib/supabase/types";

export function CompareClient() {
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("aesthetics").select("*")
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else {
          // Per-user deterministic shuffle so each session sees a different order
          // but reloads keep it stable.
          const seed = getOrCreateShuffleSeed();
          setAesthetics(shuffleWithSeed((data ?? []) as Aesthetic[], seed));
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/50 text-sm">Loading aesthetics…</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-20"><p className="text-red-400 text-sm">{error}</p></div>;
  }

  return <CompareInner aesthetics={aesthetics} />;
}

function CompareInner({ aesthetics }: { aesthetics: Aesthetic[] }) {
  const swipe = useSwipe(aesthetics);
  const swipeDone = swipe.isDone && swipe.loaded;

  const session = useSession(swipeDone ? swipe.likedIds : []);
  const router = useRouter();

  // Name gate — shown once at the very start of a fresh session so the
  // share page can attribute the ranking to a real person.
  // `null` while we figure it out on the client; `false` once dismissed.
  const [nameGateOpen, setNameGateOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (!swipe.loaded) return;
    const freshStart = swipe.currentIndex === 0 && swipe.likedIds.length === 0;
    setNameGateOpen(freshStart && !getStoredDisplayName());
  }, [swipe.loaded, swipe.currentIndex, swipe.likedIds.length]);

  // The CompletionScreen used to live here, but it duplicated /ranking.
  // Now /compare is exclusively the comparing flow — once a ranking is
  // complete we send the user straight to /ranking, which is the canonical
  // home for the result.
  const isDone =
    session.isComplete || (!session.currentPair && session.totalComparisons > 0);

  useEffect(() => {
    if (isDone) {
      router.replace("/ranking");
    }
  }, [isDone, router]);

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <p className="text-white/50 text-sm">Saving your ranking…</p>
      </div>
    );
  }

  // ── Phase 1: swipe ────────────────────────────────────
  if (!swipeDone) {
    if (!swipe.loaded || aesthetics.length === 0 || nameGateOpen === null) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      );
    }

    if (nameGateOpen) {
      return <NameGate onContinue={() => setNameGateOpen(false)} />;
    }

    if (!swipe.current) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
          <h2
            className="font-display text-white text-4xl font-medium tracking-tight"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80' }}
          >
            Nicely <em className="italic font-light">done</em>
          </h2>
          <p className="text-white/50 text-sm max-w-xs">
            You liked <strong className="text-white">{swipe.likedIds.length}</strong> aesthetics.
            <br />
            Now let&apos;s rank your favorites.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
          >
            Start ranking →
          </button>
        </div>
      );
    }

    return (
      <SwipeCard
        aesthetic={swipe.current}
        currentIndex={swipe.currentIndex}
        total={swipe.total}
        canUndo={swipe.canUndo}
        onLike={swipe.like}
        onDislike={swipe.dislike}
        onUndo={swipe.undo}
      />
    );
  }

  // ── Phase 2: compare within liked pool ───────────────
  const [left, right] = session.currentPair ?? [null, null];

  return (
    // Container locks to exactly the visible viewport between the sticky
    // site header (~52px) and the site footer (~51px). 6.5rem (104px)
    // matches the real header+footer height almost exactly, leaving no
    // wasted band above the footer. The smaller `py-2` on mobile gives
    // another ~8px of breathing room to the description region without
    // touching the action buttons or the prompt row.
    <div className="flex flex-col gap-2 sm:gap-3 max-w-3xl mx-auto w-full px-3 sm:px-4 py-2 sm:py-4 h-[calc(100dvh-6.5rem)] min-h-[520px] overflow-hidden">
      {/* Top bar — Undo lives here so it stays in the same place across
          both phases (in phase 1 it sits next to the StageIndicator too). */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={session.undo}
          disabled={!session.canUndo}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
          aria-label="Undo last comparison"
        >
          <Undo2 className="w-4 h-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Undo</span>
        </button>
        <div className="flex-1 min-w-0">
          <StageIndicator
            currentStage={2}
            stage1={{ done: swipe.likedIds.length, total: swipe.total }}
            stage2={{
              done: session.totalComparisons,
              estimate: session.estimatedTotal,
            }}
          />
        </div>
      </div>

      {/* Combined prompt row: rotate hint on the left (only when the
          viewport is small and portrait), the prompt absolutely centred
          so its position is unaffected by its neighbours, and `Can't
          decide` on the right. Replaces the previous standalone bottom
          row, which freed ~36px of vertical space for the descriptions. */}
      <div className="relative flex items-center flex-shrink-0">
        <p className="hidden max-sm:portrait:inline-flex items-center gap-1 text-white/35 text-[10px] flex-shrink-0">
          <RotateCw className="w-3 h-3" strokeWidth={1.75} />
          <span>Rotate phone</span>
        </p>
        <p className="absolute inset-x-0 text-white/40 text-xs text-center tracking-[0.2em] uppercase pointer-events-none">
          Which do you prefer?
        </p>
        <button
          onClick={session.skip}
          className="ml-auto text-white/30 hover:text-white/60 text-xs sm:text-sm transition-colors flex-shrink-0 relative z-10"
        >
          Can&apos;t decide
        </button>
      </div>

      {left && right && (
        // `grid-rows-1` with `minmax(0, 1fr)` (Tailwind default) forces the
        // single row to fill the available flex space instead of growing
        // to fit content. Combined with `h-full` on each card it makes
        // every card the same height — both between left/right and
        // between consecutive comparisons.
        <div className="grid grid-cols-2 grid-rows-1 gap-2 sm:gap-3 flex-1 min-h-0">
          <AestheticCard aesthetic={left} side="left" />
          <AestheticCard aesthetic={right} side="right" />
        </div>
      )}

      {/* Action bar — pinned at the bottom of the flex column so the two
          choose buttons always sit at the same y-coordinate, no matter
          what the cards above contain. Colour-coded to match each card's
          border (indigo = left, rose = right) and shevroned for the
          left/right mapping. */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => left && right && session.choose(left.id, right.id)}
          disabled={!left || !right}
          aria-label={left ? `Choose ${left.name}` : "Choose left"}
          className="flex items-center justify-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 rounded-xl border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/60 active:scale-[0.985] text-indigo-100 font-medium text-sm sm:text-base tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
          <span>Choose left</span>
        </button>
        <button
          type="button"
          onClick={() => left && right && session.choose(right.id, left.id)}
          disabled={!left || !right}
          aria-label={right ? `Choose ${right.name}` : "Choose right"}
          className="flex items-center justify-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 rounded-xl border border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/60 active:scale-[0.985] text-rose-100 font-medium text-sm sm:text-base tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
        >
          <span>Choose right</span>
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
        </button>
      </div>

    </div>
  );
}
