"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  ThumbsDown,
  Undo2,
  ZoomIn,
} from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { StageIndicator } from "@/components/StageIndicator";
import { useHorizontalWheel } from "@/hooks/useHorizontalWheel";
import { getSourceLabel, normalizeGallery } from "@/lib/gallery";
import type { Aesthetic } from "@/lib/supabase/types";

interface Props {
  aesthetic: Aesthetic;
  currentIndex: number;
  total: number;
  canUndo: boolean;
  onLike: () => void;
  onDislike: () => void;
  onUndo: () => void;
}

export function SwipeCard({
  aesthetic,
  currentIndex,
  total,
  canUndo,
  onLike,
  onDislike,
  onUndo,
}: Props) {
  // Single ordered list (cover + gallery) with optional per-image
  // attribution. Falls back to URL-only entries for rows that haven't
  // been re-enriched yet (see src/lib/gallery.ts).
  const allImages = normalizeGallery(aesthetic);

  // Active image is the one shown big at top.
  // Reset to the cover whenever the aesthetic changes.
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const galleryRef = useHorizontalWheel<HTMLDivElement>();

  useEffect(() => {
    setActiveIndex(0);
  }, [aesthetic.id]);

  // Keyboard navigation through the gallery thumbnails. Skip when the
  // user is typing into a field (e.g. the name gate input on first run).
  useEffect(() => {
    if (allImages.length <= 1) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + allImages.length) % allImages.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % allImages.length);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [allImages.length]);

  const years = aesthetic.start_year
    ? `${aesthetic.start_year}${
        aesthetic.end_year
          ? aesthetic.end_year === "Current"
            ? " – now"
            : ` – ${aesthetic.end_year}`
          : ""
      }`
    : aesthetic.decade;

  const activeUrl = allImages[activeIndex]?.url;
  const activeImage = allImages[activeIndex];
  const sourceLabel = activeImage ? getSourceLabel(activeImage) : null;

  return (
    <>
      <div className="flex flex-col gap-3 max-w-md md:max-w-4xl mx-auto w-full px-3 sm:px-4 pt-2 pb-2 sm:pt-4 sm:pb-4 h-[calc(100dvh-6.5rem)] min-h-[520px]">
        {/* Top bar: Undo + two-stage progress indicator */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
            aria-label="Undo last swipe"
          >
            <Undo2 className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <div className="flex-1 min-w-0">
            <StageIndicator
              currentStage={1}
              stage1={{ done: currentIndex, total }}
              stage2={{ done: 0, estimate: 0 }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 min-h-0 w-full rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 flex flex-col md:flex-row">
          {/* Visual side */}
          <div className="flex flex-col flex-shrink-0 md:w-1/2 lg:w-3/5 min-h-0">
            {/* Wrap the cover button and the gallery prev/next arrows in
                a positioned container — the arrows are siblings, not
                nested children of the button, so we don't violate the
                "no nested <button>" rule. */}
            <div className="relative w-full flex-shrink-0 md:flex-1 md:min-h-0 aspect-[16/10] sm:aspect-[3/2] md:aspect-auto">
              <button
                type="button"
                onClick={() => activeUrl && setLightboxIndex(activeIndex)}
                className="absolute inset-0 w-full h-full bg-neutral-800 group cursor-zoom-in"
                aria-label="Zoom image"
              >
                {activeUrl ? (
                  <Image
                    key={activeUrl}
                    src={activeUrl}
                    alt={aesthetic.name}
                    fill
                    className="object-cover animate-in fade-in duration-200"
                    sizes="(max-width: 768px) 100vw, 60vw"
                    unoptimized
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-sm">
                    No image
                  </div>
                )}
                <span className="absolute bottom-2.5 right-2.5 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/80 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-4 h-4" strokeWidth={1.75} />
                </span>
              </button>

              {/* Prev / next arrows are overlaid on top of the cover
                  button. They sit at z-10, above the image but below the
                  lightbox. e.stopPropagation prevents the underlying
                  zoom-button from firing when the user just wants to
                  flip the gallery. */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex(
                        (i) => (i - 1 + allImages.length) % allImages.length
                      );
                    }}
                    aria-label="Previous image"
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/85 hover:bg-black/70 hover:text-white transition-colors flex items-center justify-center"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIndex((i) => (i + 1) % allImages.length);
                    }}
                    aria-label="Next image"
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/85 hover:bg-black/70 hover:text-white transition-colors flex items-center justify-center"
                  >
                    <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  {/* Index counter — small, in the top-right, so the user
                      sees they're on N of M. */}
                  <span className="absolute top-2 right-2 z-10 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 text-white/85 text-[10px] font-mono tabular-nums">
                    {activeIndex + 1} / {allImages.length}
                  </span>
                </>
              )}

              {/* Source badge — always visible per CARI usage guidelines.
                  Text-only inside the cover (the cover itself is a button,
                  so we can't nest an <a>); the lightbox surfaces the
                  clickable source link when the user zooms in. Rendered
                  outside the multi-image conditional so single-image
                  aesthetics still get attribution. */}
              {activeUrl && (
                <span
                  className={`absolute top-2 left-2 z-10 inline-flex items-center max-w-[60%] px-2 py-0.5 rounded-full backdrop-blur-sm text-[10px] ${
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
                  <span className="truncate">
                    {sourceLabel ?? "unknown"}
                  </span>
                </span>
              )}
            </div>

            {allImages.length > 1 && (
              <div
                ref={galleryRef}
                className="flex gap-1 p-1 overflow-x-auto flex-shrink-0 scrollbar-thin"
              >
                {allImages.map((img, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={`${img.url}-${i}`}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={`relative flex-shrink-0 w-14 h-12 sm:w-16 sm:h-14 rounded-md overflow-hidden bg-neutral-800 transition-all ${
                        isActive
                          ? "ring-2 ring-white opacity-100"
                          : "opacity-50 hover:opacity-90 ring-1 ring-white/10"
                      }`}
                      aria-label={`Show image ${i + 1}`}
                      aria-pressed={isActive}
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
                })}
              </div>
            )}
          </div>

          {/* Text side — scrolls internally. On mobile we tighten padding
              and inline the CARI link with the title row instead of pinning
              it to the bottom: that wasted a band of empty space when the
              description was short. */}
          <div className="p-3.5 sm:p-5 md:p-6 flex-1 min-h-0 flex flex-col gap-2 sm:gap-3 overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2
                  className="font-display text-white font-semibold text-xl sm:text-2xl md:text-3xl leading-[1.05] tracking-tight"
                  style={{ fontVariationSettings: '"opsz" 144, "SOFT" 60' }}
                >
                  {aesthetic.name}
                </h2>
                {years && (
                  <span className="block text-white/40 text-[11px] sm:text-xs font-mono tabular-nums mt-1">
                    {years}
                  </span>
                )}
              </div>
              <a
                href={`/aesthetics/${aesthetic.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 sm:w-auto sm:h-auto sm:px-2 sm:py-1 rounded-full sm:rounded-md border border-white/10 sm:border-transparent text-white/45 hover:text-white sm:hover:bg-white/10 transition-colors"
                aria-label="Open aesthetic details"
              >
                <ArrowUpRight
                  className="w-3.5 h-3.5 sm:w-3 sm:h-3"
                  strokeWidth={1.75}
                />
                <span className="hidden sm:inline ml-1 text-[10px] uppercase tracking-[0.15em]">
                  Info
                </span>
              </a>
            </div>
            {aesthetic.description ? (
              <p className="text-white/75 text-sm sm:text-[15px] leading-relaxed whitespace-pre-line">
                {aesthetic.description}
              </p>
            ) : (
              <p className="text-white/30 text-sm italic">No description</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={onDislike}
            className="flex-1 py-3.5 rounded-xl bg-white/[0.03] hover:bg-rose-950/40 border border-white/10 hover:border-rose-700/50 text-white/80 hover:text-rose-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            aria-label="Dislike"
          >
            <ThumbsDown className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-sm font-medium tracking-wide">Pass</span>
          </button>
          <button
            onClick={onLike}
            className="flex-1 py-3.5 rounded-xl bg-white/[0.03] hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-700/50 text-white/80 hover:text-emerald-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            aria-label="Like"
          >
            <Heart className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-sm font-medium tracking-wide">Like</span>
          </button>
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
