"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/lib/state/gameStore";
import { findVocab, itemIconUrl, labelFromId, safeVenue } from "./content";
import { Panel, PxButton, PxImg, SpeakerButton } from "./ui";
import { useKeyCapture } from "./useKeyCapture";

/**
 * Open while inspectedItemId is set: icon, the word in the target language,
 * English, and a speaker button. The clip plays once on opening.
 * Closes with the button, Escape, E, Space or a tap outside.
 * Reads: inspectedItemId, lang, activeVenueId. Writes: closeItem.
 */
export default function ItemPopup() {
  const itemId = useGameStore((s) => s.inspectedItemId);
  if (!itemId) return null;
  return <ItemPopupBody key={itemId} itemId={itemId} />;
}

function ItemPopupBody({ itemId }: { itemId: string }) {
  const lang = useGameStore((s) => s.lang);
  const activeVenueId = useGameStore((s) => s.activeVenueId);
  const closeItem = useGameStore((s) => s.closeItem);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openedAt = useRef(0);

  const entry = findVocab(lang, itemId, safeVenue(lang, activeVenueId));

  useEffect(() => {
    openedAt.current = performance.now();
    closeRef.current?.focus();
  }, []);

  useKeyCapture(true, (e) => {
    if (e.key === "Escape" || e.key === "e" || e.key === "E" || e.key === " ") {
      e.preventDefault();
      closeItem();
    }
  });

  return (
    <div
      className="hud-backdrop hud-backdrop-clear"
      onClick={(e) => {
        // The tap that opened the pop-up must not also close it.
        if (e.target === e.currentTarget && performance.now() - openedAt.current > 300) closeItem();
      }}
    >
      <Panel className="item-popup" role="dialog" aria-modal="true" aria-label="Object">
        {entry ? (
          <>
            {entry.icon && (
              <div className="item-icon">
                <PxImg src={itemIconUrl(entry.icon)} size={16} scale={2} />
              </div>
            )}
            <p className="item-term" lang={lang ?? undefined}>
              {entry.term}
            </p>
            <p className="item-en">{entry.en}</p>
            <div className="item-actions">
              <SpeakerButton lang={lang} id={entry.id} term={entry.term} label="Listen" autoPlay />
              <PxButton ref={closeRef} variant="quiet" onClick={closeItem}>
                Close
              </PxButton>
            </div>
            <p className="hud-note item-added">Added to your vocab book.</p>
          </>
        ) : (
          <>
            <p className="item-en">{labelFromId(itemId)}</p>
            <p className="hud-note">This word is not ready yet.</p>
            <div className="item-actions">
              <PxButton ref={closeRef} onClick={closeItem}>
                Close
              </PxButton>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
