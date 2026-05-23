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

interface ArenaBlock {
  class: string;
  image?: ArenaImageVariants;
  attachment?: { url: string; content_type: string };
  embed?: { html: string };
}

interface ArenaChannel {
  metadata?: { description?: string };
  contents?: ArenaBlock[];
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

type ArenaResult = { description: string; images: string[] };

async function fetchArenaData(channelSlug: string): Promise<ArenaResult | null> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(
        `https://api.are.na/v2/channels/${channelSlug}?page=1&per=20`,
        { headers: { Accept: "application/json" } }
      );
      if (res.ok) {
        const data: ArenaChannel = await res.json();
        const description = (data.metadata?.description ?? "").trim();
        // Prefer `large` (1800px) over `display` (1200px) for crisp covers + zoom.
        const images = (data.contents ?? [])
          .filter((c) => c.class === "Image" && (c.image?.large?.url || c.image?.display?.url))
          .slice(0, 7)
          .map((c) => (c.image!.large?.url ?? c.image!.display!.url));
        return { description, images };
      }
      if (res.status !== 429) return null;
      const wait = Math.min(60_000, 5_000 * attempt);
      console.log(`    Are.na 429 on ${channelSlug}, waiting ${wait / 1000}s (attempt ${attempt}/5)`);
      await delay(wait);
    } catch (err) {
      if (attempt === 5) return null;
      await delay(3_000 * attempt);
      void err;
    }
  }
  return null;
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
    const { data } = await supabase.from("aesthetics").select("slug, gallery_images");
    let allRows = data ?? [];
    if (MISSING_ONLY) {
      allRows = allRows.filter((r) => {
        const imgs = (r.gallery_images as string[] | null) ?? [];
        if (imgs.length === 0) return true;
        // Treat CARI-thumbnail URLs as "needs re-fetch"; real gallery is on Are.na's CDN.
        return imgs.some((u) => /cari-prod\.s3/i.test(u));
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
    // 200×200 and looks blurry when scaled up). Remaining images become the gallery.
    const [coverFromArena, ...galleryFromArena] = arenaData.images;

    const { error } = await supabase
      .from("aesthetics")
      .update({
        description: description || null,
        cover_image_url: coverFromArena,
        gallery_images: galleryFromArena.slice(0, 6),
        arena_slug: arenaSlug,
      })
      .eq("slug", slug);

    if (error) {
      console.log(`  [${i + 1}/${slugs.length}] ${slug} — DB error: ${error.message}`);
      failed++;
    } else {
      console.log(
        `  [${i + 1}/${slugs.length}] ${slug} — cover + ${galleryFromArena.length} gallery, ${description.length} chars`
      );
      enriched++;
    }

    await delay(BASE_DELAY);
  });

  console.log(`\nDone. Enriched: ${enriched}, failed: ${failed}`);
}

main().catch(console.error);
