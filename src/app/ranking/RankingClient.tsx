"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Check, Copy, Share2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useSwipe } from "@/hooks/useSwipe";
import { useNicheScore } from "@/hooks/useNicheScore";
import { createClient } from "@/lib/supabase/client";
import {
  getStoredDisplayName,
  getStoredShareUrl,
  setStoredShareUrl,
} from "@/lib/session";
import { EraseRankingButton } from "@/components/EraseRankingButton";
import type { RatedAesthetic } from "@/hooks/useSession";

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API can fail on mobile if an async DB write consumed the
    // original user activation. The textarea fallback works in more browsers.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}

export function RankingClient() {
  const swipe = useSwipe([]);
  const session = useSession(
    swipe.isDone && swipe.loaded ? swipe.likedIds : []
  );

  const [sharing, setSharing] = useState(false);
  // Initialize shareUrl from localStorage on mount so the URL survives
  // reloads and the user doesn't see "Generating…" each time they revisit
  // their ranking. The first render is `null` to keep server/client
  // identical; the useEffect below hydrates from storage.
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const supabase = createClient();

  // Hooks must run unconditionally — call useNicheScore here even if data is
  // still loading; the hook's `enabled` flag handles gating.
  const hasFullTop = session.confirmedTop.length >= session.K;
  const niche = useNicheScore(
    session.confirmedTop,
    session.sessionId,
    hasFullTop
  );

  /**
   * Generates (or regenerates) the share URL: writes a new slug to
   * ranking_sessions and persists it to localStorage. Returns the URL or
   * null on failure. `silent` skips user-facing toasts when called as part
   * of the auto-generate flow on mount.
   */
  const generateShareUrl = useCallback(
    async (silent: boolean): Promise<string | null> => {
      if (!session.sessionId) return null;
      try {
        const slug = nanoid(8);
        const displayName = getStoredDisplayName();
        // Persist the *exact* algorithm-ranked top so the share page renders
        // what the user actually saw, not a wins-based reconstruction (which
        // would diverge whenever the user used undo or whenever the Guarded
        // Insertion order disagrees with raw win counts).
        const topKIds = session.confirmedTop;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("ranking_sessions")
          .update({
            share_slug: slug,
            is_public: true,
            display_name: displayName,
            top_k_ids: topKIds,
          })
          .eq("id", session.sessionId);
        if (error) throw error;
        const url = `${window.location.origin}/share/${slug}`;
        setShareUrl(url);
        setStoredShareUrl(url);
        return url;
      } catch {
        if (!silent) toast.error("Failed to generate link");
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.sessionId, session.confirmedTop.join(",")]
  );

  const handleShareClick = async () => {
    setSharing(true);
    const url = shareUrl ?? (await generateShareUrl(false));
    setSharing(false);
    if (!url) return;
    const copied = await copyTextToClipboard(url);
    setCopyOk(copied);
    toast[copied ? "success" : "error"](
      copied ? "Link copied!" : "Copy failed — long-press the link"
    );
    if (copied) setTimeout(() => setCopyOk(false), 2000);
  };

  // Auto-generate the share URL once the user has a complete top-5 and a
  // session id. This eliminates the "Share →" extra click that was easy
  // to miss and made testers send the bare /ranking URL (which renders
  // empty for any other viewer because the data lives in localStorage).
  const autoSharedRef = useRef(false);
  useEffect(() => {
    // Hydrate from localStorage first so reloads pick up the prior link.
    const stored = getStoredShareUrl();
    if (stored && !shareUrl) {
      setShareUrl(stored);
      autoSharedRef.current = true;
      return;
    }
    if (
      !autoSharedRef.current &&
      !shareUrl &&
      hasFullTop &&
      session.sessionId
    ) {
      autoSharedRef.current = true;
      void generateShareUrl(true);
    }
  }, [shareUrl, hasFullTop, session.sessionId, generateShareUrl]);

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

      {/* Title row stacks vertically on narrow viewports — the long
          "Erase ranking & compare again" pill was previously
          `flex-shrink-0`, squashing the heading to ~100px and causing
          the page-title overflow Кеша reported. */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-white text-2xl font-bold leading-tight">
            My Top 5 Aesthetics
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {session.totalComparisons} comparisons
          </p>
        </div>
        {hasData ? (
          <EraseRankingButton className="self-start px-4 py-2 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors whitespace-nowrap">
            Erase &amp; compare again
          </EraseRankingButton>
        ) : (
          <Link
            href="/compare"
            className="self-start px-4 py-2 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors whitespace-nowrap"
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

          {/* Share — moved above the Taste profile block so it stays
              visible without scrolling on mobile. Testers were copying
              the address-bar /ranking URL because the share block was
              below the fold; promoting it here is the cheapest fix. */}
          {hasFullTop && (
            <section
              className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent p-5 sm:p-6"
              aria-label="Share your ranking"
            >
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4 text-amber-300" aria-hidden />
                <h2 className="text-amber-200 text-sm font-semibold uppercase tracking-widest">
                  Share your ranking
                </h2>
              </div>

              {shareUrl ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                    <input
                      readOnly
                      value={shareUrl}
                      onClick={(e) => e.currentTarget.select()}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 px-3 py-3 rounded-xl bg-black/40 border border-white/15 text-white text-sm font-mono truncate focus:outline-none focus:border-white/40"
                      aria-label="Share URL"
                    />
                    <button
                      onClick={handleShareClick}
                      disabled={sharing}
                      className={`flex-shrink-0 px-5 py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                        copyOk
                          ? "bg-emerald-400 text-black"
                          : "bg-white text-black hover:bg-white/90 disabled:opacity-50"
                      }`}
                    >
                      {copyOk ? (
                        <>
                          <Check className="w-4 h-4" aria-hidden /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" aria-hidden /> Copy link
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-3 text-white/45 text-xs leading-snug">
                    <span className="text-white/60">Tip:</span> send the link
                    above — not the URL in your address bar. The
                    <span className="font-mono text-white/60"> /ranking </span>
                    page only shows results to you.
                  </p>
                </>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <p className="text-white/60 text-sm flex-1">
                    Generate a public link to your top 5.
                  </p>
                  <button
                    onClick={handleShareClick}
                    disabled={sharing}
                    className="flex-shrink-0 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" aria-hidden />
                    {sharing ? "Generating…" : "Create share link"}
                  </button>
                </div>
              )}
            </section>
          )}

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
      <Link
        href={`/aesthetics/${item.slug}`}
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
      </Link>
    </li>
  );
}
