"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

/**
 * Back link that prefers the browser history (the page the user
 * actually came from) and only falls back to `/ranking` when there is
 * no in-app history to go back to — for example when the aesthetic
 * page is opened in a fresh tab via a direct link, or after the user
 * accidentally closed their comparison flow.
 *
 * The previous version always hard-navigated to `/ranking`, which
 * silently destroyed the user's mental "I came from X" model and was
 * particularly bad when they came from /compare in the middle of a
 * ranking session.
 */
export function AestheticPageBackLink() {
  const router = useRouter();
  // `null` while we figure it out on the client; once mounted we know
  // whether there's any history to step back into.
  const [canGoBack, setCanGoBack] = useState<boolean | null>(null);

  useEffect(() => {
    // history.length is at least 1 (the current entry). Anything > 1
    // usually means we have somewhere to go back to. SPA-internal
    // navigations also bump it.
    setCanGoBack(typeof window !== "undefined" && window.history.length > 1);
  }, []);

  const label = canGoBack === false ? "View your ranking" : "Back";

  return (
    <button
      type="button"
      onClick={() => {
        if (canGoBack) {
          router.back();
        } else {
          router.push("/ranking");
        }
      }}
      className="inline-flex items-center gap-2 text-white/35 hover:text-white text-sm mb-6 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
      {label}
    </button>
  );
}
