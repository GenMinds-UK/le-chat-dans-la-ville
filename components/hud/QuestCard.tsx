"use client";

import { useState, type ReactNode } from "react";
import { VENUE_ORDER, currentQuestVenue } from "@/content";
import { useGameStore } from "@/lib/state/gameStore";
import { labelFromId, langInfo, safeVenue } from "./content";
import { Panel, PxButton, PxImg, cx } from "./ui";

/**
 * Top-left card. In town: the current quest (English) or the all-done message,
 * with a star per shop. In a shop: the shop's name and what to do there.
 * Reads: scene, lang, activeVenueId, completedVenues. Writes: leaveVenue (only
 * as the way out of a shop whose content is missing).
 */
export default function QuestCard() {
  const scene = useGameStore((s) => s.scene);
  const lang = useGameStore((s) => s.lang);
  const activeVenueId = useGameStore((s) => s.activeVenueId);
  const completed = useGameStore((s) => s.completedVenues);
  const leaveVenue = useGameStore((s) => s.leaveVenue);
  const [open, setOpen] = useState(true);

  let heading: string;
  let headingLang: string | undefined;
  let body: ReactNode;

  if (scene === "venue" && activeVenueId) {
    const venue = safeVenue(lang, activeVenueId);
    if (venue) {
      heading = venue.name;
      headingLang = venue.lang;
      body = (
        <>
          <p>{venue.quest}</p>
          <p className="hud-note">
            Walk up to things to learn their names, then talk to{" "}
            <span lang={venue.lang}>{venue.npc.name}</span>
            {completed.includes(venue.id) ? " again whenever you like." : "."}
          </p>
        </>
      );
    } else {
      heading = labelFromId(activeVenueId);
      body = (
        <>
          <p>
            This shop is not ready in {langInfo(lang)?.english ?? "this language"} yet.
          </p>
          <PxButton onClick={leaveVenue}>Back to town</PxButton>
        </>
      );
    }
  } else {
    const questId = currentQuestVenue(completed);
    const venue = safeVenue(lang, questId);
    if (!questId) {
      heading = "All done!";
      body = (
        <p>
          You have finished every shop. Visit any of them again to practise, or open the vocab
          book from the menu to review your words.
        </p>
      );
    } else if (venue) {
      heading = "Quest";
      body = <p>{venue.quest}</p>;
    } else {
      heading = "Quest";
      body = (
        <p>
          The {labelFromId(questId).toLowerCase()} is not ready in{" "}
          {langInfo(lang)?.english ?? "this language"} yet. Explore the town for now.
        </p>
      );
    }
  }

  return (
    <Panel className={cx("quest-card", !open && "is-collapsed")}>
      <button
        type="button"
        className="quest-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={open ? "Hide" : "Show"}
      >
        <span className="quest-title" lang={headingLang}>
          {heading}
        </span>
        <span className="quest-stars" aria-label={`${completed.length} of ${VENUE_ORDER.length} shops complete`}>
          {VENUE_ORDER.map((id) => (
            <PxImg
              key={id}
              src="/game/ui/star.png"
              size={16}
              exact={1}
              className={cx("quest-star", !completed.includes(id) && "is-off")}
            />
          ))}
        </span>
        <span className="quest-toggle" aria-hidden="true">
          {open ? "-" : "+"}
        </span>
      </button>
      {open && <div className="quest-body">{body}</div>}
    </Panel>
  );
}
