import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
  const gallery = [
    ...(aesthetic.cover_image_url ? [aesthetic.cover_image_url] : []),
    ...((aesthetic.gallery_images as string[] | null) ?? []),
  ];

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <Link
        href="/ranking"
        className="inline-flex items-center gap-2 text-white/35 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        Back to ranking
      </Link>

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

            <a
              href={`https://cari.institute/aesthetics/${aesthetic.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/10 px-3 py-1.5 text-white/40 hover:text-white hover:border-white/25 text-xs uppercase tracking-[0.16em] transition-colors"
            >
              Source
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </a>
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

      {gallery.length > 1 && (
        <section className="mt-8">
          <h2 className="text-white/45 text-xs uppercase tracking-[0.2em] mb-3">
            Gallery
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {gallery.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-white/5"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 280px"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
