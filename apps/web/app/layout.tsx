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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SITE_DESCRIPTION =
  "Garotos de programa no Clube dos Garotos: perfis com fotos, momentos e contato perto de você. Encontre garoto de programa em São Paulo, Rio e outras cidades do Brasil.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Garotos de programa — Clube dos Garotos",
    template: "%s · Clube dos Garotos",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Clube dos Garotos",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Clube dos Garotos",
    title: "Garotos de programa — Clube dos Garotos",
    description: SITE_DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Garotos de programa — Clube dos Garotos",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
