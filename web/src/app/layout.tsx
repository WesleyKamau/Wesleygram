import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
