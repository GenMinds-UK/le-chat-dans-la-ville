"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/content/types";
import { clipUrl } from "./content";

export type ClipState = "idle" | "playing" | "missing";

// One clip at a time across the whole HUD.
let current: HTMLAudioElement | null = null;

// Plays /audio/<lang>/<id>.mp3 with a plain Audio element (GAME_PLAN.md 3.5).
// A missing clip or a blocked autoplay fails quietly: state goes to "missing"
// or back to "idle" and nothing is thrown.
export function useClip(lang: Lang | null, id: string | null) {
  const [state, setState] = useState<ClipState>("idle");
  const mine = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (!lang || !id || typeof Audio === "undefined") return;
    current?.pause();
    let audio: HTMLAudioElement;
    try {
      audio = new Audio(clipUrl(lang, id));
    } catch {
      setState("missing");
      return;
    }
    mine.current = audio;
    current = audio;
    const isMine = () => mine.current === audio;
    const done = () => {
      if (isMine()) setState((s) => (s === "playing" ? "idle" : s));
    };
    audio.addEventListener("ended", done);
    audio.addEventListener("pause", done);
    audio.addEventListener("error", () => {
      if (isMine()) setState("missing");
    });
    setState("playing");
    audio.play().catch((err: unknown) => {
      if (!isMine()) return;
      const name = (err as { name?: string } | null)?.name;
      // Autoplay blocked or interrupted: the clip may well exist, so stay usable.
      setState(name === "NotAllowedError" || name === "AbortError" ? "idle" : "missing");
    });
  }, [lang, id]);

  useEffect(
    () => () => {
      mine.current?.pause();
      mine.current = null;
    },
    [lang, id],
  );

  return { state, play };
}
