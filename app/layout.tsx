/* eslint-disable tailwindcss/no-custom-classname */
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import { LayoutContent } from "@/components/LayoutContent";

import { cn } from "@/lib/utils";

import { QueryProvider } from "./providers/QueryProvider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const instrumentSerif = localFont({
  src: "../public/InstrumentSerif-Regular.ttf",
  variable: "--font-instrument-serif",
});
const instrumentSerifItalic = localFont({
  src: "../public/InstrumentSerif-Italic.ttf",
  variable: "--font-instrument-serif-italic",
});

const ibmPlexMono = localFont({
  src: "../public/IBM_Plex_Mono/IBMPlexMono-Regular.ttf",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Web Surf Agent",
    template: "%s | Web Surf Agent",
  },
  description:
    "An open playground for AI browser agents built with Next.js, FastAPI, and Chrome DevTools Protocol.",
  applicationName: "Web Surf Agent",
  keywords: [
    "web agent",
    "AI browser agent",
    "browser automation",
    "Chrome DevTools Protocol",
    "CDP",
    "Next.js",
    "FastAPI",
  ],
  authors: [{ name: "Cuong Duc Le", url: "https://github.com/cuongducle" }],
  creator: "Cuong Duc Le",
  openGraph: {
    title: "Web Surf Agent",
    description:
      "Build, test, and demo AI agents that browse real websites through Chrome DevTools Protocol.",
    type: "website",
    images: [
      {
        url: "/placeholder-screenshot.png",
        width: 1920,
        height: 999,
        alt: "Web Surf Agent interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Web Surf Agent",
    description:
      "Build, test, and demo AI agents that browse real websites through Chrome DevTools Protocol.",
    images: ["/placeholder-screenshot.png"],
  },
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        "dark",
        instrumentSerif.variable,
        instrumentSerifItalic.variable,
        GeistSans.variable,
        GeistMono.variable,
        ibmPlexMono.variable
      )}
    >
      <body className={inter.className}>
        <QueryProvider>
          <LayoutContent>{children}</LayoutContent>
        </QueryProvider>
      </body>
    </html>
  );
}
