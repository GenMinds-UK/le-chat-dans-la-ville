"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/state/gameStore";
import LanguagePicker from "./LanguagePicker";
import { langInfo } from "./content";
import { Panel, PxButton } from "./ui";

// Pixel "M" on a 7x5 grid, one Mistral band colour per row (yellow top, red bottom).
const MISTRAL_M: number[][] = [
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
];
const MISTRAL_BANDS = ["#ffd800", "#ffaf00", "#ff8205", "#fa500f", "#e10500"];

/** "Built with Mistral Vibe" mark, pinned to the bottom of the landing / login screen. */
export function VibeBadge() {
  return (
    <footer className="vibe-badge">
      <svg className="vibe-mark" viewBox="0 0 7 5" aria-hidden="true" focusable="false">
        {MISTRAL_M.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={MISTRAL_BANDS[y]} />
            ) : null,
          ),
        )}
      </svg>
      <span>
        Built with <strong>Mistral&nbsp;Vibe</strong>
      </span>
    </footer>
  );
}

/** The game's name and the cat. The name stays in French whatever language is being learned. */
export function TitleHeader() {
  return (
    <header className="title-header">
      <span className="title-cat" role="img" aria-label="A cat" />
      <h1 lang="fr">Le chat dans la ville</h1>
      <p>Learn French, Spanish or German, one shop at a time.</p>
    </header>
  );
}

/**
 * What a signed-in player sees on the title screen: the language picker the
 * first time, a Play button after that.
 * Reads: user, lang. Writes: setLang, startGame.
 */
export function TitleMenu({ onSignOut }: { onSignOut?: () => void }) {
  const user = useGameStore((s) => s.user);
  const lang = useGameStore((s) => s.lang);
  const setLang = useGameStore((s) => s.setLang);
  const startGame = useGameStore((s) => s.startGame);
  const [picking, setPicking] = useState(false);
  const profileLoaded = useGameStore((s) => s.profileLoaded);
  const info = langInfo(lang);

  // Wait for the account's saved language, so a returning player is not asked again.
  if (!profileLoaded) {
    return (
      <Panel className="title-panel">
        <p className="hud-note">Loading your progress…</p>
      </Panel>
    );
  }

  if (!info || picking) {
    return (
      <Panel className="title-panel">
        <h2>Which language do you want to learn?</h2>
        <LanguagePicker
          current={lang}
          onPick={(code) => {
            setPicking(false);
            setLang(code);
            startGame();
          }}
        />
        <p className="hud-note">
          You can change it later from the menu. Progress is kept separately for each language.
        </p>
        {info && (
          <PxButton variant="quiet" onClick={() => setPicking(false)}>
            Back
          </PxButton>
        )}
      </Panel>
    );
  }

  return (
    <Panel className="title-panel">
      <p className="title-learning">
        You are learning{" "}
        <strong lang={info.code}>{info.native}</strong> ({info.english}).
      </p>
      <PxButton className="title-play" onClick={startGame} autoFocus>
        Play
      </PxButton>
      <div className="title-links">
        <PxButton variant="quiet" onClick={() => setPicking(true)}>
          Change language
        </PxButton>
        {onSignOut && (
          <PxButton variant="quiet" onClick={onSignOut}>
            Sign out
          </PxButton>
        )}
      </div>
      {user?.email && <p className="hud-note">Signed in as {user.email}</p>}
    </Panel>
  );
}
