"use client";

import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "aesthetics_session_id";
const DISPLAY_NAME_KEY = "aesthetics_display_name";

export function clearSession(): void {
  if (typeof window === "undefined") return;
  const keys = [
    SESSION_KEY,
    DISPLAY_NAME_KEY,
    "aesthetics_likes_v2",
    "aesthetics_swipe_index_v2",
    "aesthetics_insertion_state_v1",
    "aesthetics_insertion_pool_v1",
    "aesthetics_shuffle_seed_v1",
  ];
  keys.forEach((k) => localStorage.removeItem(k));
}

export function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setStoredSessionId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, id);
}

export function getStoredDisplayName(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(DISPLAY_NAME_KEY);
  return v && v.trim() ? v : null;
}

export function setStoredDisplayName(name: string | null): void {
  if (typeof window === "undefined") return;
  const trimmed = name?.trim() ?? "";
  if (trimmed) {
    localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
  } else {
    localStorage.removeItem(DISPLAY_NAME_KEY);
  }
}

/**
 * Persist the display name to the given session row in Supabase. Best-effort:
 * if the `display_name` column does not exist yet (migration not applied),
 * the failure is swallowed so the comparing flow keeps working.
 */
export async function persistDisplayName(
  sessionId: string,
  name: string | null
): Promise<void> {
  const trimmed = name?.trim() ?? "";
  const supabase = createClient();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("ranking_sessions")
      .update({ display_name: trimmed || null })
      .eq("id", sessionId);
    if (error) {
      console.warn(
        "[persistDisplayName] update skipped:",
        error.message ?? error
      );
    }
  } catch (e) {
    console.warn("[persistDisplayName] update skipped:", e);
  }
}

/**
 * Returns the current session ID, creating a new anonymous session in
 * Supabase if none exists. No authentication required.
 */
export async function getOrCreateSession(): Promise<string> {
  const supabase = createClient();

  // Reuse existing session if it's still in the DB
  const storedId = getStoredSessionId();
  if (storedId) {
    const { data } = await supabase
      .from("ranking_sessions")
      .select("id")
      .eq("id", storedId)
      .single();
    if (data) return storedId;
  }

  // Create a new anonymous session row (no user_id needed). We don't include
  // optional fields like display_name here so the insert keeps working even
  // before pending schema migrations are applied — display_name is set via a
  // separate, best-effort UPDATE in `persistDisplayName`.
  const { data: session, error } = await supabase
    .from("ranking_sessions")
    .insert({ user_id: null })
    .select("id")
    .single();

  if (error || !session) {
    throw new Error(
      `Failed to create session: ${error?.message ?? "no data"} (code: ${error?.code})`
    );
  }

  setStoredSessionId(session.id);

  // Try to attach a previously-entered display name to the new session row.
  const storedName = getStoredDisplayName();
  if (storedName) {
    await persistDisplayName(session.id, storedName);
  }

  return session.id;
}
