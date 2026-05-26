"use client";

import { createClient } from "@/lib/supabase/client";

export const SESSION_KEY = "aesthetics_session_id";
export const DISPLAY_NAME_KEY = "aesthetics_display_name";
export const SHARE_URL_KEY = "aesthetics_share_url_v1";
export const LIKES_KEY = "aesthetics_likes_v2";
export const SWIPE_INDEX_KEY = "aesthetics_swipe_index_v2";
export const INSERTION_STATE_KEY = "aesthetics_insertion_state_v1";
export const INSERTION_POOL_KEY = "aesthetics_insertion_pool_v1";
export const SHUFFLE_SEED_KEY = "aesthetics_shuffle_seed_v1";

export const LOCAL_STORAGE_KEYS = [
  SESSION_KEY,
  DISPLAY_NAME_KEY,
  SHARE_URL_KEY,
  LIKES_KEY,
  SWIPE_INDEX_KEY,
  INSERTION_STATE_KEY,
  INSERTION_POOL_KEY,
  SHUFFLE_SEED_KEY,
];

/**
 * Best-effort server-side delete of the user's session row and (via the
 * ON DELETE CASCADE foreign key) all of their comparisons. Awaited by
 * `clearSessionAsync`; the synchronous `clearSession` wraps it in a
 * fire-and-forget call for callers that can't await (e.g. the Erase
 * button before a hard navigation).
 *
 * Requires the `sessions_delete` RLS policy from supabase/schema.sql.
 * Without it the request silently fails and only the local copy is
 * wiped — the user is still able to start fresh, just less cleanly.
 */
async function deleteServerSession(sessionId: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("ranking_sessions")
      .delete()
      .eq("id", sessionId);
    if (error) {
      console.warn("[clearSession] server delete failed:", error.message);
    }
  } catch (e) {
    console.warn("[clearSession] server delete threw:", e);
  }
}

/**
 * Async erase: deletes the server-side row first (so GDPR right-to-erasure
 * actually wipes the data, not just the local copy), then clears
 * localStorage. Prefer this when the caller can await before navigating
 * away.
 */
export async function clearSessionAsync(): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getStoredSessionId();
  if (sessionId) await deleteServerSession(sessionId);
  LOCAL_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

/**
 * Synchronous erase, kept for callers that can't await (e.g. UI handlers
 * that immediately navigate). Fires the server delete in the background
 * before wiping local state. The browser will keep the request alive
 * across the hard navigation in modern browsers.
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  const sessionId = getStoredSessionId();
  if (sessionId) {
    void deleteServerSession(sessionId);
  }
  LOCAL_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

export function getStoredShareUrl(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SHARE_URL_KEY);
}

export function setStoredShareUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  if (url) {
    localStorage.setItem(SHARE_URL_KEY, url);
  } else {
    localStorage.removeItem(SHARE_URL_KEY);
  }
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
