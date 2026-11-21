"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import type { Lang } from "@/content/types";
import { useClip } from "./useClip";
import { useKeyCapture } from "./useKeyCapture";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** 9-slice panel from /game/ui/panel.png. */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("px-panel", className)} {...rest} />;
}

/** 9-slice button from /game/ui/button.png and button_pressed.png. */
export function PxButton({
  className,
  variant = "primary",
  type = "button",
  ...rest
}: ComponentProps<"button"> & { variant?: "primary" | "quiet" }) {
  return (
    <button
      type={type}
      className={cx("px-btn", variant === "quiet" && "px-btn-quiet", className)}
      {...rest}
    />
  );
}

/**
 * Pixel art at a whole-number scale. By default one art pixel is `scale` times
 * the HUD scale (--px); `exact` ignores --px and uses that many CSS pixels per
 * art pixel. Keep both whole numbers. Hides the image if the file is missing,
 * keeping its box.
 */
export function PxImg({
  src,
  size,
  scale = 1,
  exact,
  alt = "",
  className,
}: {
  src: string;
  size: number;
  scale?: number;
  exact?: number;
  alt?: string;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const vars: Record<string, number> = exact ? { "--w": size, "--s": exact } : { "--w": size, "--k": scale };
  const style = vars as CSSProperties;
  return (
    <span className={cx("px-img", className)} style={style}>
      {failedSrc !== src && (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          draggable={false}
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}

function SpeakerIcon() {
  // 16x16 pixel grid, drawn with crisp edges (there is no speaker sprite in ui/).
  return (
    <svg className="speaker-icon" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 6h3v4H2zM5 5h1v6H5zM6 4h1v8H6zM7 3h1v10H7zM10 6h1v4h-1zM12 4h1v8h-1zM11 5h1v1h-1zM11 10h1v1h-1z"
      />
    </svg>
  );
}

/**
 * Plays the pronunciation clip for a vocab id. Give it a `key` of the id where
 * the id can change, so each word gets a fresh button.
 */
export function SpeakerButton({
  lang,
  id,
  term,
  label,
  autoPlay = false,
  className,
}: {
  lang: Lang | null;
  id: string;
  term: string;
  label?: ReactNode;
  autoPlay?: boolean;
  className?: string;
}) {
  const { state, play } = useClip(lang, id);

  useEffect(() => {
    if (autoPlay) play();
  }, [autoPlay, play]);

  return (
    <button
      type="button"
      className={cx(
        "px-btn",
        "speaker-btn",
        !label && "px-btn-icon",
        state === "playing" && "is-playing",
        state === "missing" && "is-missing",
        className,
      )}
      onClick={play}
      aria-label={`Listen to "${term}"`}
      title={state === "missing" ? "No recording for this word yet" : "Listen"}
    >
      <SpeakerIcon />
      {label && <span>{label}</span>}
    </button>
  );
}

/** Centred modal over a dimmed game. Escape or a click on the dimmed area closes it. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useKeyCapture(true, (e) => {
    if (e.key === "Escape") onClose();
  });
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className="hud-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Panel
        className={cx("hud-modal", wide && "hud-modal-wide")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="hud-modal-head">
          <h2>{title}</h2>
          <PxButton ref={closeRef} variant="quiet" onClick={onClose}>
            Close
          </PxButton>
        </div>
        <div className="hud-modal-body">{children}</div>
        {footer && <div className="hud-modal-foot">{footer}</div>}
      </Panel>
    </div>
  );
}

export { cx };
