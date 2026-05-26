"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, ZoomIn } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useHorizontalWheel } from "@/hooks/useHorizontalWheel";
import { getSourceLabel, normalizeGallery } from "@/lib/gallery";
import { formatYears } from "@/lib/years";
import type { Aesthetic } from "@/lib/supabase/types";

interface Props {
  aesthetic: Aesthetic;
  side: "left" | "right";
}

export function AestheticCard({ aesthetic, side }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isLeft = side === "left";
  // `normalizeGallery` returns cover + gallery in one ordered list with
  // per-image attribution. Falls back to URL-only entries for rows that
  // haven't been re-enriched yet.
  const allImages = normalizeGallery(aesthetic);
  const galleryRef = useHorizontalWheel<HTMLDivElement>();

  useEffect(() => {
    setActiveIndex(0);
  }, [aesthetic.id]);

  const years = formatYears(aesthetic);

  const activeUrl = allImages[activeIndex]?.url;
  const activeImage = allImages[activeIndex];
  const sourceLabel = activeImage ? getSourceLabel(activeImage) : null;

  return (
    <>
      {/* The card is now display-only — choosing happens via the global
          action bar pinned at the bottom of the viewport. Tapping the
          image opens the zoom lightbox; gallery thumbs switch the active
          image. Border is colour-coded so users can match each card to
          its corresponding bottom-bar button at a glance. */}
      <div
        className={`relative flex flex-col w-full h-full rounded-2xl overflow-hidden border bg-neutral-900 transition-colors ${
          isLeft
            ? "border-indigo-500/15"
            : "border-rose-500/15"
        }`}
      >
        {/* Cover — tapping it opens the zoom lightbox. */}
        <button
          type="button"
          onClick={() => {
            if (allImages.length > 0) setLightboxIndex(activeIndex);
          }}
          aria-label="Zoom image"
          className="group/img relative w-full aspect-[3/2] bg-neutral-800 overflow-hidden flex-shrink-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {activeUrl ? (
            <Image
              key={activeUrl}
              src={activeUrl}
              alt={aesthetic.name}
              fill
              className="object-cover transition-transform duration-500 group-hover/img:scale-[1.03] animate-in fade-in duration-200"
              sizes="(max-width: 640px) 100vw, 50vw"
              unoptimized
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-sm">
              No image
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-150 pointer-events-none bg-black/20">
            <ZoomIn
              className="w-10 h-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              strokeWidth={1.4}
            />
          </div>
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/85 opacity-80 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity">
            <ZoomIn className="w-4 h-4" strokeWidth={1.75} />
          </span>

          {/* Source badge — always visible per CARI usage guidelines.
              A <span> is fine inside a <button>; the lightbox provides
              the clickable source link when the user zooms in. */}
          {activeUrl && (
            <span
              className={`absolute top-2 left-2 inline-flex items-center max-w-[80%] px-2 py-0.5 rounded-full backdrop-blur-sm text-[10px] ${
                sourceLabel
                  ? "bg-black/55 border border-white/15 text-white/85"
                  : "bg-black/40 border border-white/10 text-white/55 italic"
              }`}
              title={
                sourceLabel
                  ? `Source: ${sourceLabel}`
                  : "Source unknown — via CARI archive"
              }
            >
              <span className="uppercase tracking-widest text-[9px] text-white/45 mr-1">
                Src
              </span>
              <span className="truncate">{sourceLabel ?? "unknown"}</span>
            </span>
          )}
        </button>

        {/* Gallery thumbs — always render this band even when there are
            no extra images, so the title row below it starts at the same
            y-coordinate on every card and between comparisons. */}
        <div
          ref={galleryRef}
          className="flex gap-1 p-1 flex-shrink-0 overflow-x-auto touch-pan-x bg-black/30 scrollbar-thin h-10 sm:h-14 md:h-16"
        >
          {allImages.length > 1 ? (
            allImages.map((img, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-pressed={isActive}
                  className={`relative flex-shrink-0 w-10 h-8 sm:w-14 sm:h-12 md:w-16 md:h-14 rounded-md overflow-hidden bg-neutral-800 cursor-pointer transition-all ${
                    isActive
                      ? "ring-2 ring-white opacity-100"
                      : "opacity-55 hover:opacity-95 ring-1 ring-white/10"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                </button>
              );
            })
          ) : (
            <span className="sr-only">No additional images</span>
          )}
        </div>

        {/* Info — description scrolls inside its own region; the More
            info link is hidden on mobile. */}
        <div className="flex flex-col gap-1 sm:gap-1.5 p-2.5 sm:p-4 md:p-5 text-left flex-1 min-h-0">
          {/* Title + years stack vertically on narrow viewports.
              The previous side-by-side layout used `flex-shrink-0 whitespace-nowrap`
              on the years span, which on mobile crushed the title to ~0px
              width and made `break-words` render each letter on its own
              line (the "Themed Spaces" bug). Stacking removes any
              competition for horizontal space, so the heading can wrap
              normally at word boundaries. */}
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <h2
              className="font-display text-white font-semibold text-sm sm:text-lg md:text-xl leading-[1.1] tracking-tight"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 60' }}
            >
              {aesthetic.name}
            </h2>
            {years && (
              <span className="mt-1 sm:mt-0 sm:flex-shrink-0 text-white/35 text-[9px] sm:text-[10px] font-mono tabular-nums uppercase tracking-wider whitespace-nowrap">
                {years}
              </span>
            )}
          </div>

          {aesthetic.description && (
            <p className="text-white/65 text-[11px] sm:text-sm leading-snug sm:leading-relaxed whitespace-pre-line flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              {aesthetic.description}
            </p>
          )}

          <a
            href={`/aesthetics/${aesthetic.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex mt-1 items-center gap-1.5 self-start text-white/35 hover:text-white text-[11px] uppercase tracking-[0.15em] transition-colors pt-1"
          >
            <span>More info</span>
            <ArrowUpRight className="w-3 h-3" strokeWidth={1.75} />
          </a>
        </div>
      </div>

      {lightboxIndex !== null && allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          initialIndex={lightboxIndex}
          alt={aesthetic.name}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
