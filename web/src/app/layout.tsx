import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from '@/components/ThemeProvider';
import { ToasterClient } from '@/components/ToasterClient';
import { SignatureCurtain } from '@/components/signature/SignatureCurtain';
import { Analytics } from '@vercel/analytics/next';

// Wordmark glyphs ("Wesleygram") subsetted from Instagram Sans Bold and
// inlined as "wks-mark". The site loads Instagram Sans via next/font/local,
// which registers it under a hashed family name the signature curtain can't
// gate on — so the curtain paints from this dedicated face instead, giving a
// hard no-swap guarantee (see components/signature/signature.config.js).
const wksMarkFontFace =
  "@font-face{font-family:'wks-mark';font-weight:100 900;font-style:normal;" +
  "font-display:block;src:url(data:font/woff2;base64,d09GMgABAAAAAATEAA0AAAAACKQAAARzAAQAgwAAAAAAAAAAAAAAAAAAAAAAAAAAGhYbgjAcKgZgAGQKhiiFCQE2AiQDKAsWAAQgBYMMByAbCgdRlE7OLBRfHPBkqHFDFIG22ohM82rpRGgJJ6hh8H28IgRxdhYP/92b972ZTemdA7KYag0kIBFO55wIhZb5z9Hc7jcsDaLYRczaEibN60QsNUKlFVqCIHdXZSnWEgykiAKBOLH/CU//XTLmBqtwBiDNBKQfFPsfoF/1/1xTr5YW+fwjDHggw6j2O9oGlpp6QMMBjquozauBB8Jr22ysYf7CR+PQQ0wi9ukJCkwAUgijQmDMgTlqRF3vwJyi0AZGhfa/QOwy34YSAqFKI9KYC8SUirSkiUg9I8JwXCih9Kbi179howC0v7Q/ACCNl46tHzgHl9t+V7Z/JN3/VAkLsnbZk/Ev+BLXPYuUQsGQUWUb1iEPlaCnKm9EjQ4p6fiw3tbkj3RZ1TRrXfNpDvTIm28AV0vdWCAke5BtpA7lWaMgjNefAP48yMqL7grlxwVygng5wI4yEgULaLHcN+cemFFB4wFHorAEsoD5Jn+1ZqF55pppqgkF446ZdAGYQEd0AFABIYUZjb+ma6NrqelopOZs5mGA83FegSw5l8rPZUZdQ6rrLLsdqXZRo87YKBdfx6OvAkGhOVeUoy8jNGWJScQR4HYWxVWiFk0o6SqAzsKLV8p5e2bDlexsGM87R5F8duZZPKsRWnOFypC+CBMcprJHB69er/2sc9tHjboAwF3E6lgNkxjWs/Gztuufr0mqqFEeK+7aoOVyhAcUGneFxYw5AMyoa07szL149G6k2iWOOnatM8TL2HT8cTuA2ymKvHoVuCuMEo+2t8/GWTk4d86BE9TWRbunl+EWvLILl+Hpi3av7TDrNIOjOCotOSQ8LTJRW0kddbK+7+xMcnUON6uT0ouq2VxxR8braIF1sf9bicGM5Q+nXuebU2CEo6ppeW2sQYSirjokKraEFlSE+KdI1/A8nR7X+o6ri0yb4Dlm1HmJPqjfzayK0W9zG+/maZpbzraEO/PkOVJhVaxRnLAyRyrnhTu30AMvq2qrqs0TfAFIKx8rNX3w9ZsbphM2F2R7uD1A3xsIEoU6e/N6D5vGefGi4zJSIgcU4bTDLKWPA6cIVzjMKvdxCL+peJON/kF0ZHhENz/Ay/jo4Q3Lbf/7jLPLY/40uQ/8cHWbZWlZylT+jIlV+PJClE6SpGxJRrFfZrTDCBMTEcOGaSeHRsTUMBB0V7+h1PvklsN/RrQl1iWqzsRcD9vOAwAAQACgBoPJsbsXFOjTX0dI8gUAwJ1vqBwA4F5q0KH/eveuV04eBAQaQGS1PykMmnwGYWgAgT0qiuiHMHIrGBFa4EvYgjshB3f4BDKSAhqdBho9A2fCEIyxCMb8GPIiXzZeUTDsGS3qKF4BgLAhhDTiA4pLH6iO/KBnzX+JQw7SlD6HK+PTKFQh9LVjbmpuBvGmFWmrmaBUDhuj+/1GbCJfZgytmExYaA2QWVpQadKYRDR2YguEOAofx4JuOM+6bjsl0dLY1NQMa2OPzRpOx2jkX+9EtT7fFA9o3zE0Fj5v8tJMUUsnAAA=)" +
  " format('woff2')}";

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
  // Paint edge-to-edge under the notch / home indicator like a native app.
  viewportFit: "cover",
  // Blend the mobile browser/status bar into the app background so the chrome
  // disappears and it reads like a native screen rather than a web page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: wksMarkFontFace }} />
        <SignatureCurtain />
        <meta name="apple-mobile-web-app-title" content="Wesleygram" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
