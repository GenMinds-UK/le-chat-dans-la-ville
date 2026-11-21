"use client";

import { useEffect } from "react";
import { isLang, isVenueId } from "@/content";
import type { Lang, VenueId } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import { getSupabaseBrowser } from "./client";

// Store <-> Supabase sync (GAME_PLAN.md phase 3). The store stays the source of
// truth while playing: every save is best-effort, so the game keeps working if
// one fails. Row-level security limits each query to the signed-in user's rows.

type Progress = { completedVenues: VenueId[]; vocabSeen: string[] };

async function loadProgress(userId: string, lang: Lang): Promise<Progress> {
  const db = getSupabaseBrowser();
  const [venues, vocab] = await Promise.all([
    db
      .from("venue_progress")
      .select("venue_id, completed_at")
      .eq("user_id", userId)
      .eq("lang", lang)
      .not("completed_at", "is", null),
    db.from("vocab_seen").select("vocab_id").eq("user_id", userId).eq("lang", lang),
  ]);
  if (venues.error) throw venues.error;
  if (vocab.error) throw vocab.error;
  return {
    completedVenues: (venues.data ?? []).map((r) => r.venue_id).filter(isVenueId),
    vocabSeen: (vocab.data ?? []).map((r) => r.vocab_id as string),
  };
}

const warn = (what: string) => (err: unknown) => console.warn(`[progress] ${what} failed:`, err);

// Supabase query builders are thenables that resolve with { error } rather than rejecting.
async function run(what: string, query: PromiseLike<{ error: unknown }>) {
  try {
    const { error } = await query;
    if (error) warn(what)(error);
  } catch (err) {
    warn(what)(err);
  }
}

/** Starts syncing the game store with the signed-in user's rows. Returns a stop function. */
export function startProgressSync(): () => void {
  const store = useGameStore;
  // What is already in the database for the current user + language.
  let savedVocab = new Set<string>();
  let savedVenues = new Set<VenueId>();
  let hydrating = false;
  let generation = 0; // bumps on every load, so a stale load never lands

  const hydrate = (lang: Lang | null, p: Progress) => {
    savedVocab = new Set(p.vocabSeen);
    savedVenues = new Set(p.completedVenues);
    hydrating = true;
    try {
      store.getState().hydrateProgress({ lang, ...p });
    } finally {
      hydrating = false;
    }
    // Anything done locally while the load was in flight is saved now.
    saveNew(store.getState());
  };

  const loadForUser = async (userId: string) => {
    const gen = ++generation;
    const empty: Progress = { completedVenues: [], vocabSeen: [] };
    try {
      const { data, error } = await getSupabaseBrowser()
        .from("profiles")
        .select("lang")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      const lang = isLang(data?.lang) ? data.lang : null;
      const progress = lang ? await loadProgress(userId, lang) : empty;
      if (gen === generation) hydrate(lang, progress);
    } catch (err) {
      warn("load")(err);
      // Let the player in anyway; they pick a language and play unsaved-progress-first.
      if (gen === generation) hydrate(store.getState().lang, empty);
    }
  };

  const switchLang = async (userId: string, lang: Lang) => {
    const gen = ++generation;
    savedVocab = new Set();
    savedVenues = new Set();
    await run(
      "save language",
      getSupabaseBrowser().from("profiles").upsert({ user_id: userId, lang }, { onConflict: "user_id" })
    );
    try {
      const progress = await loadProgress(userId, lang);
      if (gen === generation && store.getState().lang === lang) hydrate(lang, progress);
    } catch (err) {
      warn("load language progress")(err);
    }
  };

  function saveNew(s: ReturnType<typeof store.getState>) {
    const { user, lang } = s;
    if (!user || !lang || !s.profileLoaded) return;
    const db = getSupabaseBrowser();
    const now = new Date().toISOString();

    const newVocab = s.vocabSeen.filter((id) => !savedVocab.has(id));
    if (newVocab.length) {
      newVocab.forEach((id) => savedVocab.add(id));
      void run(
        "save vocab",
        db.from("vocab_seen").upsert(
          newVocab.map((vocab_id) => ({ user_id: user.id, lang, vocab_id, last_seen: now })),
          { onConflict: "user_id,lang,vocab_id" }
        )
      );
    }

    const newVenues = s.completedVenues.filter((id) => !savedVenues.has(id));
    if (newVenues.length) {
      newVenues.forEach((id) => savedVenues.add(id));
      void run(
        "save venue",
        db.from("venue_progress").upsert(
          newVenues.map((venue_id) => ({ user_id: user.id, lang, venue_id, completed_at: now })),
          { onConflict: "user_id,lang,venue_id" }
        )
      );
    }
  }

  const bumpAttempts = async (userId: string, lang: Lang, venueId: VenueId) => {
    try {
      const db = getSupabaseBrowser();
      const { data, error } = await db
        .from("venue_progress")
        .select("attempts")
        .eq("user_id", userId)
        .eq("lang", lang)
        .eq("venue_id", venueId)
        .maybeSingle();
      if (error) throw error;
      await run(
        "save attempt",
        db
          .from("venue_progress")
          .upsert(
            { user_id: userId, lang, venue_id: venueId, attempts: (data?.attempts ?? 0) + 1 },
            { onConflict: "user_id,lang,venue_id" }
          )
      );
    } catch (err) {
      warn("save attempt")(err);
    }
  };

  const unsubscribe = store.subscribe((s, prev) => {
    if (hydrating) return;

    if (s.user?.id !== prev.user?.id) {
      generation++;
      savedVocab = new Set();
      savedVenues = new Set();
      if (s.user) void loadForUser(s.user.id);
      return;
    }
    if (!s.user || !s.profileLoaded) return;

    if (s.lang && s.lang !== prev.lang) {
      void switchLang(s.user.id, s.lang);
      return;
    }

    if (s.vocabSeen !== prev.vocabSeen || s.completedVenues !== prev.completedVenues) saveNew(s);

    if (s.venueMode === "talking" && prev.venueMode !== "talking" && s.lang && s.activeVenueId) {
      void bumpAttempts(s.user.id, s.lang, s.activeVenueId);
    }
  });

  // The auth watcher may have set the user before we subscribed.
  const now = store.getState();
  if (now.user && !now.profileLoaded) void loadForUser(now.user.id);

  return () => {
    generation++;
    unsubscribe();
  };
}

/** Mount once near the top of the page, above anything that reads progress. */
export function useProgressSync() {
  useEffect(() => startProgressSync(), []);
}
