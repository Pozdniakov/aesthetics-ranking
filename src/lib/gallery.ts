import type { Aesthetic } from "@/lib/supabase/types";

/**
 * A single image in an aesthetic's gallery, with optional attribution
 * pulled from the original Are.na block. We surface this so creators get
 * credited per CARI's usage guidelines.
 *
 * The richness here matters: on Are.na the curator-written `title` is
 * usually the work's name ("Posters for Making Time (2016)") and the
 * `description` is usually "YEAR\nAUTHOR\n[optional URL]". The
 * `source_*` fields are the block's outbound link, which only some
 * blocks have. We store all of them so the UI can compose the best
 * possible credit.
 */
export interface GalleryItem {
  url: string;
  /** Curator-written title from Are.na block.title. Usually the work name. */
  title: string | null;
  /**
   * Curator-written description from Are.na block.description. Usually
   * "YEAR\nAUTHOR\n[optional URL]" but the schema is not enforced.
   */
  description: string | null;
  /** Original source URL of the image (e.g. the artist's site or social link). */
  source_url: string | null;
  /** Optional human-readable title for the source. */
  source_title: string | null;
}

interface RawGalleryEntry {
  url?: unknown;
  title?: unknown;
  description?: unknown;
  source_url?: unknown;
  source_title?: unknown;
}

function toGalleryItem(value: unknown): GalleryItem | null {
  if (typeof value === "string") {
    return {
      url: value,
      title: null,
      description: null,
      source_url: null,
      source_title: null,
    };
  }
  if (value && typeof value === "object") {
    const obj = value as RawGalleryEntry;
    if (typeof obj.url !== "string") return null;
    return {
      url: obj.url,
      title: typeof obj.title === "string" ? obj.title : null,
      description:
        typeof obj.description === "string" ? obj.description : null,
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
      title: null,
      description: null,
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
    items.push({
      url,
      title: null,
      description: null,
      source_url: null,
      source_title: null,
    });
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
 * badge on swipe/compare cards. The priority chain picks the most
 * descriptive thing available:
 *   1. block.title   — usually the work name ("Posters for Making Time (2016)").
 *   2. source_title  — usually the linked-out page title (often just a domain).
 *   3. hostname      — last-resort, derived from source_url.
 *   4. null          — caller renders an explicit "source unknown" placeholder.
 */
export function getSourceLabel(item: GalleryItem): string | null {
  if (item.title && item.title.trim()) return item.title.trim();
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

/**
 * Parses the Are.na block.description into structured creator info.
 * CARI's curators follow a loose convention of
 *   YEAR\n
 *   AUTHOR\n
 *   [optional source URL]
 * but it's not enforced. We heuristically pull out the year and URL and
 * treat the remaining non-empty lines as the author/credit text. Falls
 * back gracefully when the description does not fit the pattern.
 */
export interface ParsedAttribution {
  year: string | null;
  author: string | null;
  url: string | null;
  /** Full original description, with whitespace collapsed for display. */
  raw: string | null;
}

export function parseAttribution(item: GalleryItem): ParsedAttribution {
  const desc = item.description?.trim();
  if (!desc) {
    return { year: null, author: null, url: null, raw: null };
  }
  const lines = desc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let year: string | null = null;
  let url: string | null = null;
  const credit: string[] = [];
  for (const line of lines) {
    if (/^https?:\/\//i.test(line)) {
      url ??= line;
      continue;
    }
    // Year heuristic: a 4-digit number, optionally with a decade suffix
    // (e.g. "1970s") or range ("2010-2015"). Keep it strict so we don't
    // swallow lines like "1995 - Aldus PageMaker".
    if (
      !year &&
      /^(?:19|20)\d{2}s?$/.test(line.replace(/[–-]\s*(19|20)\d{2}s?$/, ""))
    ) {
      year = line;
      continue;
    }
    credit.push(line);
  }
  const author = credit.length > 0 ? credit.join(" · ") : null;
  return { year, author, url, raw: desc };
}
