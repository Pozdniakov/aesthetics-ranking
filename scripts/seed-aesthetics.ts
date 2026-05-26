/**
 * Seed script: fetches all aesthetics from cari.institute + Are.na enrichment
 * and upserts them into Supabase.
 *
 * Data sources:
 *  1. https://cari.institute/api/aesthetics  — basic list (name, slug, image)
 *  2. https://cari.institute/aesthetics/:slug — HTML page (only the Are.na channel slug;
 *     the rendered "Gallery" comes from JS so the HTML cannot be used as a fallback).
 *  3. https://api.are.na/v2/channels/:slug    — description + gallery images
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 *
 * Flags:
 *   --enrich-only     skip basic upsert, only fetch Are.na data for existing rows
 *   --missing-only    only enrich rows whose gallery_images is empty / from CARI
 *   --concurrency=N   parallel requests (default: 1; Are.na rate-limits aggressively)
 *   --delay-ms=N      base delay between requests in ms (default: 1500)
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const ENRICH_ONLY = process.argv.includes("--enrich-only");
const MISSING_ONLY = process.argv.includes("--missing-only");
const CONCURRENCY = parseInt(
  (process.argv.find((a) => a.startsWith("--concurrency=")) ?? "").split("=")[1] ?? "1"
);
const BASE_DELAY = parseInt(
  (process.argv.find((a) => a.startsWith("--delay-ms=")) ?? "").split("=")[1] ?? "1500"
);

// ── CARI types ────────────────────────────────────────────────────────────────

interface CariAesthetic {
  name: string;
  urlSlug: string;
  startYear: string | null;
  endYear: string | null;
  decadeYear: string | null;
  displayImageUrl: string | null;
  isPreview: boolean;
}

interface CariPage {
  content: Array<Record<string, CariAesthetic[]>>;
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

// ── Are.na types ──────────────────────────────────────────────────────────────

interface ArenaImageVariants {
  thumb?: { url: string };
  square?: { url: string };
  display?: { url: string };
  large?: { url: string };
  original?: { url: string };
}

interface ArenaSource {
  url?: string;
  title?: string;
  provider?: { name?: string };
}

interface ArenaEmbed {
  html?: string;
  url?: string;
  title?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
}

interface ArenaBlock {
  class: string;
  title?: string | null;
  description?: string | null;
  source?: ArenaSource | null;
  image?: ArenaImageVariants;
  attachment?: { url: string; content_type: string };
  embed?: ArenaEmbed | null;
}

interface ArenaChannel {
  metadata?: { description?: string };
  contents?: ArenaBlock[];
}

// Shape of each enriched gallery item we store in the `gallery` jsonb
// column. Aligned with the `GalleryItem` type used on the client side
// (src/lib/gallery.ts).
interface GalleryItem {
  url: string;
  /** Curator-written Are.na block.title — usually the work name. */
  title: string | null;
  /** Curator-written block.description — usually "YEAR\nAUTHOR\n[url]". */
  description: string | null;
  /** Are.na block.source.url — the original outbound link, if any. */
  source_url: string | null;
  /** block.source.title || block.source.provider.name. */
  source_title: string | null;
}

interface VideoItem {
  title: string | null;
  description: string | null;
  embed_url: string | null;
  file_url: string | null;
  thumbnail_url: string | null;
  source_url: string | null;
  source_title: string | null;
  provider: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function htmlToText(value: string): string {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function extractIframeSrc(html: string | undefined): string | null {
  if (!html) return null;
  const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.replace(/&amp;/g, "&") ?? null;
}

function unwrapEmbedlyProxy(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith("embedly.com")) return value;
    const inner = url.searchParams.get("src");
    return inner ?? null;
  } catch {
    return null;
  }
}

function isSupportedVideoHost(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com" ||
      host === "vimeo.com" ||
      host === "player.vimeo.com"
    );
  } catch {
    return false;
  }
}

function normalizeEmbedUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      if (url.pathname.startsWith("/embed/")) {
        return `https://www.youtube-nocookie.com${url.pathname}`;
      }
    }

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }

    if (host === "youtube-nocookie.com" && url.pathname.startsWith("/embed/")) {
      return `https://www.youtube-nocookie.com${url.pathname}`;
    }

    if (host === "vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }

    if (host === "player.vimeo.com" && url.pathname.startsWith("/video/")) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

function pickVideoEmbedUrl(
  block: ArenaBlock
): { embedUrl: string | null; provider: string | null } {
  const candidates: (string | null | undefined)[] = [
    block.source?.url,
    unwrapEmbedlyProxy(extractIframeSrc(block.embed?.html)),
    extractIframeSrc(block.embed?.html),
    block.embed?.url,
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (!isSupportedVideoHost(c)) continue;
    const normalized = normalizeEmbedUrl(c);
    if (normalized) return { embedUrl: normalized, provider: providerFromUrl(normalized) };
  }
  return { embedUrl: null, provider: null };
}

function providerFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("youtu.be")) return "YouTube";
    if (host.includes("vimeo")) return "Vimeo";
    return host;
  } catch {
    return null;
  }
}

