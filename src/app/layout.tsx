import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AgeVerificationModal from "../components/AgeVerificationModal";
import WelcomeModal from "../components/WelcomeModal";
import WebMcpProvider from "../components/WebMcpProvider";

import MediaProtection from "../components/MediaProtection";

import JsonLd from "../components/JsonLd";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0b0e",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.relaxegoze.com"),
  title: {
    default: "Relaxe & Goze | Acompanhantes de Luxo e Massagens de Elite VIP",
    template: "%s | Relaxe & Goze",
  },
  description:
    "O principal portal de classificados de alto padrão do Brasil. Conecte-se com acompanhantes de luxo e massoterapeutas de elite com discrição absoluta.",
  keywords: [
    "acompanhantes de luxo",
    "massagem erótica",
    "massoterapeutas vip",
    "classificados adultos",
    "acompanhantes sp",
    "campinas acompanhantes",
    "relaxe e goze",
  ],
  authors: [{ name: "Relaxe & Goze" }],
  creator: "Relaxe & Goze",
  publisher: "Relaxe & Goze",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://www.relaxegoze.com",
  },
  openGraph: {
    title: "Relaxe & Goze | Acompanhantes de Luxo e Massagens de Elite VIP",
    description:
      "O portal de classificados de alto padrão mais exclusivo do Brasil. Conecte-se com acompanhantes de luxo e massoterapeutas de elite com discrição absoluta.",
    url: "https://www.relaxegoze.com",
    siteName: "Relaxe & Goze",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Relaxe & Goze | Acompanhantes de Luxo e Massagens de Elite VIP",
    description:
      "O portal de classificados de alto padrão mais exclusivo do Brasil. Conecte-se com acompanhantes de luxo e massoterapeutas de elite com discrição absoluta.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
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
    <html
      lang="pt-BR"
      className={`${cormorant.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-dark-bg text-gray-100 font-sans">
        <JsonLd />
        <MediaProtection />
        <AgeVerificationModal />
        <WelcomeModal />
        <WebMcpProvider />
        {children}
      </body>
    </html>
  );
}
