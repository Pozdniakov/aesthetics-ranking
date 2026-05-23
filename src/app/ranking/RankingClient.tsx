"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { useSwipe } from "@/hooks/useSwipe";
import { useNicheScore } from "@/hooks/useNicheScore";
import { createClient } from "@/lib/supabase/client";
import { EraseRankingButton } from "@/components/EraseRankingButton";
import type { RatedAesthetic } from "@/hooks/useSession";

export function RankingClient() {
  const swipe = useSwipe([]);
  const session = useSession(
    swipe.isDone && swipe.loaded ? swipe.likedIds : []
  );

  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const supabase = createClient();

  // Hooks must run unconditionally — call useNicheScore here even if data is
  // still loading; the hook's `enabled` flag handles gating.
  const hasFullTop = session.confirmedTop.length >= session.K;
  const niche = useNicheScore(
    session.confirmedTop,
    session.sessionId,
    hasFullTop
  );

  const handleShare = async () => {
    if (!session.sessionId) return;
    setSharing(true);
    try {
      const slug = nanoid(8);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("ranking_sessions")
        .update({ share_slug: slug, is_public: true })
        .eq("id", session.sessionId);
      const url = `${window.location.origin}/share/${slug}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to generate link");
    } finally {
      setSharing(false);
    }
  };

  if (session.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (session.error) {
    return <div className="text-center py-20"><p className="text-red-400 text-sm">{session.error}</p></div>;
  }

  const top5 = session.rankedPool.slice(0, session.K);
  const rest = session.rankedPool.slice(session.K);
  const hasData = session.totalComparisons > 0;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full px-4 py-8">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">My Top 5 Aesthetics</h1>
          <p className="text-white/40 text-sm mt-1">
            {session.totalComparisons} comparisons
          </p>
        </div>
        {hasData ? (
          <EraseRankingButton className="flex-shrink-0 px-4 py-2 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors">
            Erase ranking & compare again
          </EraseRankingButton>
        ) : (
          <Link
            href="/compare"
            className="flex-shrink-0 px-4 py-2 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors"
          >
            Compare
          </Link>
        )}
      </div>

      {!hasData && (
        <div className="text-center py-16 flex flex-col items-center gap-4">
          <p className="text-white/40 text-sm">Start comparing to build your ranking.</p>
          <Link href="/compare" className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors">
            Go to Compare →
          </Link>
        </div>
      )}

      {/* Top 5 */}
      {hasData && (
        <>
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-sm font-semibold">Top 5 Favorites</span>
            </div>
            <ol className="space-y-2">
              {top5.map((item, i) => (
                <TopItem key={item.id} item={item} pos={i + 1} />
              ))}
            </ol>
          </section>

          {/* Taste profile — full breakdown with scale */}
          {hasFullTop && !niche.loading && niche.label && (() => {
            const deviation = niche.score - 50;
            const sign = deviation > 0 ? "+" : deviation < 0 ? "−" : "";
            const magnitude = Math.abs(deviation);
            const direction = deviation > 0 ? "niche" : deviation < 0 ? "mainstream" : "balanced";
            return (
              <section className="w-full rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-white/50 text-xs uppercase tracking-widest">
                    Taste profile
                  </p>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest">
                    {niche.totalRankings} other ranking{niche.totalRankings !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Bar */}
                <div className="relative h-[2px] bg-white/10 rounded-full mt-3">
                  <div
                    className="absolute top-0 h-full bg-white/70 rounded-full transition-all duration-700"
                    style={{
                      left: deviation < 0 ? `${niche.score}%` : "50%",
                      right: deviation > 0 ? `${100 - niche.score}%` : "50%",
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border border-black/40 shadow-md transition-all duration-700"
                    style={{ left: `${niche.score}%` }}
                  />
                </div>

                {/* End labels + score on the same line. Score is anchored
                    to the centre (not to the marker position) so it never
                    overlaps the Mainstream/Niche labels at extreme scores. */}
                <div className="relative mt-2 h-4 text-[10px] uppercase tracking-[0.18em] text-white/40">
                  <span className="absolute left-0 top-0">Mainstream</span>
                  <span className="absolute right-0 top-0">Niche</span>
                  <span
                    className="absolute left-1/2 top-0 -translate-x-1/2 font-mono tabular-nums normal-case tracking-normal text-white text-[11px] whitespace-nowrap"
                    aria-label={`Your taste score: ${sign}${magnitude || 0}`}
                  >
                    {sign}
                    {magnitude}
                  </span>
                </div>

                {/* Verdict — only show "leaning X" when the label is neutral
                    (Mixed taste); otherwise the label already says it. */}
                <div className="mt-6">
                  <p
                    className="font-display italic text-white text-2xl sm:text-3xl leading-none"
                    style={{ fontVariationSettings: '"opsz" 144' }}
                  >
                    {niche.label}
                  </p>
                  {niche.label === "Mixed taste" && direction !== "balanced" && (
                    <p
                      className="font-display italic text-white/45 text-base sm:text-lg leading-none mt-2"
                      style={{ fontVariationSettings: '"opsz" 96' }}
                    >
                      leaning {direction}
                    </p>
                  )}
                </div>
              </section>
            );
          })()}

          {/* Share */}
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {shareUrl ? (
              <>
                <p className="text-white/60 text-sm flex-1 break-all">{shareUrl}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied!"); }}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                >
                  Copy again
                </button>
              </>
            ) : (
              <>
                <p className="text-white/60 text-sm flex-1">Share your top 5 with others</p>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition-colors"
                >
                  {sharing ? "Generating…" : "Share →"}
                </button>
              </>
            )}
          </section>

          {/* Rest of liked items */}
          {rest.length > 0 && (
            <section>
              <details className="group">
                <summary className="flex items-center gap-2 cursor-pointer mb-3 text-white/40 hover:text-white/60 text-sm transition-colors list-none">
                  <span>Other liked aesthetics ({rest.length})</span>
                  <span className="text-white/20 group-open:rotate-90 transition-transform inline-block">›</span>
                </summary>
                <ol className="space-y-2">
                  {rest.map((item, i) => (
                    <TopItem key={item.id} item={item} pos={session.K + i + 1} />
                  ))}
                </ol>
              </details>
            </section>
          )}

          {/* Start fresh — destructive action, with confirmation */}
          <div className="flex justify-center pt-2">
            <EraseRankingButton className="text-white/30 hover:text-white/60 text-xs uppercase tracking-[0.15em] underline-offset-4 hover:underline transition-colors">
              Erase ranking & compare again
            </EraseRankingButton>
          </div>
        </>
      )}
    </div>
  );
}

function TopItem({ item, pos }: { item: RatedAesthetic; pos: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  return (
    <li>
      <a
        href={`https://cari.institute/aesthetics/${item.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl p-3 border bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
      >
        <span className="text-lg w-8 text-center flex-shrink-0">
          {medals[pos] ?? <span className="text-white/30 font-mono text-sm">#{pos}</span>}
        </span>
        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800">
          {item.cover_image_url && (
            <Image src={item.cover_image_url} alt={item.name} fill className="object-cover" sizes="48px" unoptimized />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{item.name}</p>
          {item.decade && <p className="text-white/30 text-xs">{item.decade}</p>}
        </div>
        <div className="flex-shrink-0">
          <span className="text-white/20 font-mono text-xs">#{pos}</span>
        </div>
      </a>
    </li>
  );
}
