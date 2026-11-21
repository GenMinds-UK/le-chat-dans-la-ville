"use client";

import { VENUE_ORDER } from "@/content";
import type { Lang, VocabEntry } from "@/content/types";
import { useGameStore } from "@/lib/state/gameStore";
import { itemIconUrl, labelFromId, langInfo, safeVenue } from "./content";
import { Modal, PxImg, SpeakerButton, cx } from "./ui";

function Row({
  entry,
  icon,
  seen,
  lang,
}: {
  entry: VocabEntry;
  icon?: string;
  seen: boolean;
  lang: Lang;
}) {
  if (!seen) {
    return (
      <li className="vocab-row is-unseen">
        <span className="vocab-slot" aria-hidden="true" />
        <span className="vocab-term">? ? ?</span>
        <span className="vocab-en">Not found yet</span>
      </li>
    );
  }
  return (
    <li className="vocab-row">
      <SpeakerButton lang={lang} id={entry.id} term={entry.term} />
      {icon && <PxImg src={itemIconUrl(icon)} size={16} className="vocab-icon" />}
      <span className="vocab-term" lang={lang}>
        {entry.term}
      </span>
      <span className="vocab-en">{entry.en}</span>
    </li>
  );
}

/**
 * Every word and phrase for the current language, shop by shop. Words the
 * player has seen can be read and heard; the rest are placeholders.
 * Reads: lang, vocabSeen, completedVenues. Writes nothing.
 */
export default function VocabBook({ onClose }: { onClose: () => void }) {
  const lang = useGameStore((s) => s.lang);
  const vocabSeen = useGameStore((s) => s.vocabSeen);
  const completed = useGameStore((s) => s.completedVenues);
  const info = langInfo(lang);

  const venues = VENUE_ORDER.map((id) => ({ id, venue: safeVenue(lang, id) }));
  const all = venues.flatMap(({ venue }) => (venue ? [...venue.items, ...venue.phrases] : []));
  const seenCount = all.filter((e) => vocabSeen.includes(e.id)).length;

  return (
    <Modal title="Vocab book" onClose={onClose} wide>
      <p className="hud-note">
        {info ? (
          <>
            <span lang={info.code}>{info.native}</span> ({info.english}):{" "}
          </>
        ) : null}
        {seenCount} of {all.length} words found. Inspect objects in the shops and finish
        conversations to find more.
      </p>
      {lang &&
        venues.map(({ id, venue }) => (
          <section key={id} className="vocab-section">
            <h3>
              <span lang={venue?.lang}>{venue?.name ?? labelFromId(id)}</span>
              {completed.includes(id) && <PxImg src="/game/ui/star.png" size={16} exact={1} alt="Complete" />}
            </h3>
            {venue ? (
              <ul className={cx("vocab-list")}>
                {venue.items.map((i) => (
                  <Row key={i.id} entry={i} icon={i.icon} seen={vocabSeen.includes(i.id)} lang={lang} />
                ))}
                {venue.phrases.map((p) => (
                  <Row key={p.id} entry={p} seen={vocabSeen.includes(p.id)} lang={lang} />
                ))}
              </ul>
            ) : (
              <p className="hud-note">Coming soon.</p>
            )}
          </section>
        ))}
    </Modal>
  );
}
