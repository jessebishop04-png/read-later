import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter, Literata, Lora, Merriweather, Source_Sans_3 } from "next/font/google";
import { AppearanceInit } from "@/components/appearance-init";
import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/register-sw";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
});

const fontVariables = [
  literata.variable,
  sourceSans.variable,
  inter.variable,
  dmSans.variable,
  lora.variable,
  merriweather.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Read Later — personal library",
  description: "Save articles and videos, read distraction-free, sync your library.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Read Later",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
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
