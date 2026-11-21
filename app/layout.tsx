import type { Metadata, Viewport } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";

// Pixel font with lower case and full Western European coverage: the latin
// subset carries é è ê ç œ ñ ü ö ä ß ¿ ¡, which the vocabulary needs.
const pixelFont = Pixelify_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Le chat dans la ville",
  description:
    "A pixel-art town for learning French, Spanish or German: explore the shops, learn the words, then talk to the shopkeepers out loud.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b2233",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={pixelFont.variable}>
      <body>{children}</body>
    </html>
  );
}
