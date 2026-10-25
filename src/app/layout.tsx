import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Figtree, Bricolage_Grotesque, Onest, Inter_Tight, Nunito_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Building theme fonts (src/lib/themes.ts). latin-ext carries the ₹ sign; only the default is preloaded,
// the rest download only when a building uses that theme.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-jakarta" });
const figtree = Figtree({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-figtree", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-bricolage", preload: false });
const onest = Onest({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-onest", preload: false });
const interTight = Inter_Tight({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter-tight", preload: false });
const nunitoSans = Nunito_Sans({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-nunito-sans", preload: false });
const outfit = Outfit({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-outfit", preload: false });
const themeFonts = [jakarta, figtree, bricolage, onest, interTight, nunitoSans, outfit].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "Build Maintain",
  description: "Building maintenance management app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${themeFonts} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
