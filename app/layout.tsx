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
    "Type your current and target careers. Watch a multi-agent pipeline build a Udacity-grade bridge module live, grounded in real O*NET government skill data.",
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
