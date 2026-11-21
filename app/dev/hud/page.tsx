import { notFound } from "next/navigation";
import HudPreview from "./HudPreview";

export const metadata = { title: "HUD preview" };

// Development only: every HUD state, driven by buttons that set store values
// by hand. No sign-in, no Phaser, and no voice session is ever opened here.
export default function HudPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HudPreview />;
}
