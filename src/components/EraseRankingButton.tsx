"use client";

import { useState } from "react";
import { clearSession } from "@/lib/session";
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
 * localStorage state and navigates to /compare (or runs `onErase` if provided).
 */
export function EraseRankingButton({
  children,
  onErase,
  ...buttonProps
}: EraseRankingButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    if (onErase) {
      onErase();
      return;
    }
    clearSession();
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
          body="Are you sure you want to erase your previous ranking and start a new comparison? This cannot be undone."
          confirmLabel="Erase & start over"
          destructive
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
