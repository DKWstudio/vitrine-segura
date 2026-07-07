import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitrine Segura | Achadinhos Mercado Livre",
  description: "Os melhores produtos com envio Full e compra garantida.",
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
