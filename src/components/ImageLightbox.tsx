"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import type { GalleryItem } from "@/lib/gallery";

interface Props {
  /**
   * Accepts either plain URL strings (legacy callers) or full `GalleryItem`
   * objects with per-image attribution. Strings are normalised into the
   * richer shape internally so the rendering code only deals with one case.
   */
  images: Array<string | GalleryItem>;
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, alt = "", onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Normalise legacy URL-only inputs into the rich GalleryItem shape so
  // the rest of this component can blindly read `current.source_url` etc.
  const items: GalleryItem[] = images.map((img) =>
    typeof img === "string"
      ? { url: img, source_url: null, source_title: null }
      : img
  );
  const total = items.length;
  const current = items[index];

  const next = useCallback(() => {
    setZoomed(false);
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setZoomed(false);
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
    setZoomed((z) => !z);
  };

  // Touch swipe-to-dismiss: a downward gesture of >80px from anywhere
  // closes the lightbox. Pinch-zoom on the image itself isn't affected
  // because the image's onClick toggles its own zoom state and touchAction
  // there is set to `pinch-zoom`.
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartY.current = null;
      return;
    }
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = endY - touchStartY.current;
    touchStartY.current = null;
    if (delta > 80) onClose();
  };

  if (total === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
        aria-label="Close"
      >
        <X className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {total > 1 && (
        <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-xs font-mono z-10 select-none">
          {index + 1} / {total}
        </span>
      )}

      {/* Always-visible attribution strip pinned to the top. Per CARI
          guidelines we credit the original source for every image we
          surface; when the underlying Are.na block has no source link
          we still tell the viewer that explicitly so they don't assume
          we authored it. The strip stops click propagation so tapping
          the link doesn't close the lightbox. */}
      <div
        className="absolute inset-x-0 top-16 sm:top-20 z-10 flex justify-center px-4 pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        {current.source_url ? (
          <a
            href={current.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto inline-flex items-center gap-2 max-w-[90vw] rounded-full bg-black/70 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-white/85 text-xs sm:text-sm hover:bg-black/85 hover:text-white transition-colors"
            title={current.source_title ?? current.source_url}
          >
            <span className="text-white/45 uppercase tracking-widest text-[10px] flex-shrink-0">
              Source
            </span>
            <span className="truncate">
              {current.source_title ?? stripUrlScheme(current.source_url)}
            </span>
            <ExternalLink
              className="w-3.5 h-3.5 flex-shrink-0 opacity-75"
              strokeWidth={1.75}
            />
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 max-w-[90vw] rounded-full bg-black/55 backdrop-blur-md border border-white/10 px-3.5 py-1.5 text-white/55 text-xs">
            <span className="text-white/35 uppercase tracking-widest text-[10px] flex-shrink-0">
              Source
            </span>
            <span className="italic">unknown — via CARI archive</span>
          </span>
        )}
      </div>


      {total > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" strokeWidth={1.5} />
          </button>
        </>
      )}

      {/* Image area: the wrapper no longer stops click propagation, so a
          tap on any of the padding / dark space around the image closes
          the lightbox. The image itself has its own onClick that
          toggles zoom and stops propagation, so tapping the image
          doesn't close. */}
      <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-12 overflow-hidden pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={index}
          src={current.url}
          alt={alt}
          onClick={handleImageClick}
          draggable={false}
          className={`max-w-full max-h-full object-contain select-none transition-transform duration-200 pointer-events-auto ${
            zoomed ? "scale-[2.5] cursor-zoom-out" : "cursor-zoom-in"
          }`}
          style={{
            transformOrigin: zoomed ? `${origin.x}% ${origin.y}%` : "center center",
            touchAction: "pinch-zoom",
          }}
        />
      </div>

      {/* Bottom bar: navigation hint only — per-image source attribution
          now lives at the top of the lightbox so it's visible even when
          the user is zoomed in. */}
      <div
        className="absolute inset-x-0 bottom-3 sm:bottom-4 flex items-center justify-center px-4 pointer-events-none"
      >
        <span className="text-white/30 text-[10px] font-mono uppercase tracking-widest select-none">
          {zoomed
            ? "tap image to zoom out"
            : total > 1
              ? "tap outside to close · ← → to navigate"
              : "tap outside to close"}
        </span>
      </div>
    </div>
  );
}

function stripUrlScheme(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}
