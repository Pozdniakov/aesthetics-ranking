import type { Aesthetic } from "@/lib/supabase/types";

/**
 * A single image in an aesthetic's gallery, with optional attribution
 * pulled from the original Are.na block. We surface this so creators get
 * credited per CARI's usage guidelines.
 */
export interface GalleryItem {
  url: string;
  /** Original source URL of the image (e.g. the artist's site or social link). */
  source_url: string | null;
  /** Optional human-readable title for the source. */
  source_title: string | null;
}

interface RawGalleryEntry {
  url?: unknown;
  source_url?: unknown;
  source_title?: unknown;
}

function toGalleryItem(value: unknown): GalleryItem | null {
  if (typeof value === "string") {
    return { url: value, source_url: null, source_title: null };
  }
  if (value && typeof value === "object") {
    const obj = value as RawGalleryEntry;
    if (typeof obj.url !== "string") return null;
    return {
      url: obj.url,
      source_url: typeof obj.source_url === "string" ? obj.source_url : null,
      source_title:
        typeof obj.source_title === "string" ? obj.source_title : null,
    };
  }
  return null;
}

/**
 * Combine cover + gallery into a single ordered list of GalleryItems.
 *
 * Reads the new `gallery` JSONB column first (each entry carries attribution
 * metadata). Falls back to the legacy `gallery_images text[]` column for
 * rows that haven't been re-enriched yet. The cover image is always
 * prepended so it shows up first and shares the same shape.
 */
export function normalizeGallery(aesthetic: Aesthetic): GalleryItem[] {
  const items: GalleryItem[] = [];

  if (aesthetic.cover_image_url) {
    // The cover's attribution lives on `gallery[0]` when the row has been
    // freshly enriched. We pick it up below — for legacy rows the cover
    // ships without attribution data.
    items.push({
      url: aesthetic.cover_image_url,
      source_url: null,
      source_title: null,
    });
  }

  const richGallery = Array.isArray(aesthetic.gallery)
    ? (aesthetic.gallery as unknown[])
        .map(toGalleryItem)
        .filter((item): item is GalleryItem => item !== null)
    : [];

  if (richGallery.length > 0) {
    // If the rich gallery has an entry matching the cover URL, copy its
    // attribution onto the cover and skip the duplicate. This keeps the
    // visible image order identical to the legacy code path.
    const coverIndex = items[0]
      ? richGallery.findIndex((g) => g.url === items[0].url)
      : -1;
    if (coverIndex >= 0) {
      items[0] = richGallery[coverIndex];
      const tail = richGallery
        .slice(0, coverIndex)
        .concat(richGallery.slice(coverIndex + 1));
      items.push(...tail);
    } else {
      items.push(...richGallery);
    }
    return dedupeByUrl(items);
  }

  const legacy = Array.isArray(aesthetic.gallery_images)
    ? aesthetic.gallery_images
    : [];
  for (const url of legacy) {
    if (typeof url !== "string") continue;
    items.push({ url, source_url: null, source_title: null });
  }
  return dedupeByUrl(items);
}

function dedupeByUrl(items: GalleryItem[]): GalleryItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

/**
 * Short attribution label for a single image, used by the always-visible
 * badge on swipe/compare cards. Prefers the human-readable
 * `source_title` from the Are.na block; falls back to the hostname; and
 * returns null when neither is known so the caller can render an
 * explicit "source unknown" placeholder.
 */
export function getSourceLabel(item: GalleryItem): string | null {
  if (item.source_title && item.source_title.trim()) {
    return item.source_title.trim();
  }
  if (item.source_url) {
    try {
      const u = new URL(item.source_url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return item.source_url;
    }
  }
  return null;
}
