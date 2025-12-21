import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wesleygram.com";

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
  title: "Wesleygram",
  description: "Instagram Profile Search",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Wesleygram",
    description: "Search Instagram profiles quickly and cleanly.",
    url: siteUrl,
    siteName: "Wesleygram",
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
    title: "Wesleygram",
    description: "Search Instagram profiles quickly and cleanly.",
    images: ["/opengraph-image"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instagramSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
