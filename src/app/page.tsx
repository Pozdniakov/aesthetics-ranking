import Image from "next/image";
import { HomeCTA } from "@/components/HomeCTA";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center gap-8 py-10">
      {/* Logo emblem + RANKING wordmark.
          The PNG canvas has ~18% bottom padding around the Æ glyph, so we
          pull the wordmark up with a negative margin to sit right under the
          letter. Width is set to ~78% — slightly inside the letter's
          visible width (~81% of the canvas) so the word never appears
          wider than the glyph itself. */}
      <div className="flex flex-col items-center select-none w-[180px] sm:w-[220px]">
        <Image
          src="/logo-v2.png"
          alt="Æ"
          width={512}
          height={512}
          priority
          className="w-full h-auto"
        />
        <p
          aria-hidden="true"
          className="-mt-[26px] sm:-mt-[32px] w-[78%] flex justify-between font-display text-white text-sm sm:text-base font-medium uppercase"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100' }}
        >
          {"RANKING".split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </p>
      </div>

      {/* Hero text */}
      <div className="flex flex-col items-center gap-5 max-w-lg">
        <p className="text-white/50 text-base sm:text-lg leading-relaxed">
          Compare visual aesthetics side by side and build your personal
          top&nbsp;5. Every choice shapes your taste profile.
        </p>
      </div>

      <HomeCTA />
    </main>
  );
}