function bestImageUrl(image: ArenaImageVariants | undefined): string | null {
  return (
    image?.large?.url ??
    image?.display?.url ??
    image?.thumb?.url ??
    image?.square?.url ??
    null
  );
}

function dedupeVideos(videos: VideoItem[]): VideoItem[] {
  const seen = new Set<string>();
  return videos.filter((video) => {
    const key = video.embed_url ?? video.file_url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Run tasks with limited concurrency. */
async function pool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<void>
): Promise<void> {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

// ── CARI fetch ────────────────────────────────────────────────────────────────

async function fetchAllCari(): Promise<CariAesthetic[]> {
  const all: CariAesthetic[] = [];
  const res = await fetch("https://cari.institute/api/aesthetics?page=0", {
    headers: { Accept: "application/json" },
  });
  const first: CariPage = await res.json();
  for (const g of first.content) for (const v of Object.values(g)) all.push(...v);

  for (let p = 1; p < first.page.totalPages; p++) {
    const r = await fetch(`https://cari.institute/api/aesthetics?page=${p}`, {
      headers: { Accept: "application/json" },
    });
    const d: CariPage = await r.json();
    for (const g of d.content) for (const v of Object.values(g)) all.push(...v);
    await delay(100);
  }
  return all;
}

// ── CARI page scrape: only the Are.na channel slug + the page-level description.
//    The rendered gallery is loaded from Are.na via JS, so we never extract images
//    from CARI HTML (those would be "Related Aesthetics" thumbnails — wrong style).

async function fetchCariPageDetails(
  urlSlug: string
): Promise<{ arenaSlug: string | null; description: string }> {
  try {
    const res = await fetch(`https://cari.institute/aesthetics/${urlSlug}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; seed-bot)" },
    });
    if (!res.ok) return { arenaSlug: null, description: "" };
    const html = await res.text();

    const escapedApiMatch = html.match(/api\.are\.na\\\/v2\\\/channels\\\/([^"\\]+)/);
    const apiMatch = html.match(/api\.are\.na\/v2\/channels\/([^"'<>\s)]+)/);
    const publicMatch = html.match(/https?:\/\/(?:www\.)?are\.na\/[^"'<>\s)]+\/([^"'<>\s)]+)/);
    const arenaSlug = escapedApiMatch?.[1] ?? apiMatch?.[1] ?? publicMatch?.[1] ?? null;

    const descriptionHtml = html.match(/<div class="description">([\s\S]*?)(?:<h2>Links<\/h2>|<\/div>\s*<aside>)/)?.[1] ?? "";
    const description = htmlToText(descriptionHtml.replace(/<h2>Links<\/h2>[\s\S]*$/i, ""));

    return { arenaSlug, description };
  } catch {
    return { arenaSlug: null, description: "" };
  }
}

// ── Are.na channel fetch → description + gallery (with retries) ──────────────

type ArenaResult = {
  description: string;
  images: GalleryItem[];
  videos: VideoItem[];
};

// How many image blocks to keep per aesthetic. The /compare card and the
// /aesthetic detail view both render the strip horizontally, so the gallery
// can comfortably take 20+ thumbs without harming layout.
const MAX_IMAGES_PER_AESTHETIC = 24;
const MAX_VIDEOS_PER_AESTHETIC = 12;
const ARENA_PER_PAGE = 50;
const ARENA_MAX_PAGES = 3;

async function fetchArenaPage(
  channelSlug: string,
  page: number
): Promise<ArenaChannel | null> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(
        `https://api.are.na/v2/channels/${channelSlug}?page=${page}&per=${ARENA_PER_PAGE}`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) return (await res.json()) as ArenaChannel;
      if (res.status !== 429) return null;
      const wait = Math.min(60_000, 5_000 * attempt);
      console.log(`    Are.na 429 on ${channelSlug} p${page}, waiting ${wait / 1000}s (attempt ${attempt}/5)`);
      await delay(wait);
    } catch (err) {
      if (attempt === 5) return null;
      await delay(3_000 * attempt);
      void err;
    }
  }
  return null;
}

async function fetchArenaData(channelSlug: string): Promise<ArenaResult | null> {
  let description = "";
  const images: GalleryItem[] = [];
  const videos: VideoItem[] = [];

  for (let page = 1; page <= ARENA_MAX_PAGES; page++) {
    const data = await fetchArenaPage(channelSlug, page);
    if (!data) return page === 1 ? null : { description, images, videos };

    if (page === 1) {
      description = (data.metadata?.description ?? "").trim();
    }

    // Prefer `large` (1800px) over `display` (1200px) for crisp covers +
    // zoom. We accept both `Image` AND `Link` blocks: most of the rich
    // metadata on CARI's Are.na channels lives on Link blocks (curator
    // pastes the source URL and Are.na auto-fetches a preview image).
    // The previous "Image only" filter dropped ~half the channel and
    // discarded the best-attributed entries.
    //
    // For every block we keep four attribution fields so the UI can
    // surface the maximum credit per CARI's usage guidelines:
    //   - block.title       (often the work name + year)
    //   - block.description (often "YEAR\nAUTHOR\n[URL]")
    //   - block.source.url  (outbound link to the artist's site)
    //   - block.source.title / provider.name (domain or page title)
    const pageImages: GalleryItem[] = (data.contents ?? [])
      .filter(
        (c) =>
          (c.class === "Image" || c.class === "Link") &&
          (c.image?.large?.url || c.image?.display?.url)
      )
      .map<GalleryItem>((c) => {
        const url = c.image!.large?.url ?? c.image!.display!.url;
        const source = c.source ?? null;
        const title = c.title?.trim() || null;
        const description = c.description?.trim() || null;
        return {
          url,
          title,
          description,
          source_url: source?.url ?? null,
          source_title:
            source?.title?.trim() || source?.provider?.name?.trim() || null,
        };
      });

    images.push(...pageImages);

    const pageVideos: VideoItem[] = (data.contents ?? [])
      .filter(
        (c) =>
          c.class === "Media" ||
          (c.class === "Attachment" &&
            (c.attachment?.content_type ?? "").startsWith("video/"))
      )
      .map<VideoItem | null>((c) => {
        const source = c.source ?? null;
        const { embedUrl, provider: pickedProvider } =
          c.class === "Media" ? pickVideoEmbedUrl(c) : { embedUrl: null, provider: null };
        const fileUrl =
          c.class === "Attachment" && c.attachment?.content_type.startsWith("video/")
            ? c.attachment.url
            : null;
        if (!embedUrl && !fileUrl) return null;
        const thumbnailUrl =
          c.embed?.thumbnail_url ?? bestImageUrl(c.image) ?? null;
        const provider =
          pickedProvider ??
          c.embed?.provider_name ??
          providerFromUrl(source?.url ?? fileUrl);
        return {
          title: c.title?.trim() || c.embed?.title?.trim() || null,
          description: c.description?.trim() || null,
          embed_url: embedUrl,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          source_url: source?.url ?? embedUrl ?? fileUrl,
          source_title:
            source?.title?.trim() ||
            source?.provider?.name?.trim() ||
            c.embed?.title?.trim() ||
            null,
          provider,
        };
      })
      .filter((v): v is VideoItem => v !== null);

    videos.push(...pageVideos);

    if ((data.contents?.length ?? 0) < ARENA_PER_PAGE) {
      break;
    }
    if (
      images.length >= MAX_IMAGES_PER_AESTHETIC &&
      videos.length >= MAX_VIDEOS_PER_AESTHETIC
    ) {
      break;
    }
    // Be gentle between page calls on the same channel.
    await delay(400);
  }

  return {
    description,
    images: images.slice(0, MAX_IMAGES_PER_AESTHETIC),
    videos: dedupeVideos(videos).slice(0, MAX_VIDEOS_PER_AESTHETIC),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Step 1: basic upsert ────────────────────────────────────────────────────
  let slugs: string[];

  if (!ENRICH_ONLY) {
    console.log("Step 1: fetching CARI list...");
    const cariList = await fetchAllCari();
    console.log(`  ${cariList.length} aesthetics found`);

    const rows = cariList.map((a) => ({
      name: a.name,
      slug: a.urlSlug,
      decade: a.decadeYear,
      start_year: a.startYear,
      end_year: a.endYear,
      cover_image_url: a.displayImageUrl,
      is_preview: a.isPreview ?? false,
    }));

    const { error, count } = await supabase
      .from("aesthetics")
      .upsert(rows, { onConflict: "slug", count: "exact" });

    if (error) { console.error("Upsert failed:", error); process.exit(1); }
    console.log(`  Upserted ${count} rows`);
    slugs = cariList.map((a) => a.urlSlug);
  } else {
    const { data } = await supabase
      .from("aesthetics")
      .select("slug, gallery_images, gallery, videos");
    let allRows = data ?? [];
    if (MISSING_ONLY) {
      allRows = allRows.filter((r) => {
        const legacyImgs = (r.gallery_images as string[] | null) ?? [];
        const richImgs = Array.isArray(r.gallery)
          ? (r.gallery as unknown[])
          : [];
        // Empty altogether — needs initial enrichment.
        if (legacyImgs.length === 0 && richImgs.length === 0) return true;
        // Still on CARI thumbnails — needs to swap to Are.na images.
        if (legacyImgs.some((u) => /cari-prod\.s3/i.test(u))) return true;
        // Has legacy URLs but no rich gallery yet — re-fetch to attach
        // per-image attribution (source_url / source_title).
        if (legacyImgs.length > 0 && richImgs.length === 0) return true;
        // Image data is fresh but the new videos column is still empty.
        if (!Array.isArray(r.videos) || (r.videos as unknown[]).length === 0) {
          return true;
        }
        return false;
      });
    }
    slugs = allRows.map((r) => r.slug as string);
    console.log(
      `Step 1 skipped (--enrich-only${MISSING_ONLY ? ", --missing-only" : ""}). ${slugs.length} rows to enrich.`
    );
  }

  // ── Step 2: enrich from Are.na ──────────────────────────────────────────────
  console.log(
    `\nStep 2: enriching ${slugs.length} aesthetics from Are.na (concurrency=${CONCURRENCY}, delay=${BASE_DELAY}ms)...`
  );
  let enriched = 0;
  let failed = 0;

  await pool(slugs, CONCURRENCY, async (slug, i) => {
    const cariDetails = await fetchCariPageDetails(slug);
    const arenaSlug = cariDetails.arenaSlug;

    const arenaData = arenaSlug ? await fetchArenaData(arenaSlug) : null;

    if (!arenaData || arenaData.images.length === 0) {
      console.log(
        `  [${i + 1}/${slugs.length}] ${slug} — Are.na unavailable; keeping previous row`
      );
      failed++;
      await delay(BASE_DELAY);
      return;
    }

    const description = arenaData.description || cariDetails.description;
    // Promote the first Are.na image to be the cover (CARI's own thumbnail is only
    // 200×200 and looks blurry when scaled up). Remaining images become the gallery
    // and are NOT artificially capped here — the strip in the UI scrolls.
    const [coverFromArena, ...galleryFromArena] = arenaData.images;

    // Three columns are populated in lockstep:
    //   - `gallery_images` (legacy text[]): URL-only list, kept for
    //     backward compatibility while older app builds are still in the
    //     wild.
    //   - `gallery` (jsonb): rich list incl. per-image source_url and
    //     source_title so the UI can credit the original creator.
    //   - `videos` (jsonb): click-to-load video embeds for detail pages.
    const galleryUrls = galleryFromArena.map((g) => g.url);
    const galleryRich = arenaData.images; // includes cover at index 0

    const { error } = await supabase
      .from("aesthetics")
      .update({
        description: description || null,
        cover_image_url: coverFromArena.url,
        gallery_images: galleryUrls,
        gallery: galleryRich,
        videos: arenaData.videos,
        arena_slug: arenaSlug,
      })
      .eq("slug", slug);

    if (error) {
      console.log(`  [${i + 1}/${slugs.length}] ${slug} — DB error: ${error.message}`);
      failed++;
    } else {
      // "Credited" now counts blocks with ANY attribution metadata
      // (title, description, or source_url). After accepting Link
      // blocks and capturing title+description this should be near-100%
      // for most channels.
      const credited = galleryRich.filter(
        (g) => g.title || g.description || g.source_url
      ).length;
      console.log(
        `  [${i + 1}/${slugs.length}] ${slug} — cover + ${galleryFromArena.length} gallery (${credited}/${galleryRich.length} credited), ${arenaData.videos.length} videos, ${description.length} chars`
      );
      enriched++;
    }

    await delay(BASE_DELAY);
  });

  console.log(`\nDone. Enriched: ${enriched}, failed: ${failed}`);
}

main().catch(console.error);
