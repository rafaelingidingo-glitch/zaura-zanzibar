import type { Metadata, Viewport } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ZAURA ZANZIBAR — Luxury Serviced Apartments & Accommodation in Zanzibar",
    template: "%s | ZAURA ZANZIBAR",
  },
  description:
    "Discover Zaura Zanzibar — refined, private serviced apartments in Zanzibar, Tanzania. Contemporary comfort meets the timeless charm of Zanzibar. Request your stay via WhatsApp.",
  keywords: [
    "accommodation in Zanzibar",
    "apartments in Zanzibar",
    "serviced apartments Zanzibar",
    "Zanzibar accommodation booking",
    "luxury stay Zanzibar",
    "Zaura Zanzibar",
    "Zanzibar Tanzania apartments",
  ],
  authors: [{ name: "Zaura Zanzibar" }],
  creator: "Zaura Zanzibar",
  openGraph: {
    title: "ZAURA ZANZIBAR — Your Private Escape in Zanzibar",
    description:
      "Experience a refined stay where contemporary comfort meets the timeless charm of Zanzibar. Private serviced apartments, thoughtfully designed for an unforgettable island stay.",
    url: siteUrl,
    siteName: "ZAURA ZANZIBAR",
    images: [{ url: "/brand/og-image.png", width: 1440, height: 720, alt: "Zaura Zanzibar — luxury serviced apartments" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZAURA ZANZIBAR — Your Private Escape in Zanzibar",
    description: "Refined, private serviced apartments in Zanzibar, Tanzania. Request your stay via WhatsApp.",
    images: ["/brand/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: siteUrl },
};

export const viewport: Viewport = {
  themeColor: "#242522",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${jost.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
