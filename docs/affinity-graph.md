# Affinity graph (`/global/graph`)

Snapshot of the feature, the design decisions behind it, and follow-up ideas
that were intentionally deferred. Written 2026-05-26 right after the feature
landed (commits `1d70378`, `12dea1d`, `bff0a1b`).

## What it does

Renders a co-occurrence graph over the 90 CARI aesthetics. Two nodes are
connected when they tend to appear together in the same user's top 5.

Lives in:

- `src/lib/affinity.ts` — pure aggregation + metric helpers.
- `src/app/global/graph/page.tsx` — server entry, metadata only.
- `src/app/global/graph/AffinityGraphClient.tsx` — data load, layout, SVG.
- CTA card to the graph is on `/global` (`GlobalRankingClient.tsx`).

## Data sources

Two kinds of session inputs feed `buildAffinity`:

1. **Confirmed.** `ranking_sessions.top_k_ids` — set when the user reaches
   the ranking screen. The authoritative signal.
2. **Derived.** Sessions whose `top_k_ids` is `NULL` but which have at
   least `minUniqueWinners` (default 5) unique winners in `comparisons`.
   `buildAffinityInputs` infers a proxy top-K by sorting candidates by
   Beta(1,1)-smoothed win-rate `(wins + 1) / (wins + losses + 2)`, with
   tie-breaks on win count then appearances.

This is conservative: we never overwrite a confirmed top-K, only fall back
when one is missing. The UI prints `N sessions (X final + Y derived)` so
the source split is visible.

Background: when first launched the graph used only the 13 confirmed
sessions out of 86 total — most sessions are abandoned mid-comparison. Of
the 73 orphans, 38 had actual votes and 34 had ≥5 unique winners, so
deriving roughly triples the affinity sample size.

## Metrics

For each unordered pair `(a, b)`:

- `cooc(a,b)` — raw number of sessions where both appear in top-K.
- `count(a)` — number of sessions where `a` appears in top-K.
- `jaccard = cooc / (count(a) + count(b) - cooc)` — bounded 0–1.
- `lift = (cooc · N) / (count(a) · count(b))` — 1 = independent.

Both metrics are ratios, hence **scale-invariant**: thresholds don't need
to move as session count grows. Slider defaults: Jaccard 0.20, Lift 1.5.
Snapping to default on metric switch is in `setMetricSafe` so the user
never lands on an empty graph.

## Adaptive noise floor

`adaptiveMinCooc(N) = max(2, ceil(N / 25))` (in `src/lib/affinity.ts`).

Why it has to scale: with N sessions each picking K=5 aesthetics, the
expected count per random pair grows linearly with N. A fixed `cooc ≥ 2`
floor that drops singletons at 13 sessions will pass essentially every
popular pair at 1000. Jaccard/Lift wouldn't notice (they're ratios), but
the raw `cooc` floor that strips one-off coincidences absolutely does.

The applied value is returned from `buildAffinity` as `minCoocApplied`
and surfaced as `noise floor ≥N` in the page header.

## Layout

Two modes, selectable from the UI:

- **Circular.** Nodes evenly placed around a circle, sorted by `decadeOf`
  then by name. Always shows labels. Zero deps, deterministic, easy to
  screenshot.
- **Force.** `d3-force` simulation: link force whose distance/strength is
  derived from the metric value, charge for spread, collide to avoid
  overlap, centre force. Runs 300 ticks synchronously then rescales to fit
  the viewbox. Labels only on the focused node to keep it readable.

Node size ∝ √(count) so area scales with popularity. Node colour is
`DECADE_COLORS[decadeOf(...)]` — same palette as elsewhere on the site
(the colour list is local to the graph file).

## Interaction

- Hover dims everything except the focused node and its neighbours.
- Click selects: opens a side panel with the cover, link to the detail
  page, and a sorted list of strongest ties to jump between nodes.
- Background click clears selection.
- Hover/selection auto-clears when threshold changes drop the node.

## Related: decade filter on `/global`

While building this we also reworked the decade filter on the global
ranking page:

- `src/lib/years.ts` now exports `decadesOf(a)` which floors both
  `start_year` and `end_year` to their decades and emits every decade in
  the inclusive range, treating `end_year === "Current"` as the current
  decade.
- `decadeOf` (single primary decade) is kept for the graph where each
  node needs exactly one colour.
- `GlobalRankingClient` filters with `decadesOf` so an aesthetic appears
  under every decade it lived through, and "2020s" finally shows up (CARI
  doesn't label any `start_year` in the 2020s, but plenty of items are
  `end_year = "Current"`).

## Future work

Not done, in rough priority order:

- **Backfill `top_k_ids` for old sessions.** The proxy top-K is computed
  on the fly each page load. If we run the proxy as a one-time job and
  persist it (perhaps on a separate column like `derived_top_k_ids` so
  the authoritative one stays clean), the share pages could also benefit
  and the graph would stop re-deriving on every visit.
- **Significance-based edge filter.** Right now we use a raw `cooc`
  floor. Could compute a one-sided p-value under the null hypothesis of
  independent picks (`cooc ~ Poisson(count_a · count_b / N)`) and filter
  by p instead — more principled than the floor + threshold combo, and
  inherently scale-aware. Would need an option in the metric toggle.
- **MDS / t-SNE 2D embedding.** Layout that *literally* places similar
  aesthetics close. We'd build a `1 - jaccard` distance matrix, run
  classical MDS, place nodes at the resulting coordinates. ~90 nodes is
  cheap, no extra deps if we write MDS by hand. Could replace force as
  the "show clusters" layout.
- **Animated force layout.** Today the force simulation runs ticks
  synchronously and shows the final state. Animating the settle would
  be eye-candy; the cost is per-frame React renders, so we'd switch to
  an imperative SVG update via refs.
- **Edge tooltips.** Hovering an edge should show
  `cooc / |union| · pair name` so power users can read off the values.
- **Mobile pass.** The selection panel collapses below the graph on
  small screens; should test on an actual phone. Also force layout
  should probably halve the tick count on slow devices.
- **Co-occurrence in comparisons (looser signal).** The current
  derived-top-K is the conservative interpretation. A looser one is
  "two aesthetics co-occur when one user picked them both as winners
  against different opponents" — far more data, much noisier signal.
  Could be an alternate "explore" mode.
- **Persist user-chosen graph state in the URL.** `?metric=lift&t=2.0`
  etc., so screenshots are reproducible. Cheap, currently missing.
- **Anti-affinity view.** Same calculation, but show pairs with
  unusually *low* lift (< 0.5 with sufficient `cooc`). Reveals what
  tastes are mutually exclusive.

## Open questions

- The proxy top-K assumes guarded insertion would have surfaced
  high-win-rate items as the top-K. That's approximately true (the
  algorithm does insertion-sort the candidates) but not exact — the
  algorithm's actual top-K depends on interaction order. If we want
  exactness we'd need to replay each session through the algorithm.
- Should "Timeless" aesthetics get their own colour cluster on the
  graph, or be left as the neutral fallback colour? Currently fallback.
