import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const alt = "Aesthetics ranking — top 5 and taste profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface SessionRow {
  id: string;
  is_public: boolean;
  display_name: string | null;
  top_k_ids: string[] | null;
}
interface CompRow {
  winner_id: string;
  loser_id: string;
}
interface AestheticTile {
  id: string;
  name: string;
  cover_image_url: string | null;
}

const PAGE_SIZE = 1000;
const NICHE_LABELS = [
  { max: 20, label: "Very mainstream" },
  { max: 40, label: "Mainstream" },
  { max: 60, label: "Mixed taste" },
  { max: 80, label: "Niche" },
  { max: 101, label: "Very niche" },
];

function labelFor(score: number) {
  return NICHE_LABELS.find((l) => score < l.max)?.label ?? "Very niche";
}

function fallback(message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fff",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontSize: 64,
        }}
      >
        {message}
      </div>
    ),
    size
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Session
  const { data: session } = await supabase
    .from("ranking_sessions")
    .select("id, is_public, display_name, top_k_ids")
    .eq("share_slug", slug)
    .single();

  const sessionRow = session as SessionRow | null;
  if (!sessionRow || !sessionRow.is_public) {
    return fallback("Aesthetics Ranking");
  }

  // 2. This session's comparisons → top 5
  //    Prefer the algorithm's authoritative top (stored on Share); fall
  //    back to wins-based reconstruction for legacy share links.
  const { data: compsData } = await supabase
    .from("comparisons")
    .select("winner_id, loser_id")
    .eq("session_id", sessionRow.id);
  const comps = (compsData ?? []) as CompRow[];
  if (comps.length === 0) return fallback("Aesthetics Ranking");

  let topIds: string[];
  if (sessionRow.top_k_ids && sessionRow.top_k_ids.length > 0) {
    topIds = sessionRow.top_k_ids.slice(0, 5);
  } else {
    const wins = new Map<string, number>();
    const seen = new Set<string>();
    for (const { winner_id, loser_id } of comps) {
      wins.set(winner_id, (wins.get(winner_id) ?? 0) + 1);
      seen.add(winner_id);
      seen.add(loser_id);
    }
    topIds = [...seen]
      .sort((a, b) => (wins.get(b) ?? 0) - (wins.get(a) ?? 0))
      .slice(0, 5);
  }

  // 3. Aesthetic details for top 5
  const { data: aestheticsData } = await supabase
    .from("aesthetics")
    .select("id, name, cover_image_url")
    .in("id", topIds);
  const aestheticsMap = new Map<string, AestheticTile>(
    ((aestheticsData ?? []) as AestheticTile[]).map((a) => [a.id, a])
  );
  const top5 = topIds
    .map((id) => aestheticsMap.get(id))
    .filter((x): x is AestheticTile => Boolean(x));

  // 4. Niche score — mirrors useNicheScore but server-side.
  let nicheScore = 50;
  let nicheLabel = "Mixed taste";
  if (topIds.length > 0) {
    const globalWins = new Map<string, number>();
    let from = 0;
    while (true) {
      const { data: rows } = await supabase
        .from("comparisons")
        .select("winner_id, session_id")
        .range(from, from + PAGE_SIZE - 1);
      if (!rows || rows.length === 0) break;
      for (const r of rows as Array<{ winner_id: string; session_id: string }>) {
        if (r.session_id === sessionRow.id) continue;
        globalWins.set(r.winner_id, (globalWins.get(r.winner_id) ?? 0) + 1);
      }
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    if (globalWins.size > 0) {
      const ranked = [...globalWins.keys()].sort(
        (a, b) => (globalWins.get(b) ?? 0) - (globalWins.get(a) ?? 0)
      );
      const total = ranked.length;
      const percentiles = topIds.map((id) => {
        const rank = ranked.indexOf(id);
        return rank === -1 ? 1 : rank / Math.max(total - 1, 1);
      });
      const avg =
        percentiles.reduce((acc, p) => acc + p, 0) / percentiles.length;
      nicheScore = Math.round(avg * 100);
      nicheLabel = labelFor(nicheScore);
    }
  }

  const displayName = sessionRow.display_name?.trim();
  const title = displayName
    ? `${displayName}'s top 5 aesthetics`
    : "Top 5 aesthetics";
  const deviation = nicheScore - 50;
  const sign = deviation > 0 ? "+" : deviation < 0 ? "−" : "";
  const magnitude = Math.abs(deviation);

  // Rank palette for ribbon badges
  const rankColors = [
    "#f0b53d", // gold
    "#cbd5e1", // silver
    "#dd824a", // bronze
    "rgba(255,255,255,0.5)",
    "rgba(255,255,255,0.4)",
  ];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: 56,
          background:
            "linear-gradient(180deg, #0a0a0a 0%, #15131c 60%, #0a0a0a 100%)",
          color: "#fff",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 20,
              letterSpacing: 8,
              textTransform: "uppercase",
            }}
          >
            Æsthetics ranking
          </span>
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              fontStyle: "italic",
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            {title}
          </span>
        </div>

        {/* Top 5 tiles */}
        <div
          style={{
            display: "flex",
            marginTop: 36,
            gap: 16,
          }}
        >
          {top5.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 200,
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 200,
                  height: 200,
                  borderRadius: 14,
                  overflow: "hidden",
                  position: "relative",
                  background: "#1a1a1a",
                  border:
                    i === 0
                      ? "2px solid #f0b53d"
                      : i === 1
                        ? "2px solid #cbd5e1"
                        : i === 2
                          ? "2px solid #dd824a"
                          : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {a.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.cover_image_url}
                    alt=""
                    width={200}
                    height={200}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : null}
                <div
                  style={{
                    display: "flex",
                    position: "absolute",
                    top: 8,
                    left: 8,
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.7)",
                    border: `1px solid ${rankColors[i]}`,
                    color: rankColors[i],
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
              </div>
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: "rgba(255,255,255,0.92)",
                  fontFamily:
                    "Georgia, 'Times New Roman', serif",
                  // Truncate visually if name overflows tile width
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 200,
                }}
              >
                {a.name}
              </span>
            </div>
          ))}
        </div>

        {/* Niche bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 16,
                letterSpacing: 6,
                textTransform: "uppercase",
              }}
            >
              Taste profile
            </span>
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 30,
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {sign}
              {magnitude}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <span
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Mainstream
            </span>
            <div
              style={{
                display: "flex",
                flex: 1,
                position: "relative",
                height: 4,
                background: "rgba(255,255,255,0.12)",
                borderRadius: 999,
              }}
            >
              {/* Filled segment from center to marker */}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: 0,
                  height: 4,
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: 999,
                  left:
                    deviation < 0 ? `${nicheScore}%` : "50%",
                  right:
                    deviation > 0 ? `${100 - nicheScore}%` : "50%",
                }}
              />
              {/* Marker dot */}
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: -8,
                  left: `${nicheScore}%`,
                  marginLeft: -10,
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: "#fff",
                  border: "2px solid #0a0a0a",
                }}
              />
            </div>
            <span
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.55)",
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Niche
            </span>
          </div>

          <span
            style={{
              fontSize: 32,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.1,
            }}
          >
            {nicheLabel}
          </span>
        </div>
      </div>
    ),
    size
  );
}
