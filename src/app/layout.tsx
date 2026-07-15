import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { DataFreshnessBanner } from "@/components/DataFreshnessBanner";
import { CommandPalette } from "@/components/CommandPalette";
import { dataFreshness } from "@/lib/data";
import { UI_PREFS_INIT_SCRIPT } from "@/lib/theme-shared";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NBA Front Office | Cap, Contracts, Draft & Stats",
  description:
    "Browse NBA draft pick ownership, salary-cap thresholds and aprons, player contracts, free-agent classes, team dashboards, and player stats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const freshness = dataFreshness();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: UI_PREFS_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Nav updatedLabel={freshness.label} />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <DataFreshnessBanner />
          {children}
        </main>
        <footer className="border-t border-[var(--border)] px-4 py-4 text-center text-[12px] text-[var(--muted)] print:hidden">
          <p>
            {freshness.source} data · Updated {freshness.label} · Independent reference, not affiliated with the NBA.
          </p>
        </footer>
        <CommandPalette />
      </body>
    </html>
  );
}
