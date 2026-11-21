"use client";

import { useEffect, type ReactNode } from "react";
import type { Venue } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import ItemPopup from "./ItemPopup";
import Menu from "./Menu";
import QuestCard from "./QuestCard";
import VenueComplete from "./VenueComplete";
import { labelFromId, langInfo, safeVenue } from "./content";
import { useHudUi } from "./hudUi";
import { Panel, PxButton } from "./ui";

/** The shop's name, shown for a few seconds on walking in. */
function VenueBanner({ venue }: { venue: Venue }) {
  return (
    <div className="venue-banner" aria-hidden="true">
      <Panel>
        <span className="venue-banner-name" lang={venue.lang}>
          {venue.name}
        </span>
        <span className="venue-banner-en">{labelFromId(venue.id)}</span>
      </Panel>
    </div>
  );
}

/** One line of on-screen help; the full list is under Menu > How to play. */
function ControlsHelp({ inVenue }: { inVenue: boolean }) {
  return (
    <div className="controls-help">
      <span>
        <kbd>Arrows</kbd>/<kbd>WASD</kbd> move
      </span>
      <span>
        <kbd>E</kbd>/<kbd>Space</kbd> or tap: {inVenue ? "look, talk" : "interact"}
      </span>
    </div>
  );
}

/**
 * The whole in-game overlay. It sits over the Phaser canvas and lets pointer
 * input through everywhere except where a panel is.
 *
 * It decides what shows from the store alone:
 *   town                         quest card, menu button, controls help
 *   venue + explore              the same, plus the shop banner
 *   inspectedItemId set          item pop-up
 *   venue + talking              renderConversation(venue), and nothing else
 *   justCompletedVenueId set     venue-complete screen
 *
 * renderConversation is a prop so that this file never imports the voice hook:
 * the app passes <LiveConversation> (opens a voice session on mount), the dev
 * preview passes <ConversationHud> with fake controls.
 */
export default function Hud({
  renderConversation,
  onSignOut,
}: {
  renderConversation: (venue: Venue) => ReactNode;
  onSignOut?: () => void;
}) {
  const scene = useGameStore((s) => s.scene);
  const lang = useGameStore((s) => s.lang);
  const activeVenueId = useGameStore((s) => s.activeVenueId);
  const venueMode = useGameStore((s) => s.venueMode);
  const inspectedItemId = useGameStore((s) => s.inspectedItemId);
  const justCompleted = useGameStore((s) => s.justCompletedVenueId);
  const endConversation = useGameStore((s) => s.endConversation);
  const panel = useHudUi((s) => s.panel);
  const openPanel = useHudUi((s) => s.open);
  const closePanel = useHudUi((s) => s.close);

  const inVenue = scene === "venue" && activeVenueId !== null;
  const venue = inVenue ? safeVenue(lang, activeVenueId) : null;
  const talking = inVenue && venueMode === "talking" && !justCompleted;
  const busy = talking || justCompleted !== null;

  // Menu panels never sit on top of a conversation or the completion screen,
  // and do not outlive the HUD.
  useEffect(() => {
    if (busy) closePanel();
  }, [busy, closePanel]);
  useEffect(() => closePanel, [closePanel]);

  if (scene === "title") return null;

  return (
    <div className="hud-root">
      <div className="hud-layer">
        {/* Outside the block below so it plays once per visit, not after every conversation. */}
        {venue && !justCompleted && <VenueBanner key={`${venue.lang}-${venue.id}`} venue={venue} />}

        {!busy && (
          <>
            <div className="hud-top">
              <QuestCard />
              <PxButton
                className="menu-button"
                onClick={() => openPanel("menu")}
                aria-haspopup="dialog"
              >
                Menu
              </PxButton>
            </div>
            {!inspectedItemId && !panel && <ControlsHelp inVenue={inVenue} />}
            <ItemPopup />
            <Menu onSignOut={onSignOut} />
          </>
        )}

        {talking &&
          (venue ? (
            renderConversation(venue)
          ) : (
            <div className="hud-backdrop hud-backdrop-clear">
              <Panel className="hud-modal">
                <p>
                  This conversation is not ready in {langInfo(lang)?.english ?? "this language"} yet.
                </p>
                <PxButton onClick={endConversation}>Back to the shop</PxButton>
              </Panel>
            </div>
          ))}

        <VenueComplete />
      </div>
    </div>
  );
}
