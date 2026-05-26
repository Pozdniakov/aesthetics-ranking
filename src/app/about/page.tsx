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
        Every aesthetic, description, image, and video shown here is sourced
        from the{" "}
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
        roughly 18 to 30 comparisons, instead of the ~40 a full insertion
        sort would need to fully order, say, 15 liked items. The algorithm
        runs entirely in your browser; only your final ranking and the
        individual pairwise outcomes are saved (anonymously) to power the
        global board and the &ldquo;mainstream vs niche&rdquo; taste score.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        How the taste profile is calculated
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        The 0&ndash;100 &ldquo;mainstream &harr; niche&rdquo; score on your
        ranking page is a rank-based percentile, not a rating. It answers a
        single question: <em>among everyone else&rsquo;s pairwise choices,
        where do your top 5 sit in the popularity distribution?</em>
      </p>
      <ol className="mt-3 text-white/65 text-base leading-relaxed list-decimal list-inside space-y-1.5 marker:text-white/30">
        <li>
          Take every comparison anyone has ever made on the site, excluding
          your own current session, and count wins and losses for each
          aesthetic.
        </li>
        <li>
          Calculate a smoothed win rate for every aesthetic, then sort by that
          value in descending order. The most popular aesthetic gets rank 0,
          the next gets rank 1, and so on up to{" "}
          <span className="font-mono text-white/85">N&minus;1</span>.
        </li>
        <li>
          For each aesthetic in your top 5, compute its percentile{" "}
          <span className="font-mono text-white/85">p = rank / (N&minus;1)</span>.
          Items the rest of the world has never picked are treated as{" "}
          <span className="font-mono text-white/85">p = 1</span> (maximally
          niche).
        </li>
        <li>
          Your score is the average percentile across all five items,
          multiplied by 100 and rounded.
        </li>
      </ol>
      <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white/75 text-sm leading-relaxed">
        <p>
          popularity(a) = (wins(a) + 1) / (wins(a) + losses(a) + 2)
        </p>
        <p className="mt-1">
          p<sub>i</sub> = rank<sub>i</sub> / (N &minus; 1)
        </p>
        <p className="mt-1">
          score = round( mean<sub>i</sub>( p<sub>i</sub> ) &times; 100 )
        </p>
        <p className="mt-1 text-white/45 text-xs">
          rank<sub>i</sub> &mdash; 0-based position of your i-th favourite in
          the global popularity ranking; N &mdash; number of aesthetics that
          have ever won at least one comparison.
        </p>
      </div>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        Bucketing is purely cosmetic: 0&ndash;19 = Very mainstream,
        20&ndash;39 = Mainstream, 40&ndash;59 = Mixed taste,
        60&ndash;79 = Niche, 80&ndash;100 = Very niche. A score near 50
        means your favourites sit, on average, right in the middle of the
        global popularity distribution &mdash; not that you are
        &ldquo;average&rdquo;, just that the centre of mass of your top 5
        lines up with the centre of everyone else&rsquo;s choices.
      </p>
      <p className="mt-3 text-white/45 text-sm leading-relaxed">
        Caveat: the smoothing keeps low-data aesthetics from jumping straight
        to the top or bottom, but the score is still based only on choices made
        inside this site. It is best read as &ldquo;how I compare with other
        rankers here&rdquo;, not as an objective measure of cultural
        mainstream-ness.
      </p>

      <h2 className="mt-10 text-white text-lg font-semibold tracking-tight">
        Privacy &amp; data
      </h2>
      <p className="mt-3 text-white/65 text-base leading-relaxed">
        This project is built to need as little personal data as possible.
        There is no sign-up, no email collection, and no advertising scripts.
        The site uses your browser&rsquo;s{" "}
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
        site online. Video tiles on aesthetic detail pages are click-to-load:
        no YouTube or Vimeo iframe is loaded until you press play, at which
        point playback is governed by that provider&rsquo;s privacy policy.
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
