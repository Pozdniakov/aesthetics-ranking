import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Æsthetics ranking",
    template: "%s · Æsthetics ranking",
  },
  description:
    "Compare visual aesthetics side by side and discover your personal top 5.",
  // Allow crawlers to index the pages, but ask them not to surface the
  // images themselves in Google Images / Bing Images search. This keeps
  // the site from becoming an inadvertent free-asset gallery for content
  // we host on behalf of CARI / Are.na creators.
  robots: {
    index: true,
    follow: true,
    noimageindex: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-white font-sans">
        <header className="border-b border-white/5 backdrop-blur-md bg-neutral-950/80 sticky top-0 z-40">
          <nav className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
            <Link
              href="/"
              className="font-display text-white text-lg tracking-tight hover:opacity-80 transition-opacity"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100' }}
            >
              Æsthetics ranking
            </Link>
            <HeaderNav />
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-white/5 py-4 px-4 text-center">
          <p className="text-white/20 text-xs">
            Non-commercial research project
            <span className="mx-2 text-white/10">·</span>
            aesthetics from{" "}
            <a
              href="https://cari.institute/aesthetics"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/40 transition-colors"
            >
              CARI Institute
            </a>
            <span className="mx-2 text-white/10">·</span>
            built by{" "}
            <a
              href="https://pozdniakov.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white/40 transition-colors"
            >
              Ivan Pozdniakov
            </a>
            <span className="mx-2 text-white/10">·</span>
            <Link
              href="/about"
              className="underline hover:text-white/40 transition-colors"
            >
              about &amp; attribution
            </Link>
          </p>
        </footer>

        <Toaster theme="dark" />
      </body>
    </html>
  );
}
