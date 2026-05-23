"use client";

interface CrownProps {
  rank: 1 | 2 | 3;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface Palette {
  crownTop: string;
  crownMid: string;
  crownBase: string;
  stroke: string;
  jewelTop: string;
  jewelMid: string;
  jewelBase: string;
  enamel: string;
  highlight: string;
  leafFill: string;
  leafStroke: string;
  pearl: string;
  text: string;
}

const PALETTE: Record<1 | 2 | 3, Palette> = {
  1: {
    crownTop: "#fff5cf",
    crownMid: "#e6ad35",
    crownBase: "#7a4c05",
    stroke: "#3f2700",
    jewelTop: "#fff9df",
    jewelMid: "#f0b53d",
    jewelBase: "#5a3600",
    enamel: "#2f1b00",
    highlight: "rgba(255, 255, 255, 0.55)",
    leafFill: "rgba(244, 197, 90, 0.22)",
    leafStroke: "#9a6707",
    pearl: "#fff5d2",
    text: "rgba(255, 247, 210, 0.96)",
  },
  2: {
    crownTop: "#ffffff",
    crownMid: "#bcc7d4",
    crownBase: "#4b5563",
    stroke: "#1f2937",
    jewelTop: "#ffffff",
    jewelMid: "#cbd5e1",
    jewelBase: "#334155",
    enamel: "#111827",
    highlight: "rgba(255, 255, 255, 0.6)",
    leafFill: "rgba(203, 213, 225, 0.22)",
    leafStroke: "#64748b",
    pearl: "#ffffff",
    text: "rgba(248, 250, 252, 0.96)",
  },
  3: {
    crownTop: "#ffe1c2",
    crownMid: "#cf6f35",
    crownBase: "#64210d",
    stroke: "#371003",
    jewelTop: "#fff0df",
    jewelMid: "#dd824a",
    jewelBase: "#5a1c0a",
    enamel: "#1f0801",
    highlight: "rgba(255, 255, 255, 0.45)",
    leafFill: "rgba(217, 115, 57, 0.22)",
    leafStroke: "#7c2d12",
    pearl: "#ffe8d3",
    text: "rgba(255, 232, 210, 0.96)",
  },
};

const SIZES: Record<
  "sm" | "md" | "lg",
  { w: number; h: number; fontSize: number }
> = {
  sm: { w: 100, h: 62, fontSize: 13 },
  md: { w: 136, h: 84, fontSize: 15 },
  lg: { w: 180, h: 112, fontSize: 18 },
};

/**
 * Recognizable crowns with Art Nouveau / Rococo decoration. The silhouette
 * stays a real crown (band + points + jewels) but it is extended sideways
 * by curling scrolls, leafy fronds, and (for first place) a pearl festoon
 * — these are what visually anchor the crown into the full width of the
 * card image below it. Higher rank = wider, taller, more ornament.
 *
 * Shared 160×100 viewbox so the same Band helper works for all ranks:
 *   y 10–68  crown points & jewels & side scrolls
 *   y 68–88  enamel band with rank numeral
 *   y 88–98  festoon / pearl drops (rank 1 only goes this deep)
 */
export function Crown({ rank, size = "md", className }: CrownProps) {
  const p = PALETTE[rank];
  const dims = SIZES[size];
  const uid = `crown-${rank}-${size}`;

  return (
    <svg
      viewBox="0 0 160 100"
      width={dims.w}
      height={dims.h}
      className={className}
      style={{ maxWidth: "100%", height: "auto" }}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Rank ${rank}`}
    >
      <defs>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.crownTop} />
          <stop offset="52%" stopColor={p.crownMid} />
          <stop offset="100%" stopColor={p.crownBase} />
        </linearGradient>
        <radialGradient id={`${uid}-jewel`} cx="0.35" cy="0.32" r="0.78">
          <stop offset="0%" stopColor={p.jewelTop} />
          <stop offset="58%" stopColor={p.jewelMid} />
          <stop offset="100%" stopColor={p.jewelBase} />
        </radialGradient>
        <radialGradient id={`${uid}-pearl`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor={p.pearl} />
          <stop offset="100%" stopColor={p.crownBase} />
        </radialGradient>
      </defs>

      {rank === 1 && <GoldCrown uid={uid} p={p} fontSize={dims.fontSize} />}
      {rank === 2 && <SilverCrown uid={uid} p={p} fontSize={dims.fontSize} />}
      {rank === 3 && <BronzeCrown uid={uid} p={p} fontSize={dims.fontSize} />}
    </svg>
  );
}

/* -------------------------------------------------------------------- */
/*  Shared helpers                                                      */
/* -------------------------------------------------------------------- */

function Band({
  uid,
  p,
  rank,
  fontSize,
  y = 70,
  height = 18,
}: {
  uid: string;
  p: Palette;
  rank: 1 | 2 | 3;
  fontSize: number;
  y?: number;
  height?: number;
}) {
  const roman: Record<1 | 2 | 3, string> = {
    1: "I",
    2: "II",
    3: "III",
  };

  return (
    <>
      {/* Slim side shoulders: enough structure to feel like a crown base,
          while the numeral sits separately in the central arch. */}
      <path
        d={`M 31 ${y + height - 4} C 42 ${y + height - 7} 51 ${
          y + height - 8
        } 58 ${y + height - 7}
           M 102 ${y + height - 7} C 109 ${y + height - 8} 118 ${
             y + height - 7
           } 129 ${y + height - 4}`}
        fill="none"
        stroke={`url(#${uid}-metal)`}
        strokeWidth="1.45"
        strokeLinecap="round"
      />

      {/* Horseshoe-like enamel cartouche for the Roman numeral. */}
      <path
        d={`M 55 ${y + height - 3}
           C 55 ${y + 6} 64 ${y + 1} 80 ${y + 1}
           C 96 ${y + 1} 105 ${y + 6} 105 ${y + height - 3}
           Q 80 ${y + height + 4} 55 ${y + height - 3}
           Z`}
        fill={p.enamel}
        stroke={`url(#${uid}-metal)`}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d={`M 60 ${y + height - 5}
           C 63 ${y + 7} 68 ${y + 4} 80 ${y + 4}
           C 92 ${y + 4} 97 ${y + 7} 100 ${y + height - 5}`}
        fill="none"
        stroke={p.highlight}
        strokeWidth="0.65"
        strokeLinecap="round"
        opacity="0.85"
      />
      <text
        x="80"
        y={y + height - 4.8}
        textAnchor="middle"
        fontWeight="600"
        fontSize={fontSize * 0.86}
        fill={p.text}
        fontFamily="Georgia, 'Times New Roman', ui-serif, serif"
        letterSpacing={rank === 1 ? "0.7" : "1.05"}
      >
        {roman[rank]}
      </text>
    </>
  );
}

function Jewel({
  uid,
  cx,
  cy,
  r,
  stroke,
}: {
  uid: string;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={`url(#${uid}-jewel)`}
      stroke={stroke}
      strokeWidth="0.55"
    />
  );
}

function Pearl({
  uid,
  cx,
  cy,
  r,
  stroke,
}: {
  uid: string;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={`url(#${uid}-pearl)`}
      stroke={stroke}
      strokeWidth="0.35"
      opacity="0.95"
    />
  );
}

/* -------------------------------------------------------------------- */
/*  Rank 1 — Gold                                                       */
/* -------------------------------------------------------------------- */
function GoldCrown({
  uid,
  p,
  fontSize,
}: {
  uid: string;
  p: Palette;
  fontSize: number;
}) {
  const metal = `url(#${uid}-metal)`;
  return (
    <>
      {/* Outer side flourishes — long rococo scrolls reaching outward.
          Each side has a big C-scroll, a smaller inner spiral, and a leafy
          frond curling away from the band. */}
      <g
        fill="none"
        stroke={`url(#${uid}-metal)`}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Left big C-scroll */}
        <path
          d="M 36 80 C 22 86 6 82 4 68 C 4 56 18 54 22 64 C 26 70 22 78 30 80"
          strokeWidth="1.3"
        />
        {/* Left inner spiral */}
        <path
          d="M 22 64 C 14 62 10 70 16 74 C 22 76 26 70 22 64"
          strokeWidth="0.85"
        />
        {/* Left tendril whip rising above */}
        <path
          d="M 14 56 C 10 48 16 38 24 36 C 30 36 32 42 30 46"
          strokeWidth="0.95"
        />
        {/* Right big C-scroll (mirror) */}
        <path
          d="M 124 80 C 138 86 154 82 156 68 C 156 56 142 54 138 64 C 134 70 138 78 130 80"
          strokeWidth="1.3"
        />
        <path
          d="M 138 64 C 146 62 150 70 144 74 C 138 76 134 70 138 64"
          strokeWidth="0.85"
        />
        <path
          d="M 146 56 C 150 48 144 38 136 36 C 130 36 128 42 130 46"
          strokeWidth="0.95"
        />
      </g>

      {/* Leafy buds on the scroll tendrils */}
      <g
        fill={p.leafFill}
        stroke={p.leafStroke}
        strokeWidth="0.55"
        strokeLinejoin="round"
      >
        <path d="M 30 46 Q 36 42 38 36 Q 32 34 28 40 Z" />
        <path d="M 4 68 Q -2 64 0 56 Q 8 58 10 64 Z" />
        <path d="M 130 46 Q 124 42 122 36 Q 128 34 132 40 Z" />
        <path d="M 156 68 Q 162 64 160 56 Q 152 58 150 64 Z" />
      </g>

      {/* Main crown body — five-point silhouette, broad and tall */}
      <path
        d="M 36 76
           Q 38 60 38 50
           Q 38 42 44 42
           Q 50 42 53 50
           Q 55 56 58 60
           Q 60 50 64 38
           Q 70 22 80 12
           Q 90 22 96 38
           Q 100 50 102 60
           Q 105 56 107 50
           Q 110 42 116 42
           Q 122 42 122 50
           Q 122 60 124 76
           Z"
        fill={metal}
        stroke={p.stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {/* Inner filigree highlights — gentle whiplash curves inside the body */}
      <g
        fill="none"
        stroke={p.highlight}
        strokeWidth="0.75"
        strokeLinecap="round"
      >
        <path d="M 40 64 C 46 50 52 44 58 42" />
        <path d="M 120 64 C 114 50 108 44 102 42" />
        <path d="M 60 64 C 58 50 58 30 60 14 C 62 30 62 50 60 64" />
        <path d="M 100 64 C 102 50 102 30 100 14 C 98 30 98 50 100 64" />
        <path d="M 80 62 C 76 46 76 28 80 16 C 84 28 84 46 80 62" />
      </g>

      {/* Inner shadow tweaks */}
      <g
        fill="none"
        stroke="rgba(0, 0, 0, 0.22)"
        strokeWidth="0.65"
        strokeLinecap="round"
      >
        <path d="M 41 58 C 48 56 54 58 58 64" />
        <path d="M 119 58 C 112 56 106 58 102 64" />
      </g>

      {/* Jewels — central crown jewel plus four supporting cabochons */}
      <Jewel uid={uid} cx={80} cy={17} r={4.6} stroke={p.stroke} />
      <Jewel uid={uid} cx={60} cy={62} r={2.7} stroke={p.stroke} />
      <Jewel uid={uid} cx={100} cy={62} r={2.7} stroke={p.stroke} />
      <Jewel uid={uid} cx={44} cy={46} r={2.2} stroke={p.stroke} />
      <Jewel uid={uid} cx={116} cy={46} r={2.2} stroke={p.stroke} />

      {/* Band */}
      <Band uid={uid} p={p} rank={1} fontSize={fontSize} y={70} height={19} />

      {/* Tiny jewels on band corners */}
      <Jewel uid={uid} cx={34} cy={79.5} r={1.6} stroke={p.stroke} />
      <Jewel uid={uid} cx={126} cy={79.5} r={1.6} stroke={p.stroke} />

      {/* Pearl festoon hanging beneath the band */}
      <path
        d="M 36 90 Q 80 100 124 90"
        fill="none"
        stroke={p.crownBase}
        strokeWidth="0.45"
        opacity="0.7"
      />
      <Pearl uid={uid} cx={46} cy={92} r={1.4} stroke={p.stroke} />
      <Pearl uid={uid} cx={58} cy={94} r={1.6} stroke={p.stroke} />
      <Pearl uid={uid} cx={70} cy={95.5} r={1.8} stroke={p.stroke} />
      <Pearl uid={uid} cx={80} cy={96} r={2} stroke={p.stroke} />
      <Pearl uid={uid} cx={90} cy={95.5} r={1.8} stroke={p.stroke} />
      <Pearl uid={uid} cx={102} cy={94} r={1.6} stroke={p.stroke} />
      <Pearl uid={uid} cx={114} cy={92} r={1.4} stroke={p.stroke} />
    </>
  );
}

/* -------------------------------------------------------------------- */
/*  Rank 2 — Silver                                                     */
/* -------------------------------------------------------------------- */
function SilverCrown({
  uid,
  p,
  fontSize,
}: {
  uid: string;
  p: Palette;
  fontSize: number;
}) {
  const metal = `url(#${uid}-metal)`;
  return (
    <>
      {/* Side scrolls — medium, single sweep with one inner curl */}
      <g
        fill="none"
        stroke={metal}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M 36 80 C 24 84 12 78 14 66 C 14 58 26 58 28 66"
          strokeWidth="1.15"
        />
        <path
          d="M 22 56 C 18 50 24 44 30 44 C 34 44 36 48 34 52"
          strokeWidth="0.85"
        />
        <path
          d="M 124 80 C 136 84 148 78 146 66 C 146 58 134 58 132 66"
          strokeWidth="1.15"
        />
        <path
          d="M 138 56 C 142 50 136 44 130 44 C 126 44 124 48 126 52"
          strokeWidth="0.85"
        />
      </g>

      {/* Small leaves at scroll tendril tips */}
      <g
        fill={p.leafFill}
        stroke={p.leafStroke}
        strokeWidth="0.55"
        strokeLinejoin="round"
      >
        <path d="M 34 52 Q 38 48 38 42 Q 32 42 30 48 Z" />
        <path d="M 126 52 Q 122 48 122 42 Q 128 42 130 48 Z" />
      </g>

      {/* Main body — three-point silhouette, taller than bronze */}
      <path
        d="M 36 76
           Q 38 62 40 50
           Q 42 42 50 44
           Q 56 50 60 58
           Q 64 44 72 30
           Q 80 18 80 16
           Q 80 18 88 30
           Q 96 44 100 58
           Q 104 50 110 44
           Q 118 42 120 50
           Q 122 62 124 76
           Z"
        fill={metal}
        stroke={p.stroke}
        strokeWidth="1.05"
        strokeLinejoin="round"
      />

      {/* Inner highlights */}
      <g
        fill="none"
        stroke={p.highlight}
        strokeWidth="0.7"
        strokeLinecap="round"
      >
        <path d="M 40 64 C 48 52 54 46 60 44" />
        <path d="M 120 64 C 112 52 106 46 100 44" />
        <path d="M 80 60 C 76 46 76 28 80 18 C 84 28 84 46 80 60" />
      </g>

      <Jewel uid={uid} cx={80} cy={22} r={3.8} stroke={p.stroke} />
      <Jewel uid={uid} cx={60} cy={58} r={2.4} stroke={p.stroke} />
      <Jewel uid={uid} cx={100} cy={58} r={2.4} stroke={p.stroke} />
      <Jewel uid={uid} cx={14} cy={64} r={1.8} stroke={p.stroke} />
      <Jewel uid={uid} cx={146} cy={64} r={1.8} stroke={p.stroke} />

      <Band uid={uid} p={p} rank={2} fontSize={fontSize} y={71} height={18} />

      {/* Three small pearl drops hanging from the band (no swag) */}
      <Pearl uid={uid} cx={50} cy={93} r={1.4} stroke={p.stroke} />
      <Pearl uid={uid} cx={80} cy={94} r={1.7} stroke={p.stroke} />
      <Pearl uid={uid} cx={110} cy={93} r={1.4} stroke={p.stroke} />
    </>
  );
}

/* -------------------------------------------------------------------- */
/*  Rank 3 — Bronze                                                     */
/* -------------------------------------------------------------------- */
function BronzeCrown({
  uid,
  p,
  fontSize,
}: {
  uid: string;
  p: Palette;
  fontSize: number;
}) {
  const metal = `url(#${uid}-metal)`;
  return (
    <>
      {/* A simple curl on each side — just the suggestion of ornament */}
      <g fill="none" stroke={metal} strokeLinecap="round">
        <path
          d="M 40 80 C 30 82 22 76 26 70 C 30 66 34 70 34 74"
          strokeWidth="1"
        />
        <path
          d="M 120 80 C 130 82 138 76 134 70 C 130 66 126 70 126 74"
          strokeWidth="1"
        />
      </g>

      {/* Main body — three-point, more compact and lower than silver */}
      <path
        d="M 42 76
           Q 44 64 46 54
           Q 50 50 56 54
           Q 60 60 64 64
           Q 68 50 74 40
           Q 80 30 80 28
           Q 80 30 86 40
           Q 92 50 96 64
           Q 100 60 104 54
           Q 110 50 114 54
           Q 116 64 118 76
           Z"
        fill={metal}
        stroke={p.stroke}
        strokeWidth="1"
        strokeLinejoin="round"
      />

      <g
        fill="none"
        stroke={p.highlight}
        strokeWidth="0.65"
        strokeLinecap="round"
      >
        <path d="M 46 64 C 52 56 58 50 64 48" />
        <path d="M 114 64 C 108 56 102 50 96 48" />
      </g>

      <Jewel uid={uid} cx={80} cy={33} r={3.2} stroke={p.stroke} />

      <Band uid={uid} p={p} rank={3} fontSize={fontSize} y={72} height={17} />
    </>
  );
}
