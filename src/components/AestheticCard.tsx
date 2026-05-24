"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useHorizontalWheel } from "@/hooks/useHorizontalWheel";
import type { Aesthetic } from "@/lib/supabase/types";

interface Props {
  aesthetic: Aesthetic;
  side: "left" | "right";
  onChoose: () => void;
}

export function AestheticCard({ aesthetic, side, onChoose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isLeft = side === "left";
  const gallery = aesthetic.gallery_images ?? [];
  const allImages = [
    ...(aesthetic.cover_image_url ? [aesthetic.cover_image_url] : []),
    ...gallery,
  ];
  const galleryRef = useHorizontalWheel<HTMLDivElement>();

  useEffect(() => {
    setActiveIndex(0);
  }, [aesthetic.id]);

  const years = aesthetic.start_year
    ? `${aesthetic.start_year}${
        aesthetic.end_year
          ? aesthetic.end_year === "Current"
            ? " – now"
            : ` – ${aesthetic.end_year}`
          : ""
      }`
    : aesthetic.decade ?? null;

  const activeUrl = allImages[activeIndex];
  const Chevron = isLeft ? ChevronLeft : ChevronRight;

  return (
    <>
      {/* The outer container is no longer the "choose" target. Testers
          kept tapping the cover image expecting a zoom because that's the
          universal pattern; choose moved to an explicit button at the
          bottom so the affordance is unambiguous on mobile (no hover). */}
      <div
        className={`relative flex flex-col w-full h-full rounded-2xl overflow-hidden border bg-neutral-900 transition-colors ${
          isLeft
            ? "border-indigo-500/15 hover:border-indigo-400/30"
            : "border-rose-500/15 hover:border-rose-400/30"
        }`}
      >
        {/* Cover — tapping it opens the zoom lightbox. */}
        <button
          type="button"
          onClick={() => {
            if (allImages.length > 0) setLightboxIndex(activeIndex);
          }}
          aria-label="Zoom image"
          className="group/img relative w-full aspect-[4/3] bg-neutral-800 overflow-hidden flex-shrink-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
        </button>

        {/* Gallery thumbs — horizontally scrollable strip. `touch-pan-x`
            lets iOS Safari treat the strip as a horizontal pan target;
            `useHorizontalWheel` reroutes desktop mouse-wheel input. */}
        {allImages.length > 1 && (
          <div
            ref={galleryRef}
            className="flex gap-1 p-1 flex-shrink-0 overflow-x-auto touch-pan-x bg-black/30 scrollbar-thin"
          >
            {allImages.map((url, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={i}
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
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Info — compacted on mobile so two cards stay side-by-side. */}
        <div className="flex flex-col gap-1 sm:gap-1.5 p-2.5 sm:p-4 md:p-5 text-left flex-1 min-h-0">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h2
              className="font-display text-white font-semibold text-sm sm:text-lg md:text-xl leading-[1.1] tracking-tight"
              style={{ fontVariationSettings: '"opsz" 96, "SOFT" 60' }}
            >
              {aesthetic.name}
            </h2>
            {years && (
              <span className="text-white/35 text-[9px] sm:text-[10px] font-mono tabular-nums uppercase tracking-wider whitespace-nowrap">
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

        {/* The choose action — explicit, prominent, side-coded. The chevron
            points toward this card from the central gap so it reads as
            "pick the side". */}
        <button
          type="button"
          onClick={onChoose}
          aria-label={`Choose ${aesthetic.name}`}
          className={`flex-shrink-0 w-full py-2.5 sm:py-3 flex items-center justify-center gap-1.5 sm:gap-2 text-sm font-medium tracking-wide border-t transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 active:scale-[0.985] ${
            isLeft
              ? "bg-indigo-950/40 hover:bg-indigo-900/60 border-indigo-500/30 text-indigo-100"
              : "bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/30 text-rose-100"
          }`}
        >
          {isLeft && <Chevron className="w-4 h-4" strokeWidth={2} />}
          <span>Choose this</span>
          {!isLeft && <Chevron className="w-4 h-4" strokeWidth={2} />}
        </button>
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
