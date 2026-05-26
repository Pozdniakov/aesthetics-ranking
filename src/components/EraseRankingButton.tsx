"use client";

import { useState } from "react";
import { clearSessionAsync } from "@/lib/session";
import { ConfirmDialog } from "./ConfirmDialog";

interface EraseRankingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /** Custom callback to run instead of the default clear+navigate. */
  onErase?: () => void;
}

/**
 * Renders a button that, when clicked, opens a confirmation modal asking the
 * user to confirm erasing their existing ranking. On confirm it clears
 * the user's row from Supabase (GDPR right to erasure) AND wipes
 * localStorage, then navigates to /compare. If a custom `onErase` is
 * provided, the parent owns the cleanup flow instead.
 */
export function EraseRankingButton({
  children,
  onErase,
  ...buttonProps
}: EraseRankingButtonProps) {
  const [open, setOpen] = useState(false);
  const [erasing, setErasing] = useState(false);

  const handleConfirm = async () => {
    if (erasing) return;
    setErasing(true);
    if (onErase) {
      setOpen(false);
      onErase();
      return;
    }
    // Awaiting clearSessionAsync ensures the DELETE request lands before
    // we hard-navigate away. Without this await the navigation can abort
    // the in-flight fetch and the server row sticks around — defeating
    // the point of the "Erase" affordance under GDPR.
    await clearSessionAsync();
    window.location.href = "/compare";
  };

  return (
    <>
      <button
        type="button"
        {...buttonProps}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <ConfirmDialog
          title="Erase ranking?"
          body="Are you sure you want to erase your previous ranking and start a new comparison? This also deletes your data from the server and cannot be undone."
          confirmLabel={erasing ? "Erasing…" : "Erase & start over"}
          destructive
          onConfirm={handleConfirm}
          onCancel={erasing ? () => undefined : () => setOpen(false)}
        />
      )}
    </>
  );
}
