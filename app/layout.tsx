import type { Metadata } from "next";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";
import { getSiteUrl, getSupabaseAnonKeyValue, getSupabaseUrlValue } from "@/lib/env";
import { SupabaseConfigProvider } from "@/components/providers/supabase-config";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "LYNVO - Linking Ideas to Innovation",
    template: "%s · LYNVO",
  },
  description:
    "LYNVO is a digital studio that builds, redesigns, troubleshoots, and ships websites, brands, software, and growth systems.",
  keywords: ["digital studio", "web development", "brand design", "SEO", "cybersecurity", "Web3", "Sawantwadi"],
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.png" },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseConfig = {
    url: getSupabaseUrlValue() ?? "",
    anonKey: getSupabaseAnonKeyValue() ?? "",
  };

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen">
        <SupabaseConfigProvider config={supabaseConfig}>{children}</SupabaseConfigProvider>
      </body>
    </html>
  );
}
