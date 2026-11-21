"use client";

import { useEffect, useRef } from "react";
import { VENUE_ORDER } from "@/content";
import { useGameStore } from "@/lib/state/gameStore";
import { labelFromId, safeVenue } from "./content";
import { Panel, PxButton, PxImg, SpeakerButton } from "./ui";
import { useKeyCapture } from "./useKeyCapture";

/**
 * Shown while justCompletedVenueId is set: the star, what was learned, and the
 * way back to town.
 * Reads: justCompletedVenueId, lang, completedVenues. Writes: leaveVenue.
 */
export default function VenueComplete() {
  const venueId = useGameStore((s) => s.justCompletedVenueId);
  const lang = useGameStore((s) => s.lang);
  const completed = useGameStore((s) => s.completedVenues);
  const leaveVenue = useGameStore((s) => s.leaveVenue);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Keys stay with this screen; Enter or Space on the focused button leaves.
  useKeyCapture(venueId !== null, () => {});
  useEffect(() => {
    if (venueId) buttonRef.current?.focus();
  }, [venueId]);

  if (!venueId) return null;
  const venue = safeVenue(lang, venueId);
  const allDone = VENUE_ORDER.every((id) => completed.includes(id));
  const nextVenue = venue?.unlocks ? safeVenue(lang, venue.unlocks) : null;

  return (
    <div className="hud-backdrop">
      <Panel className="hud-modal complete" role="dialog" aria-modal="true" aria-label="Shop complete">
        <div className="complete-star">
          <PxImg src="/game/ui/star.png" size={16} scale={2} />
        </div>
        <h2>Shop complete!</h2>
        <p className="complete-venue" lang={venue?.lang}>
          {venue?.name ?? labelFromId(venueId)}
        </p>

        {venue && (
          <div className="hud-modal-body complete-body">
            <h3>You did it all</h3>
            <ul className="complete-goals">
              {venue.objectives.map((o) => (
                <li key={o.id}>
                  <PxImg src="/game/ui/check_on.png" size={12} />
                  <span>{o.text}</span>
                </li>
              ))}
            </ul>
            {venue.phrases.length > 0 && (
              <>
                <h3>Phrases added to your vocab book</h3>
                <ul className="vocab-list">
                  {venue.phrases.map((p) => (
                    <li key={p.id} className="vocab-row">
                      <SpeakerButton lang={venue.lang} id={p.id} term={p.term} />
                      <span className="vocab-term" lang={venue.lang}>
                        {p.term}
                      </span>
                      <span className="vocab-en">{p.en}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <p className="complete-next">
          {allDone ? (
            "That was the last shop. You have finished the whole town!"
          ) : venue?.unlocks ? (
            <>
              New shop unlocked:{" "}
              <strong lang={nextVenue?.lang}>{nextVenue?.name ?? labelFromId(venue.unlocks)}</strong>
            </>
          ) : (
            "Head back to town for your next quest."
          )}
        </p>
        <PxButton ref={buttonRef} onClick={leaveVenue}>
          Back to town
        </PxButton>
      </Panel>
    </div>
  );
}
