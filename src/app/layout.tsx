import type { Metadata } from "next";
import { absoluteUrl, defaultOgImage, defaultOgImageAlt, siteName } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: "Vitrine Segura | Achadinhos e ofertas selecionadas",
    template: `%s | ${siteName}`,
  },
  description: "Achadinhos do Mercado Livre, Shopee e Shein organizados por categoria, pre\u00E7o e destaque.",
  openGraph: {
    title: "Vitrine Segura | Achadinhos e ofertas selecionadas",
    description: "Produtos selecionados com links oficiais, categorias, campanhas e ofertas atualizadas.",
    url: absoluteUrl("/"),
    siteName,
    type: "website",
    images: [{ url: defaultOgImage, width: 1200, height: 630, alt: defaultOgImageAlt }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vitrine Segura | Achadinhos e ofertas selecionadas",
    description: "Produtos selecionados com links oficiais, categorias, campanhas e ofertas atualizadas.",
    images: [defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning className="scroll-smooth">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
