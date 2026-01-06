import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Título que aparece na aba do navegador e buscas
  title: "Vitrine Segura | Os Melhores Achadinhos do Mercado Livre",
  description: "Curadoria diária de produtos úteis e verificados com envio Full e Compra Garantida.",
  
  // Configuração para redes sociais (WhatsApp, Instagram, Facebook)
  openGraph: {
    title: "Vitrine Segura | Achadinhos do Mercado Livre",
    description: "Os produtos mais vendidos e bem avaliados, selecionados para você.",
    url: "https://vitrinesegura.com.br", // Substitua pelo seu domínio final quando tiver
    siteName: "Vitrine Segura",
    images: [
      {
        url: "/img/vitrineSegura.png", // Imagem que aparecerá no compartilhamento
        width: 1200,
        height: 630,
        alt: "Logo Vitrine Segura",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  
  // Ícones
  icons: {
    icon: "/favicon.ico", // Coloque o arquivo favicon.ico na pasta public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}