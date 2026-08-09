import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { DataFreshnessBanner } from "@/components/DataFreshnessBanner";
import { CommandPaletteLazy } from "@/components/CommandPaletteLazy";
import { dataFreshness } from "@/lib/data";
import { resolveSiteUrl } from "@/lib/siteUrl";
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
  metadataBase: resolveSiteUrl(),
  title: {
    default: "NBA Front Office | Cap, Contracts, Draft & Stats",
    template: "%s | NBA Front Office",
  },
  description:
    "Browse NBA draft pick ownership, salary-cap thresholds and aprons, player contracts, free-agent classes, team dashboards, and player stats.",
  applicationName: "NBA Front Office",
  openGraph: {
    title: "NBA Front Office | Cap, Contracts, Draft & Stats",
    description:
      "Draft pick ownership, salary-cap aprons, player contracts, free-agent classes, team dashboards, and stats.",
    type: "website",
    locale: "en_US",
    siteName: "NBA Front Office",
  },
  twitter: {
    card: "summary",
    title: "NBA Front Office",
    description:
      "NBA cap, contracts, draft capital, free agents, and player stats reference.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e13" },
  ],
  width: "device-width",
  initialScale: 1,
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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[100] focus:rounded-[var(--radius-sm)] focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <Nav updatedLabel={freshness.label} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 outline-none"
        >
          <DataFreshnessBanner updatedAt={freshness.updatedAt} />
          {children}
        </main>
        <footer className="border-t border-[var(--border)] px-4 py-4 text-center text-[12px] text-[var(--muted)] print:hidden">
          <p>
            {freshness.source} data · Updated {freshness.label} ·{" "}
            <Link
              href="/methodology"
              className="font-medium text-[var(--foreground)] hover:text-[var(--accent)]"
            >
              Sources &amp; methodology
            </Link>{" "}
            · Independent reference, not affiliated with the NBA.
          </p>
        </footer>
        <CommandPaletteLazy />
      </body>
    </html>
  );
}
