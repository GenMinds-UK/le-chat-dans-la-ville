import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mistral voice agent",
  description: "Browser voice agent built on the Mistral Voice Agents API (Next.js)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
