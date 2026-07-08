import type { Metadata } from "next";
import { absoluteUrl, siteName } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: "Vitrine Segura | Achadinhos e ofertas afiliadas",
    template: `%s | ${siteName}`,
  },
  description: "Achadinhos afiliados do Mercado Livre e Shopee organizados por categoria, preco e destaque.",
  openGraph: {
    title: "Vitrine Segura | Achadinhos e ofertas afiliadas",
    description: "Produtos selecionados com links oficiais, categorias e ofertas atualizadas.",
    url: absoluteUrl("/"),
    siteName,
    type: "website",
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
