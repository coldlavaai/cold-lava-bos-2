import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { DynamicFavicon } from "@/components/layout/dynamic-favicon";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Optimized font loading with next/font - eliminates FOUT/FOIT
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: true,
});

export const metadata: Metadata = {
  title: "Cold Lava BOS - Business Operations System",
  description: "Enterprise business operations platform by Cold Lava",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cold Lava BOS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">
        <DynamicFavicon />
        <Providers>{children}</Providers>
        <Toaster position="top-right" theme="dark" />
        <OfflineBanner />
        <SpeedInsights />
      </body>
    </html>
  );
}
