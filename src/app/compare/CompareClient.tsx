"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full px-4 py-6">
      <StageIndicator
        currentStage={2}
        stage1={{ done: swipe.likedIds.length, total: swipe.total }}
        stage2={{
          done: session.totalComparisons,
          estimate: session.estimatedTotal,
        }}
      />

      <p className="text-white/40 text-xs text-center tracking-[0.2em] uppercase">
        Which do you prefer?
      </p>

      {left && right && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <AestheticCard aesthetic={left} side="left" onChoose={() => session.choose(left.id, right.id)} />
          <AestheticCard aesthetic={right} side="right" onChoose={() => session.choose(right.id, left.id)} />
        </div>
      )}

      <div className="flex items-center justify-end pt-1">
        <div className="flex items-center gap-4">
          <button onClick={session.skip} className="text-white/20 hover:text-white/50 text-sm transition-colors">
            Can&apos;t decide
          </button>
          <button
            onClick={session.undo}
            disabled={!session.canUndo}
            className="flex items-center gap-1 text-white/20 hover:text-white/60 disabled:opacity-20 disabled:cursor-not-allowed text-sm transition-colors"
          >
            ↩ Undo
          </button>
        </div>
      </div>
    </div>
  );
}
