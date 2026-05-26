"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Info, X } from "lucide-react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_THRESHOLD,
  METRIC_RANGE,
  buildAffinity,
  getMetric,
  type AffinityEdge,
  type AffinityMetric,
} from "@/lib/affinity";
import { decadeOf } from "@/lib/years";
import type { Aesthetic } from "@/lib/supabase/types";

const PAGE_SIZE = 1000;
type LayoutMode = "circular" | "force";

interface PositionedNode extends SimulationNodeDatum {
  id: string;
  name: string;
  slug: string;
  cover_image_url: string | null;
  decade: string | null;
  count: number;
  radius: number;
  color: string;
  // After layout these are always defined; SimulationNodeDatum types them
  // as optional because d3-force populates them on the first tick.
  x: number;
  y: number;
}

interface PositionedLink extends SimulationLinkDatum<PositionedNode> {
  edge: AffinityEdge;
  /** Sim resolves these to PositionedNode references after the first tick. */
  source: PositionedNode | string;
  target: PositionedNode | string;
}

// Muted, dark-theme-friendly palette keyed by decade.
const DECADE_COLORS: Record<string, string> = {
  "1950s": "#7798d6",
  "1960s": "#4fb5a8",
  "1970s": "#d8a55c",
  "1980s": "#e07ba0",
  "1990s": "#a986d3",
  "2000s": "#5fb5d6",
  "2010s": "#9bc265",
  "2020s": "#e08877",
  Timeless: "#e6e0d4",
};

function decadeColor(d: string | null): string {
  return (d && DECADE_COLORS[d]) || "#cbd5e1";
}

const VIEWBOX = 720;
const RADIUS = 300;

