import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Self-hosted Khmer font (SIL OFL); the browser falls back to it per glyph.
const notoKhmer = localFont({
  src: "./fonts/NotoSansKhmer-wght.woff2",
  variable: "--font-khmer",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IIRS · School SIS",
    template: "%s · IIRS SIS",
  },
  description:
    "Private staff workspace for the International Intellectual Resource School.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoKhmer.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
