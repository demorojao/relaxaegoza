import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AgeVerificationModal from "../components/AgeVerificationModal";
import WebMcpProvider from "../components/WebMcpProvider";

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

export const metadata: Metadata = {
  title: "Relaxe & Goze | Acompanhantes de Luxo e Massagens de Elite VIP",
  description: "O portal de classificados de alto padrão mais exclusivo do Brasil. Conecte-se com acompanhantes de luxo e massoterapeutas de elite com discrição absoluta.",
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
        <AgeVerificationModal />
        <WebMcpProvider />
        {children}
      </body>
    </html>
  );
}
