"use client";

import dynamic from "next/dynamic";
import AuthGate from "@/components/auth/AuthGate";
import Hud from "@/components/hud/Hud";
import LiveConversation from "@/components/hud/LiveConversation";
import { TitleHeader, TitleMenu } from "@/components/hud/TitleScreen";
import type { Venue } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import { signOut } from "@/lib/supabase/auth";
import { useProgressSync } from "@/lib/supabase/progress";

// Phaser needs the browser, so the game never renders on the server.
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

// Signing out fires SIGNED_OUT, AuthGate passes null to setUser, and the store
// resets to the title screen. If the request fails the player stays signed in.
const handleSignOut = () => {
  signOut().catch(() => {});
};

// Mounted only while venueMode is "talking" (Hud decides): this is what opens
// the voice session. Keyed so a different shop or language is a new session.
const renderConversation = (venue: Venue) => (
  <LiveConversation key={`${venue.lang}-${venue.id}`} venue={venue} />
);

function GameShell() {
  const user = useGameStore((s) => s.user);
  if (!user) return null; // signed-out users never see the game
  return (
    <div className="game-root">
      <div className="game-canvas">
        <PhaserGame />
      </div>
      <Hud renderConversation={renderConversation} onSignOut={handleSignOut} />
    </div>
  );
}

// Flow (GAME_PLAN.md 3.6): title -> sign in / sign up -> language picker if
// lang is null -> startGame() -> the game with the HUD over it.
export default function Home() {
  const scene = useGameStore((s) => s.scene);
  const setUser = useGameStore((s) => s.setUser);
  const onTitle = scene === "title";
  // Loads the account's language and progress on sign-in and saves as the player goes.
  useProgressSync();

  return (
    <div className={onTitle ? "app app-title" : "app app-game"}>
      {onTitle && <TitleHeader />}
      {/* AuthGate keeps its place in the tree in both states so the auth
          subscription survives the move from title to game. */}
      <div className="app-body">
        <AuthGate onUser={setUser}>
          {onTitle ? <TitleMenu onSignOut={handleSignOut} /> : <GameShell />}
        </AuthGate>
      </div>
    </div>
  );
}
