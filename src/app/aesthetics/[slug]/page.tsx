import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { normalizeGallery } from "@/lib/gallery";
import { AestheticGallerySection } from "./AestheticGallerySection";
import { AestheticPageBackLink } from "./AestheticPageBackLink";
import type { Aesthetic } from "@/lib/supabase/types";

interface Props {
  params: Promise<{ slug: string }>;
}

function yearsFor(aesthetic: Aesthetic) {
  if (aesthetic.start_year) {
    return `${aesthetic.start_year}${
      aesthetic.end_year
        ? aesthetic.end_year === "Current"
          ? " - now"
          : ` - ${aesthetic.end_year}`
        : ""
    }`;
  }
  return aesthetic.decade;
}

async function getAesthetic(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("aesthetics")
    .select("*")
    .eq("slug", slug)
    .single();

  return data as Aesthetic | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const aesthetic = await getAesthetic(slug);

  if (!aesthetic) return { title: "Aesthetic not found" };

  const description =
    aesthetic.description?.replace(/\s+/g, " ").slice(0, 160) ??
    `Learn about ${aesthetic.name} in Æsthetics ranking.`;

  return {
    title: `${aesthetic.name} | Æsthetics ranking`,
    description,
    openGraph: {
      title: aesthetic.name,
      description,
      images: aesthetic.cover_image_url ? [aesthetic.cover_image_url] : [],
    },
  };
}

export default async function AestheticPage({ params }: Props) {
  const { slug } = await params;
  const aesthetic = await getAesthetic(slug);

  if (!aesthetic) notFound();

  const years = yearsFor(aesthetic);
  const gallery = normalizeGallery(aesthetic);
  const arenaChannelUrl = aesthetic.arena_slug
    ? `https://www.are.na/cari/${aesthetic.arena_slug}`
    : null;

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <AestheticPageBackLink />

      <article className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {aesthetic.cover_image_url && (
          <div className="relative w-full aspect-[16/10] sm:aspect-[21/9] bg-neutral-900">
            <Image
              src={aesthetic.cover_image_url}
              alt={aesthetic.name}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
          </div>
        )}

        <div className="p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1
                className="font-display text-white text-4xl sm:text-6xl font-semibold leading-none tracking-tight"
                style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80' }}
              >
                {aesthetic.name}
              </h1>
              {years && (
                <p className="mt-3 text-white/40 font-mono text-xs uppercase tracking-[0.18em]">
                  {years}
                </p>
              )}
            </div>

            {/* Source links — CARI is the catalog page, Are.na is the
                channel CARI itself curates from (so its blocks point to
                the original creators). Both go in a small pill cluster. */}
            <div className="flex flex-wrap gap-2 self-start">
              <a
                href={`https://cari.institute/aesthetics/${aesthetic.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-white/40 hover:text-white hover:border-white/25 text-xs uppercase tracking-[0.16em] transition-colors"
              >
                CARI
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </a>
              {arenaChannelUrl && (
                <a
                  href={arenaChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-white/40 hover:text-white hover:border-white/25 text-xs uppercase tracking-[0.16em] transition-colors"
                >
                  Are.na
                  <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                </a>
              )}
            </div>
          </div>

          {aesthetic.description ? (
            <p className="mt-6 text-white/72 text-base sm:text-lg leading-relaxed whitespace-pre-line">
              {aesthetic.description}
            </p>
          ) : (
            <p className="mt-6 text-white/35 text-sm italic">
              No description has been collected for this aesthetic yet.
            </p>
          )}
        </div>
      </article>

      <AestheticGallerySection
        gallery={gallery}
        alt={aesthetic.name}
        cariSlug={aesthetic.slug}
        arenaChannelUrl={arenaChannelUrl}
      />
    </div>
  );
}
