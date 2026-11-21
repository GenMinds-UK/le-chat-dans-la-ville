"use client";

import { useGameStore } from "@/lib/state/gameStore";
import LanguagePicker from "./LanguagePicker";
import VocabBook from "./VocabBook";
import { langInfo } from "./content";
import { useHudUi } from "./hudUi";
import { Modal, PxButton } from "./ui";

/** The controls, spelled out. Also shown as a one-line strip by ControlsHelp. */
export function ControlsList() {
  return (
    <dl className="controls-list">
      <dt>Move</dt>
      <dd>
        <kbd>Arrow keys</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
      </dd>
      <dt>Look at an object</dt>
      <dd>
        Walk up to it and press <kbd>E</kbd> or <kbd>Space</kbd>, or tap it
      </dd>
      <dt>Talk to the shopkeeper</dt>
      <dd>
        Walk up and press <kbd>E</kbd> or <kbd>Space</kbd>, or tap. Then speak out loud: the
        conversation uses your microphone.
      </dd>
      <dt>Close a pop-up</dt>
      <dd>
        <kbd>E</kbd>, <kbd>Space</kbd> or <kbd>Esc</kbd>
      </dd>
      <dt>Leave a shop</dt>
      <dd>Walk onto the mat by the door</dd>
    </dl>
  );
}

/**
 * The menu and the panels it opens: vocab book, change language, how to play,
 * sign out. Which panel is open lives in useHudUi.
 * Reads: user, lang. Writes: setLang.
 */
export default function Menu({ onSignOut }: { onSignOut?: () => void }) {
  const panel = useHudUi((s) => s.panel);
  const open = useHudUi((s) => s.open);
  const close = useHudUi((s) => s.close);
  const user = useGameStore((s) => s.user);
  const lang = useGameStore((s) => s.lang);
  const setLang = useGameStore((s) => s.setLang);
  const info = langInfo(lang);

  if (panel === "vocab") return <VocabBook onClose={close} />;

  if (panel === "lang") {
    return (
      <Modal title="Change language" onClose={close}>
        <LanguagePicker
          current={lang}
          onPick={(code) => {
            setLang(code);
            close();
          }}
        />
        <p className="hud-note">
          Progress is kept separately for each language. Changing language takes you back to the
          town; nothing you have done in {info?.english ?? "this language"} is lost.
        </p>
      </Modal>
    );
  }

  if (panel === "help") {
    return (
      <Modal title="How to play" onClose={close}>
        <ControlsList />
      </Modal>
    );
  }

  if (panel === "menu") {
    return (
      <Modal title="Menu" onClose={close}>
        <div className="menu-list">
          <PxButton onClick={() => open("vocab")}>Vocab book</PxButton>
          <PxButton onClick={() => open("lang")}>
            Change language
            {info && (
              <span className="menu-sub">
                {" "}
                (<span lang={info.code}>{info.native}</span>)
              </span>
            )}
          </PxButton>
          <PxButton onClick={() => open("help")}>How to play</PxButton>
          {onSignOut && (
            <PxButton
              variant="quiet"
              onClick={() => {
                close();
                onSignOut();
              }}
            >
              Sign out
            </PxButton>
          )}
        </div>
        {user?.email && <p className="hud-note">Signed in as {user.email}</p>}
      </Modal>
    );
  }

  return null;
}
