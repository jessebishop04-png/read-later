import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Inter,
  Libre_Baskerville,
  Manrope,
  Source_Serif_4,
} from "next/font/google";
import { AppearanceInit } from "@/components/appearance-init";
import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/register-sw";
import "./globals.css";
import "./landing.css";

/** Sans 1 — Inter */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Sans 3 — Manrope (Satoshi loads via Fontshare link) */
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * Serif slots labeled Airif / Braveold / Cita Pro in the UI.
 * Free web-safe stand-ins until those commercial files are added under /public/fonts.
 */
const airif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-airif",
  display: "swap",
});

const braveold = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-braveold",
  display: "swap",
});

const citaPro = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cita-pro",
  display: "swap",
});

const fontVariables = [
  inter.variable,
  manrope.variable,
  airif.variable,
  braveold.variable,
  citaPro.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Keepr — personal library",
  description: "Save articles and videos, read distraction-free, sync your library.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Keepr",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Satoshi — Fontshare (free for web via their CDN) */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans">
        <AppearanceInit />
        <Providers>
          <RegisterServiceWorker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
