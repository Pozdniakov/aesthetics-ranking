"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, alt = "", onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  const total = images.length;

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

  if (total === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
      onClick={onClose}
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

      <div
        className="relative w-full h-full flex items-center justify-center p-3 sm:p-12 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={index}
          src={images[index]}
          alt={alt}
          onClick={handleImageClick}
          draggable={false}
          className={`max-w-full max-h-full object-contain select-none transition-transform duration-200 ${
            zoomed ? "scale-[2.5] cursor-zoom-out" : "cursor-zoom-in"
          }`}
          style={{
            transformOrigin: zoomed ? `${origin.x}% ${origin.y}%` : "center center",
            touchAction: "pinch-zoom",
          }}
        />
      </div>

      {total > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-mono uppercase tracking-widest select-none">
          {zoomed ? "tap image to zoom out" : "tap image to zoom · ← → to navigate"}
        </p>
      )}
    </div>
  );
}
