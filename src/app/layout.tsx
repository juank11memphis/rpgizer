import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPGizer — Turn Goals into Adventures",
  description:
    "Turn real-life goals into playable adventures with quests, boss fights, skills, inventory, achievements, and clear next actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
