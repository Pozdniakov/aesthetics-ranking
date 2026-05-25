import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "About · Æsthetics ranking",
  description:
    "A small, non-commercial research project that helps you rank visual aesthetics. Built on top of the CARI Institute archive.",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-10 sm:py-16 prose-invert">
      <h1
        className="font-display text-white text-3xl sm:text-4xl font-medium leading-tight tracking-tight"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80' }}
      >
        About this project
      </h1>

      <p className="mt-6 text-white/65 text-base leading-relaxed">
        Æsthetics ranking is a small, non-commercial research project built by{" "}
        <a
          href="https://pozdniakov.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          Ivan Pozdniakov
        </a>
        . It lets you swipe through 90 visual aesthetics, pairwise-compare your
        favourites, and end up with a personal top 5 plus a global leaderboard
        aggregated across everyone&rsquo;s choices.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        Where the content comes from
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        Every aesthetic, description, and image shown here is sourced from the{" "}
        <a
          href="https://cari.institute/aesthetics"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          CARI Institute
        </a>
        &rsquo;s public archive, which in turn curates its galleries from{" "}
        <a
          href="https://are.na"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          Are.na
        </a>{" "}
        channels maintained by their community. Images are displayed here for
        identification and ranking only, not for redistribution. Each
        aesthetic&rsquo;s page links back to its CARI entry and Are.na channel
        so the original sources stay one click away.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        Non-commercial use &amp; attribution
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        Per the{" "}
        <a
          href="https://cari.institute/about"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          CARI Institute&rsquo;s usage guidelines
        </a>
        , this project treats the archive as a source of inspiration and
        analysis &mdash; never as a source of free assets. No images are
        offered for download, no content is sold, and no advertising runs on
        the site. Credit goes to CARI, to Are.na, and to the original creators
        of each image, who can be reached through the Are.na block sources
        linked on every aesthetic page.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        Takedown &amp; corrections
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        If you&rsquo;re a creator and want one of your images removed, or
        you&rsquo;d like an attribution corrected, please open an issue on the{" "}
        <a
          href="https://github.com/Pozdniakov/aesthetics-ranking/issues/new?title=Takedown+request"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          project&rsquo;s GitHub repository
        </a>
        , or reach me through the contact channels on{" "}
        <a
          href="https://pozdniakov.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          pozdniakov.github.io
        </a>
        . The image will be removed promptly &mdash; usually within a day.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        How the ranking works
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        Phase one is a quick swipe through all 90 aesthetics. Phase two takes
        only the ones you liked and feeds them into a Guarded Top-K Insertion
        Sort &mdash; a small algorithm that finds your top 5 in roughly 18 to
        30 comparisons (vs. ~45 for a naive ELO setup). The algorithm runs
        entirely in your browser; only your final ranking and the individual
        pairwise outcomes are saved (anonymously) to power the global board and
        the &ldquo;mainstream vs niche&rdquo; taste score.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        Source code
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        The project is open source on GitHub:{" "}
        <a
          href="https://github.com/Pozdniakov/aesthetics-ranking"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline hover:text-white transition-colors"
        >
          Pozdniakov/aesthetics-ranking
          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </a>
        .
      </p>

      <div className="mt-12 pt-6 border-t border-white/10">
        <Link
          href="/"
          className="text-white/50 hover:text-white text-sm transition-colors"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
