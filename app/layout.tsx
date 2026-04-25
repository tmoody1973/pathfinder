import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ConvexClerkProvider } from "./_components/ConvexClerkProvider";
import { AuthHeader } from "./_components/AuthHeader";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PathFinder — Career bridge built by AI",
  description:
    "Type two careers, or paste your LinkedIn. Eleven AI agents build your personalized 8-week learning bridge live, grounded in real O*NET government data, with honest salary math and a counselor that won't pep-talk you.",
  openGraph: {
    title: "PathFinder — Career bridge built by AI",
    description:
      "Eleven AI agents build your personalized career bridge live. Real O*NET data. Honest salary math. A counselor that won't pep-talk you.",
    images: [
      {
        url: "/pathfinder-logo.png",
        width: 1200,
        height: 432,
        alt: "PathFinder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PathFinder — Career bridge built by AI",
    description:
      "Eleven AI agents build your personalized career bridge live. Built for Blackathon 2026.",
    images: ["/pathfinder-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClerkProvider>
          <AuthHeader />
          {children}
        </ConvexClerkProvider>
      </body>
    </html>
  );
}
