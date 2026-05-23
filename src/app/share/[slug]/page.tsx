import { createClient } from "@/lib/supabase/server";
import { RankingList } from "@/components/RankingList";
import Link from "next/link";
import type { RatedAesthetic } from "@/hooks/useSession";
import type { Aesthetic } from "@/lib/supabase/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

interface SessionRow {
  id: string;
  is_public: boolean;
  display_name: string | null;
  top_k_ids: string[] | null;
}
interface CompRow { winner_id: string; loser_id: string; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("ranking_sessions")
    .select("display_name, is_public")
    .eq("share_slug", slug)
    .single();

  const row = session as { display_name: string | null; is_public: boolean } | null;
  if (!row || !row.is_public) {
    return { title: "Aesthetics Ranking" };
  }

  const displayName = row.display_name?.trim();
  const title = displayName
    ? `${displayName}'s aesthetics ranking`
    : "Shared aesthetics ranking";
  const description = displayName
    ? `See ${displayName}'s top 5 aesthetics and how mainstream or niche their taste is.`
    : "See this shared top 5 aesthetics and the matching taste profile.";

  // Next.js auto-discovers ./opengraph-image.tsx and adds it to og:image,
  // so we only set title/description here.
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("ranking_sessions")
    .select("id, is_public, display_name, top_k_ids")
    .eq("share_slug", slug)
    .single();

  const sessionRow = session as SessionRow | null;
  if (!sessionRow || !sessionRow.is_public) notFound();

  const displayName = sessionRow.display_name?.trim() || null;

  const { data: compsData } = await supabase
    .from("comparisons")
    .select("winner_id, loser_id")
    .eq("session_id", sessionRow.id);

  const comps = (compsData ?? []) as CompRow[];
  if (comps.length === 0) notFound();

  // Preferred path: the algorithm's authoritative top-K, stored when the
  // user clicked Share. Falls back to wins-based reconstruction only for
  // legacy share links created before this column existed (the order is
  // approximate but better than 404).
  let sortedIds: string[];
  if (sessionRow.top_k_ids && sessionRow.top_k_ids.length > 0) {
    sortedIds = sessionRow.top_k_ids;
  } else {
    const wins = new Map<string, number>();
    const seen = new Set<string>();
    for (const { winner_id, loser_id } of comps) {
      wins.set(winner_id, (wins.get(winner_id) ?? 0) + 1);
      seen.add(winner_id);
      seen.add(loser_id);
    }
    sortedIds = [...seen].sort(
      (a, b) => (wins.get(b) ?? 0) - (wins.get(a) ?? 0)
    );
  }

  const { data: aestheticsData } = await supabase
    .from("aesthetics")
    .select("*")
    .in("id", sortedIds);

  const aestheticsMap = new Map(
    ((aestheticsData ?? []) as Aesthetic[]).map((a) => [a.id, a])
  );

  const items: RatedAesthetic[] = sortedIds
    .map((id, i) => {
      const a = aestheticsMap.get(id);
      if (!a) return null;
      return { ...a, rank: i + 1 };
    })
    .filter((x): x is RatedAesthetic => x !== null);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">
            {displayName ? `${displayName}'s ranking` : "Aesthetics Ranking"}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {comps.length} comparison{comps.length !== 1 ? "s" : ""}
            {" · "}
            shared by{" "}
            <span className="text-white/60">{displayName ?? "someone"}</span>
          </p>
        </div>
        <Link
          href="/"
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
        >
          Make mine →
        </Link>
      </div>

      <RankingList items={items} />
    </div>
  );
}
