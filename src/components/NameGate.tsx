"use client";

import Link from "next/link";
import { useState } from "react";
import { setStoredDisplayName } from "@/lib/session";

interface Props {
  onContinue: () => void;
}

/**
 * Asks the user for a display name before the swipe phase begins. The name
 * gets saved to localStorage immediately and is later persisted to the
 * Supabase session row when comparing starts. The user can also continue
 * anonymously — in that case the share page falls back to "someone".
 */
export function NameGate({ onContinue }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const trimmed = name.trim();
    setStoredDisplayName(trimmed || null);
    onContinue();
  };

  const skip = () => {
    setStoredDisplayName(null);
    onContinue();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4 text-center max-w-md mx-auto w-full">
      <div className="flex flex-col gap-3">
        <h2
          className="font-display text-white text-4xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80' }}
        >
          Before we <em className="italic font-light">begin</em>
        </h2>
        <p className="text-white/55 text-base leading-relaxed">
          What should we call you?
        </p>
      </div>

      <form onSubmit={submit} className="w-full flex flex-col gap-4">
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 focus:border-white/40 focus:outline-none text-white text-base placeholder:text-white/25 transition-colors text-center"
        />
        <p className="text-white/40 text-xs leading-snug text-left">
          The name will be visible on your <em>shared ranking</em> page and as
          your contributor label on the <em>global leaderboard</em>. Leave it
          blank to stay anonymous — you can also wipe everything later with
          the <span className="text-white/60">Erase &amp; compare again</span>{" "}
          button. See the{" "}
          <Link
            href="/about"
            target="_blank"
            className="underline hover:text-white/70"
          >
            privacy notice
          </Link>{" "}
          for details.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm tracking-wide uppercase hover:bg-white/90 disabled:opacity-50 transition-colors"
        >
          Continue →
        </button>
        <button
          type="button"
          onClick={skip}
          className="text-white/30 hover:text-white/70 text-xs uppercase tracking-[0.18em] underline-offset-4 hover:underline transition-colors"
        >
          Continue anonymously
        </button>
      </form>
    </div>
  );
}
