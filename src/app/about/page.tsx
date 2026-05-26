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
        . It lets you skim through 90 visual aesthetics with a quick
        like/skip pass, pairwise-compare your favourites, and end up with a
        personal top 5 plus a global leaderboard aggregated across
        everyone&rsquo;s choices.
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
        Phase one is a quick like/skip pass through all 90 aesthetics. Phase
        two takes only the ones you liked and feeds them into a Guarded Top-K
        Insertion Sort &mdash; a small algorithm that finds your top 5 in
        roughly 18 to 30 comparisons (vs. ~45 for a naive ELO setup). The
        algorithm runs entirely in your browser; only your final ranking and
        the individual pairwise outcomes are saved (anonymously) to power the
        global board and the &ldquo;mainstream vs niche&rdquo; taste score.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        Privacy &amp; data
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        This project is built to need as little personal data as possible.
        There is no sign-up, no email collection, and no third-party tracking
        or advertising scripts. The site uses your browser&rsquo;s{" "}
        <span className="font-mono text-white/80">localStorage</span> to
        remember your progress across pages; that storage is functional and is
        not used for marketing, so under the EU ePrivacy Directive no cookie
        banner is required.
      </p>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        <span className="text-white/80">What gets stored on the server.</span>{" "}
        When you start comparing, an anonymous session row is created in a
        Supabase (EU region) database. It contains:
      </p>
      <ul className="mt-2 text-white/65 text-sm leading-relaxed list-disc list-inside space-y-1 marker:text-white/30">
        <li>
          A random session UUID (no name, no email, no IP address recorded by
          the application).
        </li>
        <li>
          The display name you typed into the &ldquo;Before we begin&rdquo;
          prompt, if any &mdash; this becomes visible on your shared ranking
          page and as the contributor label on the global leaderboard.
        </li>
        <li>
          Your pairwise comparison choices and final top 5, used to power the
          global board and the &ldquo;mainstream vs niche&rdquo; score.
        </li>
        <li>
          A short share slug, generated only if you create a public share
          link.
        </li>
      </ul>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        <span className="text-white/80">Legal basis (GDPR Art. 6).</span> The
        display name is processed on the basis of your{" "}
        <em className="italic">consent</em> &mdash; you type it in yourself,
        knowing from the prompt that it will be public on shared rankings and
        on the leaderboard. The remaining data (comparisons, top 5) is
        processed on the basis of <em className="italic">legitimate interest</em>
        {" "}in operating the ranking and producing aggregate, anonymous
        statistics.
      </p>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        <span className="text-white/80">Your rights.</span> You can delete
        everything attached to your browser at any time: clicking{" "}
        <span className="text-white/80">Erase &amp; compare again</span> on
        the ranking page now deletes your session row, all of your pairwise
        comparisons, and your top 5 from the database, and then clears your
        browser&rsquo;s local copy too. If you ever need help with deletion or
        with correcting an attribution, open an issue on{" "}
        <a
          href="https://github.com/Pozdniakov/aesthetics-ranking/issues/new?title=Data+request"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          GitHub
        </a>
        {" "}or reach me through{" "}
        <a
          href="https://pozdniakov.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white transition-colors"
        >
          pozdniakov.github.io
        </a>
        .
      </p>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        <span className="text-white/80">Hosting &amp; processors.</span> The
        site itself is served by Vercel (which retains short-lived access
        logs); the application database is Supabase (EU region). Neither is
        used for analytics or profiling beyond what is necessary to keep the
        site online.
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
