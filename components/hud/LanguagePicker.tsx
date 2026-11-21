"use client";

import { LANGS } from "@/content";
import type { Lang } from "@/content/types";
import { cx } from "./ui";

/** Each language by its own name and in English. Presentational: the caller decides what a pick does. */
export default function LanguagePicker({
  current,
  onPick,
}: {
  current: Lang | null;
  onPick: (lang: Lang) => void;
}) {
  return (
    <ul className="lang-picker">
      {LANGS.map((l) => (
        <li key={l.code}>
          <button
            type="button"
            className={cx("px-btn", "lang-option", current === l.code && "is-current")}
            aria-pressed={current === l.code}
            onClick={() => onPick(l.code)}
          >
            <span className="lang-native" lang={l.code}>
              {l.native}
            </span>
            <span className="lang-english">{l.english}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