export function AffinityGraphClient() {
  const [aesthetics, setAesthetics] = useState<Aesthetic[]>([]);
  const [topKLists, setTopKLists] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [metric, setMetric] = useState<AffinityMetric>("jaccard");
  const [threshold, setThreshold] = useState<number>(
    DEFAULT_THRESHOLD.jaccard
  );
  const [layout, setLayout] = useState<LayoutMode>("circular");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // When the metric changes, snap threshold to that metric's default so the
  // user doesn't end up with e.g. a 1.5 Jaccard threshold (no edges) after
  // switching from Lift.
  const setMetricSafe = useCallback((m: AffinityMetric) => {
    setMetric(m);
    setThreshold(DEFAULT_THRESHOLD[m]);
  }, []);

  // ─── Data load ────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      try {
        const [{ data: ae, error: aeErr }, sessions] = await Promise.all([
          supabase.from("aesthetics").select("*"),
          (async () => {
            // Page through sessions in case there's eventually a lot.
            const out: string[][] = [];
            let from = 0;
            while (true) {
              const { data, error } = await supabase
                .from("ranking_sessions")
                .select("top_k_ids")
                .not("top_k_ids", "is", null)
                .range(from, from + PAGE_SIZE - 1);
              if (error) throw error;
              if (!data || data.length === 0) break;
              for (const r of data) {
                if (r.top_k_ids && r.top_k_ids.length >= 2) {
                  out.push(r.top_k_ids);
                }
              }
              if (data.length < PAGE_SIZE) break;
              from += PAGE_SIZE;
            }
            return out;
          })(),
        ]);
        if (aeErr) throw aeErr;
        if (cancelled) return;
        queueMicrotask(() => {
          setAesthetics((ae ?? []) as Aesthetic[]);
          setTopKLists(sessions);
          setLoading(false);
        });
      } catch (e) {
        if (cancelled) return;
        queueMicrotask(() => {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Affinity calculation ────────────────────────────────────────────
  const affinity = useMemo(
    () => buildAffinity(topKLists.map((ids) => ({ top_k_ids: ids }))),
    [topKLists]
  );

  // Lookup table once per aesthetics fetch.
  const aestheticById = useMemo(() => {
    const m = new Map<string, Aesthetic>();
    for (const a of aesthetics) m.set(a.id, a);
    return m;
  }, [aesthetics]);

  // ─── Filter edges & build node set at current threshold ──────────────
  const filteredEdges = useMemo(
    () =>
      affinity.edges
        .filter((e) => getMetric(e, metric) >= threshold)
        .sort((x, y) => getMetric(y, metric) - getMetric(x, metric)),
    [affinity.edges, metric, threshold]
  );

  const activeNodeIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of filteredEdges) {
      s.add(e.a);
      s.add(e.b);
    }
    return s;
  }, [filteredEdges]);

  // Build positioned nodes (no layout yet).
  const baseNodes = useMemo<PositionedNode[]>(() => {
    const nodes: PositionedNode[] = [];
    const maxCount = Math.max(1, ...affinity.counts.values());
    for (const id of activeNodeIds) {
      const a = aestheticById.get(id);
      if (!a) continue;
      const count = affinity.counts.get(id) ?? 0;
      const dec = decadeOf(a);
      // Node radius scaled by sqrt(popularity) so area ∝ popularity.
      const radius = 6 + 12 * Math.sqrt(count / maxCount);
      nodes.push({
        id,
        name: a.name,
        slug: a.slug,
        cover_image_url: a.cover_image_url,
        decade: dec,
        count,
        radius,
        color: decadeColor(dec),
        x: 0,
        y: 0,
      });
    }
    return nodes;
  }, [activeNodeIds, aestheticById, affinity.counts]);

  // ─── Layout ──────────────────────────────────────────────────────────
  const layoutNodes = useMemo<PositionedNode[]>(() => {
    if (baseNodes.length === 0) return [];

    if (layout === "circular") {
      // Sort by decade chronologically, then by name within a decade.
      // Aesthetics with an unknown decade go to the end.
      const sorted = [...baseNodes].sort((a, b) => {
        const da = a.decade ?? "~";
        const db = b.decade ?? "~";
        if (da !== db) return da.localeCompare(db);
        return a.name.localeCompare(b.name);
      });
      const n = sorted.length;
      return sorted.map((node, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return {
          ...node,
          x: Math.cos(angle) * RADIUS,
          y: Math.sin(angle) * RADIUS,
        };
      });
    }

    // Force layout. We clone the base nodes so d3-force can mutate their
    // x/y without poisoning the memoised value on re-render.
    const simNodes: PositionedNode[] = baseNodes.map((n) => ({ ...n }));
    const idToNode = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: PositionedLink[] = [];
    for (const e of filteredEdges) {
      const s = idToNode.get(e.a);
      const t = idToNode.get(e.b);
      if (!s || !t) continue;
      simLinks.push({ source: s, target: t, edge: e });
    }

    // Seed positions on a circle so the sim doesn't have to do as much
    // work to spread nodes out from origin.
    const seedN = simNodes.length;
    simNodes.forEach((node, i) => {
      const angle = (i / seedN) * 2 * Math.PI;
      node.x = Math.cos(angle) * RADIUS * 0.7;
      node.y = Math.sin(angle) * RADIUS * 0.7;
    });

    const sim = forceSimulation<PositionedNode>(simNodes)
      .force(
        "link",
        forceLink<PositionedNode, PositionedLink>(simLinks)
          .id((d) => d.id)
          // Stronger affinity → shorter link. Map metric value ∈
          // [threshold, max] to distance ∈ [40, 160].
          .distance((l) => {
            const v = getMetric(l.edge, metric);
            const max = metric === "jaccard" ? 1 : 6;
            const t = Math.min(1, Math.max(0, (v - threshold) / (max - threshold)));
            return 160 - 120 * t;
          })
          .strength((l) => {
            const v = getMetric(l.edge, metric);
            const max = metric === "jaccard" ? 1 : 6;
            return Math.min(1, Math.max(0.05, v / max));
          })
      )
      .force("charge", forceManyBody().strength(-180))
      .force("center", forceCenter(0, 0))
      .force(
        "collide",
        forceCollide<PositionedNode>().radius((d) => d.radius + 4)
      )
      .stop();

    // Run a fixed number of ticks synchronously. ~300 is enough to settle
    // for our node counts; we skip animation to keep React renders cheap.
    for (let i = 0; i < 300; i++) sim.tick();

    // Constrain to viewbox (some nodes can drift far). Rescale uniformly
    // so the widest extent fits within RADIUS + padding.
    let maxR = 0;
    for (const n of simNodes) {
      const r = Math.hypot(n.x ?? 0, n.y ?? 0);
      if (r > maxR) maxR = r;
    }
    const target = RADIUS * 0.95;
    if (maxR > target) {
      const k = target / maxR;
      for (const n of simNodes) {
        n.x = (n.x ?? 0) * k;
        n.y = (n.y ?? 0) * k;
      }
    }
    return simNodes;
  }, [baseNodes, layout, filteredEdges, metric, threshold]);

  // Link rendering data with positions resolved.
  const renderEdges = useMemo(() => {
    const idx = new Map(layoutNodes.map((n) => [n.id, n]));
    return filteredEdges
      .map((e) => {
        const s = idx.get(e.a);
        const t = idx.get(e.b);
        if (!s || !t) return null;
        const value = getMetric(e, metric);
        const max = metric === "jaccard" ? 1 : 6;
        const norm = Math.min(1, Math.max(0, (value - threshold) / (max - threshold)));
        return {
          a: e.a,
          b: e.b,
          x1: s.x,
          y1: s.y,
          x2: t.x,
          y2: t.y,
          width: 0.6 + 2.4 * norm,
          opacity: 0.18 + 0.55 * norm,
          value,
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [filteredEdges, layoutNodes, metric, threshold]);

  // Neighbours for hover/selection highlighting.
  const focus = selected ?? hovered;
  const focusNeighbours = useMemo(() => {
    if (!focus) return null;
    const n = new Set<string>([focus]);
    for (const e of filteredEdges) {
      if (e.a === focus) n.add(e.b);
      else if (e.b === focus) n.add(e.a);
    }
    return n;
  }, [focus, filteredEdges]);

  // Adjacency for the selection info panel.
  const selectedNeighbours = useMemo(() => {
    if (!selected) return [];
    const rows = filteredEdges
      .filter((e) => e.a === selected || e.b === selected)
      .map((e) => {
        const otherId = e.a === selected ? e.b : e.a;
        const a = aestheticById.get(otherId);
        return a
          ? {
              id: otherId,
              name: a.name,
              slug: a.slug,
              value: getMetric(e, metric),
              cooc: e.cooc,
            }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    rows.sort((x, y) => y.value - x.value);
    return rows;
  }, [selected, filteredEdges, metric, aestheticById]);

  const selectedAesthetic = selected ? aestheticById.get(selected) : null;
  const focusInfo = focus ? aestheticById.get(focus) : null;

  // Keep the selection / hover in sync with whether the node is still in
  // the active set after threshold or metric changes.
  useEffect(() => {
    if (selected && !activeNodeIds.has(selected)) setSelected(null);
    if (hovered && !activeNodeIds.has(hovered)) setHovered(null);
  }, [activeNodeIds, selected, hovered]);

  // Decade legend list (only decades that actually appear).
  const legendDecades = useMemo(() => {
    const s = new Set<string>();
    for (const n of layoutNodes) {
      if (n.decade) s.add(n.decade);
    }
    return Array.from(s).sort();
  }, [layoutNodes]);

  const range = METRIC_RANGE[metric];

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

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/global"
            className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 text-xs uppercase tracking-[0.2em] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            Global ranking
          </Link>
          <h1
            className="font-display text-white text-4xl tracking-tight leading-none"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80' }}
          >
            Affinity <em className="italic font-light">graph</em>
          </h1>
          <p className="text-white/40 text-sm mt-2 max-w-xl">
            Two aesthetics connect when they appear together in someone&rsquo;s
            top 5. Thicker lines = more shared taste.{" "}
            <span className="font-mono tabular-nums text-white/70">
              {affinity.totalSessions}
            </span>{" "}
            session{affinity.totalSessions === 1 ? "" : "s"} ·{" "}
            <span className="font-mono tabular-nums text-white/70">
              {filteredEdges.length}
            </span>{" "}
            of{" "}
            <span className="font-mono tabular-nums text-white/50">
              {affinity.edges.length}
            </span>{" "}
            ties shown
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="text-white/50 hover:text-white text-xs uppercase tracking-[0.2em] transition-colors inline-flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" strokeWidth={1.75} />
          {showLegend ? "Hide legend" : "Show legend"}
        </button>
      </div>

      {/* Controls */}
      <div className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <ControlGroup label="Metric">
          <SegButton
            active={metric === "jaccard"}
            onClick={() => setMetricSafe("jaccard")}
          >
            Jaccard
          </SegButton>
          <SegButton
            active={metric === "lift"}
            onClick={() => setMetricSafe("lift")}
          >
            Lift
          </SegButton>
        </ControlGroup>

        <ControlGroup label="Layout">
          <SegButton
            active={layout === "circular"}
            onClick={() => setLayout("circular")}
          >
            Circular
          </SegButton>
          <SegButton
            active={layout === "force"}
            onClick={() => setLayout("force")}
          >
            Force
          </SegButton>
        </ControlGroup>

        <ControlGroup
          label={
            <span className="flex items-center justify-between gap-2 w-full">
              <span>Threshold ({metric})</span>
              <span className="font-mono tabular-nums text-white/80 text-[11px]">
                {threshold.toFixed(metric === "jaccard" ? 2 : 1)}
              </span>
            </span>
          }
        >
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={range.step}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-white"
          />
        </ControlGroup>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60 flex flex-col gap-3">
          <p>
            <span className="text-white/80">Jaccard</span> measures shared
            taste: it&rsquo;s the share of users whose top 5 includes both
            aesthetics out of all users whose top 5 includes either. 0 = never
            together, 1 = always together.{" "}
            <span className="text-white/80">Lift</span> compares their actual
            co-occurrence against what you&rsquo;d expect by chance — values
            above 1 mean &ldquo;more often together than random&rdquo;.
          </p>
          {legendDecades.length > 0 && (
            <div>
              <p className="text-white/40 uppercase tracking-[0.18em] text-[10px] mb-2">
                Decade
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {legendDecades.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/70"
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: decadeColor(d) }}
                    />
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Graph + selection panel */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-950 to-neutral-900 overflow-hidden">
          {layoutNodes.length === 0 ? (
            <div className="aspect-square flex items-center justify-center text-white/40 text-sm text-center px-6">
              {affinity.totalSessions === 0 ? (
                <span>
                  No shared top 5s yet. Once people start saving rankings, the
                  graph will fill in.
                </span>
              ) : (
                <span>
                  No ties pass this threshold. Try lowering it with the slider
                  above.
                </span>
              )}
            </div>
          ) : (
            <svg
              viewBox={`-${VIEWBOX / 2} -${VIEWBOX / 2} ${VIEWBOX} ${VIEWBOX}`}
              className="block w-full h-auto"
              role="img"
              aria-label="Affinity graph of aesthetics"
              onClick={() => setSelected(null)}
            >
              {/* Edges first so nodes sit on top. */}
              <g>
                {renderEdges.map((e) => {
                  const dim =
                    focus && focusNeighbours
                      ? !(focusNeighbours.has(e.a) && focusNeighbours.has(e.b))
                      : false;
                  return (
                    <line
                      key={`${e.a}-${e.b}`}
                      x1={e.x1}
                      y1={e.y1}
                      x2={e.x2}
                      y2={e.y2}
                      stroke="white"
                      strokeWidth={e.width}
                      strokeLinecap="round"
                      opacity={dim ? 0.04 : e.opacity}
                      style={{ transition: "opacity 200ms" }}
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g>
                {layoutNodes.map((n) => {
                  const isFocus = focus === n.id;
                  const isNeighbour =
                    focusNeighbours && focusNeighbours.has(n.id);
                  const dim = focus ? !isNeighbour : false;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x},${n.y})`}
                      style={{
                        cursor: "pointer",
                        transition: "opacity 200ms",
                        opacity: dim ? 0.22 : 1,
                      }}
                      onMouseEnter={() => setHovered(n.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected((cur) => (cur === n.id ? null : n.id));
                      }}
                    >
                      <circle
                        r={n.radius + (isFocus ? 3 : 0)}
                        fill={n.color}
                        stroke="white"
                        strokeWidth={isFocus ? 1.6 : 0.6}
                        opacity={isFocus ? 1 : 0.85}
                      />
                      {(isFocus || layout === "circular") && (
                        // For circular: always show labels (radial-ish).
                        // For force: only on focus.
                        <text
                          textAnchor={
                            layout === "circular"
                              ? n.x > 0
                                ? "start"
                                : "end"
                              : "middle"
                          }
                          x={
                            layout === "circular"
                              ? n.x > 0
                                ? n.radius + 6
                                : -n.radius - 6
                              : 0
                          }
                          y={
                            layout === "circular"
                              ? 4
                              : -(n.radius + 8)
                          }
                          fontSize={isFocus ? 13 : 9}
                          fill="white"
                          opacity={isFocus ? 1 : 0.55}
                          style={{
                            fontFamily: "inherit",
                            pointerEvents: "none",
                            paintOrder: "stroke",
                            stroke: "rgba(0,0,0,0.6)",
                            strokeWidth: 2,
                          }}
                        >
                          {n.name}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}

          {/* Floating hover label (works for both layouts) */}
          {focusInfo && !selected && (
            <div className="pointer-events-none absolute left-3 top-3 px-2 py-1.5 rounded-md bg-black/70 backdrop-blur text-xs text-white/85 font-mono tracking-tight">
              {focusInfo.name}
            </div>
          )}
        </div>

        {/* Selection / instructions panel */}
        <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3 min-h-[200px]">
          {selectedAesthetic && selected ? (
            <>
              <div className="flex items-start gap-3">
                <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-800 border border-white/10">
                  {selectedAesthetic.cover_image_url && (
                    <Image
                      src={selectedAesthetic.cover_image_url}
                      alt={selectedAesthetic.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-display text-white text-lg leading-tight"
                    style={{ fontVariationSettings: '"opsz" 96' }}
                  >
                    {selectedAesthetic.name}
                  </p>
                  <p className="text-white/40 text-[11px] font-mono mt-0.5">
                    {decadeOf(selectedAesthetic) ?? "—"} · in{" "}
                    {affinity.counts.get(selected) ?? 0} top 5s
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-white/40 hover:text-white/80 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>

              <Link
                href={`/aesthetics/${selectedAesthetic.slug}`}
                className="inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Open page
                <ArrowUpRight className="w-4 h-4" strokeWidth={1.75} />
              </Link>

              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-white/40 uppercase tracking-[0.18em] text-[10px]">
                  Closest ties ({selectedNeighbours.length})
                </p>
                {selectedNeighbours.length === 0 ? (
                  <p className="text-white/40 text-xs">
                    No ties above the current threshold.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-0.5 max-h-[260px] overflow-y-auto pr-1">
                    {selectedNeighbours.slice(0, 12).map((nb) => (
                      <li key={nb.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(nb.id)}
                          className="w-full flex items-center justify-between gap-2 text-left py-1 px-1.5 rounded-md hover:bg-white/5 transition-colors"
                        >
                          <span className="text-white/85 text-sm truncate">
                            {nb.name}
                          </span>
                          <span className="font-mono tabular-nums text-white/50 text-[11px] flex-shrink-0">
                            {metric === "jaccard"
                              ? nb.value.toFixed(2)
                              : `×${nb.value.toFixed(1)}`}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-white/60 text-sm leading-relaxed">
                <span className="text-white">Tap a node</span> to see its
                closest matches and open its page.
              </p>
              <ul className="text-white/40 text-xs leading-relaxed flex flex-col gap-1.5 mt-1">
                <li>
                  <span className="text-white/70">Node size</span> — how often
                  the aesthetic appears in someone&rsquo;s top 5.
                </li>
                <li>
                  <span className="text-white/70">Node colour</span> — its
                  decade.
                </li>
                <li>
                  <span className="text-white/70">Line thickness</span> — the
                  current metric value.
                </li>
              </ul>
              <p className="text-white/30 text-[11px] mt-auto leading-relaxed">
                Only ties with at least 2 shared sessions are shown to filter
                out one-off coincidences.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-white/40 uppercase tracking-[0.18em] text-[10px] flex">
        {label}
      </span>
      <div className="flex gap-1.5 items-center">{children}</div>
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-mono transition-colors ${
        active
          ? "border-white/40 bg-white/15 text-white"
          : "border-white/10 bg-white/5 text-white/45 hover:text-white/75"
      }`}
    >
      {children}
    </button>
  );
}
