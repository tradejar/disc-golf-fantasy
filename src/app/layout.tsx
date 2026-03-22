import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs';
import NavBar from '@/components/NavBar';
import ProfileSync from '@/components/ProfileSync';
import CookieNotice from '@/components/CookieNotice';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DGPT Fantasy 2026",
  description: "Draft a $950 roster from real DGPT pros. Fantasy points from live PDGA scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" style={{ WebkitTextSizeAdjust: '100%', MozTextSizeAdjust: '100%' } as React.CSSProperties}>
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0f172a" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <style dangerouslySetInnerHTML={{
            __html: `
            .ticker-track, .ticker-track span {
              font-size: 11px !important;
              -webkit-text-size-adjust: 100% !important;
              text-size-adjust: 100% !important;
            }
          ` }} />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable}`}>
          <NavBar />
          <ProfileSync />
          {children}
          <CookieNotice />
        </body>
      </html>
    </ClerkProvider>
  );
}
