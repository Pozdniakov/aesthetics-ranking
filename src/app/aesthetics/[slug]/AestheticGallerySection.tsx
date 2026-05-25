"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "@/components/ImageLightbox";
import type { GalleryItem } from "@/lib/gallery";

interface Props {
  gallery: GalleryItem[];
  alt: string;
  cariSlug: string;
  arenaChannelUrl: string | null;
}

/**
 * Client wrapper around the static thumbnail grid on the aesthetic detail
 * page. Tapping any tile opens the shared `ImageLightbox`, which in turn
 * surfaces the per-image source link at the bottom. Previously the tiles
 * were direct `<a>` links to the original source; the lightbox path is
 * more discoverable on mobile (no long-press required) and keeps the
 * source attribution one tap away inside the lightbox.
 */
export function AestheticGallerySection({
  gallery,
  alt,
  cariSlug,
  arenaChannelUrl,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (gallery.length <= 1) return null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-white/45 text-xs uppercase tracking-[0.2em]">
          Gallery
        </h2>
        <p className="text-white/30 text-[10px] uppercase tracking-[0.18em]">
          Tap a tile to enlarge
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {gallery.map((img, i) => (
          <button
            key={`${img.url}-${i}`}
            type="button"
            onClick={() => setLightboxIndex(i)}
            aria-label={
              img.source_title
                ? `Enlarge image: ${img.source_title}`
                : `Enlarge image ${i + 1}`
            }
            className="relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 group cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors hover:border-white/15"
          >
            <Image
              src={img.url}
              alt={img.source_title ?? ""}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 280px"
              unoptimized
            />
            {img.source_url && (
              <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm border border-white/15 px-2 py-1 text-white/85 text-[10px] opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="max-w-[120px] truncate">
                  {img.source_title ?? "source"}
                </span>
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-4 text-white/30 text-[11px] leading-relaxed">
        Images shown for identification only, sourced via the{" "}
        <a
          href={`https://cari.institute/aesthetics/${cariSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white/60 transition-colors"
        >
          CARI Institute
        </a>
        {arenaChannelUrl && (
          <>
            {" "}
            from the{" "}
            <a
              href={arenaChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/60 transition-colors"
            >
              Are.na channel
            </a>
          </>
        )}
        . Tap a tile to enlarge and visit the original source where available.
      </p>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={gallery}
          initialIndex={lightboxIndex}
          alt={alt}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}
