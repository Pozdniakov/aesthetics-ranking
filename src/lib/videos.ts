import type { Aesthetic } from "@/lib/supabase/types";

export interface VideoItem {
  title: string | null;
  description: string | null;
  /** Privacy-friendly embed URL, loaded only after the user clicks. */
  embed_url: string | null;
  /** Direct video file URL for the rare Are.na attachment case. */
  file_url: string | null;
  thumbnail_url: string | null;
  source_url: string | null;
  source_title: string | null;
  provider: string | null;
}

interface RawVideoEntry {
  title?: unknown;
  description?: unknown;
  embed_url?: unknown;
  file_url?: unknown;
  thumbnail_url?: unknown;
  source_url?: unknown;
  source_title?: unknown;
  provider?: unknown;
}

function toVideoItem(value: unknown): VideoItem | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as RawVideoEntry;
  const embedUrl = typeof obj.embed_url === "string" ? obj.embed_url : null;
  const fileUrl = typeof obj.file_url === "string" ? obj.file_url : null;
  if (!embedUrl && !fileUrl) return null;
  return {
    title: typeof obj.title === "string" ? obj.title : null,
    description: typeof obj.description === "string" ? obj.description : null,
    embed_url: embedUrl,
    file_url: fileUrl,
    thumbnail_url:
      typeof obj.thumbnail_url === "string" ? obj.thumbnail_url : null,
    source_url: typeof obj.source_url === "string" ? obj.source_url : null,
    source_title:
      typeof obj.source_title === "string" ? obj.source_title : null,
    provider: typeof obj.provider === "string" ? obj.provider : null,
  };
}

export function normalizeVideos(aesthetic: Aesthetic): VideoItem[] {
  const raw = Array.isArray(aesthetic.videos)
    ? (aesthetic.videos as unknown[])
    : [];
  return dedupeVideos(
    raw.map(toVideoItem).filter((item): item is VideoItem => item !== null)
  );
}

export function getVideoSourceLabel(video: VideoItem): string | null {
  if (video.title?.trim()) return video.title.trim();
  if (video.source_title?.trim()) return video.source_title.trim();
  if (video.provider?.trim()) return video.provider.trim();
  if (video.source_url) {
    try {
      return new URL(video.source_url).hostname.replace(/^www\./, "");
    } catch {
      return video.source_url;
    }
  }
  return null;
}

function dedupeVideos(items: VideoItem[]): VideoItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.embed_url ?? item.file_url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
