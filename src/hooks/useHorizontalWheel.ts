"use client";

import { useEffect, useRef } from "react";

/**
 * Lets a horizontal scroll container respond to vertical mouse-wheel
 * scrolling. Without this, regular (non-trackpad) mice on Windows/desktop
 * can't move through the gallery strip even though the bar is clearly
 * scrollable.
 *
 * Attaches a native non-passive `wheel` listener so we can call
 * `preventDefault` and stop the page itself from scrolling when the user
 * intends to flip thumbnails.
 */
export function useHorizontalWheel<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onWheel(this: HTMLElement, e: WheelEvent) {
      // Trackpad horizontal gestures fire deltaX directly - leave those alone.
      // Only re-route when vertical wheel input is dominant.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      // Nothing to scroll horizontally - don't hijack the page scroll.
      if (this.scrollWidth <= this.clientWidth) return;
      e.preventDefault();
      this.scrollLeft += e.deltaY;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return ref;
}
