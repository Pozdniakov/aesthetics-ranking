"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Network } from "lucide-react";
import { Crown } from "@/components/Crown";
import { createClient } from "@/lib/supabase/client";
import { decadeSortKey, decadesOf, formatYears } from "@/lib/years";
import type { Aesthetic } from "@/lib/supabase/types";

interface AggRow extends Aesthetic {
  wins: number;
  losses: number;
  appearances: number;
  winRate: number; // smoothed win rate (Beta(1,1) prior)
  rawWinRate: number; // wins / appearances (or 0)
}

const PAGE_SIZE = 1000;
const ALL_DECADES = "all";

export function GlobalRankingClient() {
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>([]);
  const [winsMap, setWinsMap] = useState<Map<string, number>>(new Map());
  const [lossesMap, setLossesMap] = useState<Map<string, number>>(new Map());
  const [sessions, setSessions] = useState<Set<string>>(new Set());
  const [totalComparisons, setTotalComparisons] = useState(0);
  const [selectedDecade, setSelectedDecade] = useState(ALL_DECADES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchAll() {
      try {
        const { data: ae, error: aeErr } = await supabase
          .from("aesthetics")
          .select("*");
        if (aeErr) throw aeErr;
        setAesthetics((ae ?? []) as Aesthetic[]);

        // Page through comparisons table.
        const wins = new Map<string, number>();
        const losses = new Map<string, number>();
        const sess = new Set<string>();
        let from = 0;
        let total = 0;
        while (true) {
          const { data: rows, error: cmpErr } = await supabase
            .from("comparisons")
            .select("winner_id, loser_id, session_id")
            .range(from, from + PAGE_SIZE - 1);
          if (cmpErr) throw cmpErr;
          if (!rows || rows.length === 0) break;
          for (const r of rows) {
            wins.set(r.winner_id, (wins.get(r.winner_id) ?? 0) + 1);
            losses.set(r.loser_id, (losses.get(r.loser_id) ?? 0) + 1);
            sess.add(r.session_id);
          }
          total += rows.length;
          if (rows.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        setWinsMap(wins);
        setLossesMap(losses);
        setSessions(sess);
        setTotalComparisons(total);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const ranked: AggRow[] = useMemo(() => {
    const rows: AggRow[] = aesthetics.map((a) => {
      const wins = winsMap.get(a.id) ?? 0;
      const losses = lossesMap.get(a.id) ?? 0;
      const appearances = wins + losses;
      // Beta(1,1) smoothed win rate — pulls items with little data toward 0.5.
      const winRate = (wins + 1) / (appearances + 2);
      const rawWinRate = appearances > 0 ? wins / appearances : 0;
      return { ...a, wins, losses, appearances, winRate, rawWinRate };
    });
    rows.sort((x, y) => {
      if (y.winRate !== x.winRate) return y.winRate - x.winRate;
      if (y.appearances !== x.appearances) return y.appearances - x.appearances;
      return x.name.localeCompare(y.name);
    });
    return rows;
  }, [aesthetics, winsMap, lossesMap]);

  const visible = ranked.filter((r) => r.appearances > 0);
  const dormant = ranked.filter((r) => r.appearances === 0);
  // Bucket each aesthetic into every decade it spans, so the filter
  // surfaces e.g. an "end_year=Current" entry under the current decade
  // even when CARI labels its start in the 2010s. Items spanning
  // multiple decades intentionally appear in each bucket.
  const decadesByAesthetic = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of visible) map.set(r.id, decadesOf(r));
    return map;
  }, [visible]);
  const decades = useMemo(
    () =>
      Array.from(
        new Set(
          Array.from(decadesByAesthetic.values()).flat()
        )
      ).sort((a, b) => decadeSortKey(a) - decadeSortKey(b)),
    [decadesByAesthetic]
  );
  const filteredVisible =
    selectedDecade === ALL_DECADES
      ? visible
      : visible.filter((r) =>
          (decadesByAesthetic.get(r.id) ?? []).includes(selectedDecade)
        );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (totalComparisons === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
        <h1
          className="font-display text-white text-3xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80' }}
        >
          The <em className="italic font-light">global ranking</em> is empty
        </h1>
        <p className="text-white/40 text-sm max-w-md">
          No comparisons have been recorded yet. Be the first to vote and seed
          the collective taste.
        </p>
        <Link
          href="/compare"
          className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
        >
          Start comparing →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="font-display text-white text-4xl tracking-tight leading-none"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80' }}
          >
            Global <em className="italic font-light">ranking</em>
          </h1>
          <p className="text-white/40 text-sm mt-2">
            <span className="font-mono tabular-nums text-white/70">
              {totalComparisons.toLocaleString()}
            </span>{" "}
            comparisons across{" "}
            <span className="font-mono tabular-nums text-white/70">
              {sessions.size}
            </span>{" "}
            session{sessions.size === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/compare"
          className="text-white/50 hover:text-white text-xs uppercase tracking-[0.2em] transition-colors inline-flex items-center gap-1.5"
        >
          Cast your votes
          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </Link>
      </div>

      {/* Affinity graph CTA — exposed prominently because the graph view is
          a parallel way of reading the global data and would otherwise be
          undiscoverable inside the ranking page. */}
      <Link
        href="/global/graph"
        className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-white/[0.01] px-4 py-3 hover:border-white/20 hover:from-white/[0.07] transition-colors"
      >
        <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80 group-hover:text-white transition-colors">
          <Network className="w-5 h-5" strokeWidth={1.5} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-white text-sm font-semibold">
            Affinity graph
          </span>
          <span className="block text-white/45 text-xs mt-0.5">
            Which aesthetics share a taste? Explore the graph built from every
            shared top 5.
          </span>
        </span>
        <ArrowUpRight
          className="flex-shrink-0 w-4 h-4 text-white/40 group-hover:text-white transition-colors"
          strokeWidth={1.75}
        />
      </Link>

      {decades.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedDecade(ALL_DECADES)}
            className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
              selectedDecade === ALL_DECADES
                ? "border-white/40 bg-white/15 text-white"
                : "border-white/10 bg-white/5 text-white/45 hover:text-white/75"
            }`}
          >
            All
          </button>
          {decades.map((decade) => (
            <button
              key={decade}
              type="button"
              onClick={() => setSelectedDecade(decade)}
              className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
                selectedDecade === decade
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/45 hover:text-white/75"
              }`}
            >
              {decade}
            </button>
          ))}
        </div>
      )}

      {/* Top 3 podium — crowns float above each card */}
      {filteredVisible.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 mt-2 items-end">
          {[filteredVisible[1], filteredVisible[0], filteredVisible[2]].map((row, i) => {
            // Display order: 2nd · 1st · 3rd to evoke a podium silhouette.
            const realPos = (row === filteredVisible[0]
              ? 1
              : row === filteredVisible[1]
                ? 2
                : 3) as 1 | 2 | 3;
            const cardHeights = ["h-40 sm:h-44", "h-52 sm:h-56", "h-36 sm:h-40"];
            const crownSize: Record<1 | 2 | 3, "sm" | "md" | "lg"> = {
              1: "lg",
              2: "md",
              3: "sm",
            };
            const theme: Record<
              1 | 2 | 3,
              { cardBorder: string; shadow: string }
            > = {
              1: {
                cardBorder: "border-amber-300/50",
                shadow: "shadow-lg shadow-amber-400/15",
              },
              2: {
                cardBorder: "border-zinc-300/40",
                shadow: "shadow-lg shadow-zinc-200/10",
              },
              3: {
                cardBorder: "border-orange-500/40",
                shadow: "shadow-lg shadow-orange-500/15",
              },
            };
            const t = theme[realPos];
            const places: Record<1 | 2 | 3, string> = {
              1: "1st",
              2: "2nd",
              3: "3rd",
            };
            return (
              <Link
                key={row.id}
                href={`/aesthetics/${row.slug}`}
                className="group flex flex-col items-center focus-visible:outline-none"
                title={`${places[realPos]} place — ${row.name}`}
              >
                {/* Crown grows out of the card — its band and festoon dip
                    into the top of the image so the ornament reads as
                    rooted in the picture instead of hovering above it. */}
                <div className="relative z-10 w-full mb-[-10px] sm:mb-[-14px] drop-shadow-[0_5px_10px_rgba(0,0,0,0.4)] transition-transform duration-200 group-hover:-translate-y-1 flex justify-center">
                  <Crown rank={realPos} size={crownSize[realPos]} className="w-full" />
                </div>

                {/* Card */}
                <div
                  className={`relative w-full ${cardHeights[i]} rounded-xl overflow-hidden border ${t.cardBorder} ${t.shadow} bg-neutral-900 transition-transform duration-200 group-hover:-translate-y-0.5`}
                >
                  {row.cover_image_url && (
                    <Image
                      src={row.cover_image_url}
                      alt={row.name}
                      fill
                      sizes="(max-width: 768px) 33vw, 200px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      unoptimized
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <ArrowUpRight
                    className="absolute top-2 right-2 w-4 h-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    strokeWidth={1.75}
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p
                      className="font-display text-white text-base leading-tight tracking-tight line-clamp-2 group-hover:underline decoration-white/40 underline-offset-4"
                      style={{ fontVariationSettings: '"opsz" 96' }}
                    >
                      {row.name}
                    </p>
                    <p className="text-white/60 text-[11px] font-mono mt-0.5">
                      {Math.round(row.rawWinRate * 100)}% · {row.wins}W /{" "}
                      {row.losses}L
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {filteredVisible.length > 0 ? (
        <ol className="flex flex-col">
          {filteredVisible.map((row, i) => (
            <li key={row.id}>
              <Link
                href={`/aesthetics/${row.slug}`}
                className="group flex items-center gap-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
              >
                <span className="w-8 text-right flex-shrink-0 font-mono tabular-nums text-white/30 text-sm group-hover:text-white/60 transition-colors">
                  {i + 1}
                </span>
                <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 border border-white/10">
                  {row.cover_image_url && (
                    <Image
                      src={row.cover_image_url}
                      alt={row.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-display text-white text-base truncate group-hover:underline decoration-white/30 underline-offset-4"
                    style={{ fontVariationSettings: '"opsz" 96' }}
                  >
                    {row.name}
                  </p>
                  <p className="text-white/30 text-xs font-mono mt-0.5">
                    {formatYears(row) ?? "—"}
                  </p>
                </div>
                {/* Win rate bar */}
                <div className="hidden sm:flex flex-col items-end flex-shrink-0 w-32 gap-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono tabular-nums text-white text-sm">
                      {Math.round(row.rawWinRate * 100)}%
                    </span>
                    <span className="text-white/30 text-[10px] font-mono">
                      {row.wins}W/{row.losses}L
                    </span>
                  </div>
                  <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/70 rounded-full transition-all"
                      style={{ width: `${row.rawWinRate * 100}%` }}
                    />
                  </div>
                </div>
                <span className="sm:hidden flex-shrink-0 font-mono tabular-nums text-white text-sm">
                  {Math.round(row.rawWinRate * 100)}%
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/40 text-sm">
          No voted aesthetics in this decade yet.
        </div>
      )}

      {dormant.length > 0 && (
        <details className="group mt-4">
          <summary className="flex items-center gap-2 cursor-pointer text-white/40 hover:text-white/60 text-xs uppercase tracking-[0.18em] list-none">
            <span>{dormant.length} aesthetics not yet voted on</span>
            <span className="text-white/20 group-open:rotate-90 transition-transform inline-block">
              ›
            </span>
          </summary>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
            {dormant.map((row) => (
              <li
                key={row.id}
                className="text-white/30 text-xs font-mono"
                title={row.name}
              >
                {row.name}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
