"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
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
  const Arrow = isLeft ? ChevronLeft : ChevronRight;

  return (
    <>
      <div className="relative flex flex-col w-full h-full rounded-2xl overflow-hidden border bg-neutral-900 border-white/10">
        <button
          onClick={onChoose}
          className={`group relative flex flex-col w-full h-full cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.985] text-left ${
            isLeft ? "hover:bg-indigo-950/25" : "hover:bg-rose-950/25"
          }`}
        >
          {/* Active cover */}
          <div className="relative w-full aspect-[4/3] bg-neutral-800 overflow-hidden flex-shrink-0">
            {activeUrl ? (
              <Image
                key={activeUrl}
                src={activeUrl}
                alt={aesthetic.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03] animate-in fade-in duration-200"
                sizes="(max-width: 640px) 100vw, 50vw"
                unoptimized
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-sm">
                No image
              </div>
            )}
            <div
              className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                isLeft ? "bg-indigo-600/15" : "bg-rose-600/15"
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <Arrow
                className="w-12 h-12 text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                strokeWidth={1.4}
              />
            </div>

            {/* Zoom button — explicit, separate from choose action */}
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (allImages.length > 0) setLightboxIndex(activeIndex);
              }}
              role="button"
              tabIndex={0}
              aria-label="Zoom image"
              className="absolute bottom-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/80 hover:text-white hover:bg-black/75 transition-colors cursor-zoom-in"
            >
              <ZoomIn className="w-4 h-4" strokeWidth={1.75} />
            </span>
          </div>

          {/* Gallery selector — horizontally scrollable strip of thumbs.
              Same pattern as phase 1's SwipeCard so the UX is consistent
              and the strip still works on narrow mobile cards. */}
          {allImages.length > 1 && (
            <div className="flex gap-1 p-1 flex-shrink-0 overflow-x-auto bg-black/30">
              {allImages.map((url, i) => {
                const isActive = i === activeIndex;
                return (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(i);
                    }}
                    role="button"
                    tabIndex={0}
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
                  </span>
                );
              })}
            </div>
          )}

          {/* Info — compacted on mobile so two cards stay side-by-side. The
              body grows to fill the available height; the description can
              scroll within the card if it overflows. */}
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
              href={`https://cari.institute/aesthetics/${aesthetic.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hidden sm:inline-flex mt-1 items-center gap-1.5 self-start text-white/35 hover:text-white text-[11px] uppercase tracking-[0.15em] transition-colors pt-1"
            >
              <span>View on CARI</span>
              <ArrowUpRight className="w-3 h-3" strokeWidth={1.75} />
            </a>
          </div>
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
