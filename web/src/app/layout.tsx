import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToasterClient } from '@/components/ToasterClient';
import { Analytics } from '@vercel/analytics/next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wesleygram.com";
const siteName = "Wesleygram";
const siteDescription = "Everyone's Wesley.";

const instagramSans = localFont({
  src: [
    {
      path: "./fonts/Instagram Sans.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Instagram Sans Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Instagram Sans Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Instagram Sans Light.ttf",
      weight: "300",
      style: "normal",
    },
  ],
  variable: "--font-instagram",
});

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: siteUrl,
    siteName,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Wesleygram – Instagram profile search",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
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
      <head>
        <meta name="apple-mobile-web-app-title" content="Wesleygram" />
      </head>
      <body className={`${instagramSans.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ToasterClient />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
