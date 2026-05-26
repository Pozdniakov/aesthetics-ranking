"use client";

import Image from "next/image";
import { useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import {
  getVideoSourceLabel,
  type VideoItem,
} from "@/lib/videos";
import { parseAttribution } from "@/lib/gallery";

interface Props {
  videos: VideoItem[];
}

export function AestheticVideosSection({ videos }: Props) {
  const [active, setActive] = useState<VideoItem | null>(null);

  if (videos.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-white/45 text-xs uppercase tracking-[0.2em]">
          Videos
        </h2>
        <p className="text-white/30 text-[10px] uppercase tracking-[0.18em] text-right">
          Click to load external embed
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {videos.map((video, i) => {
          const label = getVideoSourceLabel(video) ?? `Video ${i + 1}`;
          const attr = parseAttribution({
            url: video.thumbnail_url ?? video.embed_url ?? video.file_url ?? "",
            title: video.title,
            description: video.description,
            source_url: video.source_url,
            source_title: video.source_title,
          });
          return (
            <button
              key={`${video.embed_url ?? video.file_url}-${i}`}
              type="button"
              onClick={() => setActive(video)}
              className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 hover:border-white/25 transition-colors"
              aria-label={`Play ${label}`}
            >
              {video.thumbnail_url ? (
                <Image
                  src={video.thumbnail_url}
                  alt=""
                  fill
                  className="object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  sizes="(max-width: 640px) 100vw, 420px"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur-sm group-hover:scale-105 transition-transform">
                  <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
                </span>
              </span>
              <span className="absolute inset-x-3 bottom-3 flex flex-col gap-1">
                <span className="line-clamp-2 text-white text-sm font-medium leading-tight">
                  {label}
                </span>
                {(attr.year || attr.author || video.provider) && (
                  <span className="line-clamp-1 text-white/55 text-[11px]">
                    {[attr.year, attr.author, video.provider]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-white/30 text-[11px] leading-relaxed">
        Videos are not loaded until you click a tile. Playback may load an
        external YouTube or Vimeo embed governed by that provider&apos;s privacy
        policy.
      </p>

      {active && (
        <VideoDialog video={active} onClose={() => setActive(null)} />
      )}
    </section>
  );
}

function VideoDialog({
  video,
  onClose,
}: {
  video: VideoItem;
  onClose: () => void;
}) {
  const label = getVideoSourceLabel(video) ?? "Video";
  const attr = parseAttribution({
    url: video.thumbnail_url ?? video.embed_url ?? video.file_url ?? "",
    title: video.title,
    description: video.description,
    source_url: video.source_url,
    source_title: video.source_title,
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Close video"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <div className="aspect-video w-full bg-black">
            {video.embed_url ? (
              <iframe
                src={video.embed_url}
                title={label}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : video.file_url ? (
              <video
                src={video.file_url}
                poster={video.thumbnail_url ?? undefined}
                controls
                className="h-full w-full"
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5 p-4">
            <p className="text-white font-medium leading-snug">{label}</p>
            {(attr.year || attr.author || video.provider) && (
              <p className="text-white/55 text-sm">
                {[attr.year, attr.author, video.provider]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {video.source_url && (
              <a
                href={video.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 self-start text-white/45 hover:text-white text-xs uppercase tracking-[0.16em] transition-colors"
              >
                Original source
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
