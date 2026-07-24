import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { PublicShell } from "@/components/public-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Acompanhante — Catálogo Premium",
  description:
    "Plataforma premium para descoberta de acompanhantes. Exclusividade, confiança e sofisticação.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>
        <PublicShell>{children}</PublicShell>
        <CookieConsentBanner />
      </body>
    </html>
  );
}
