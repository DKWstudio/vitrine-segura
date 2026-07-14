import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vitrine Segura",
    short_name: "Vitrine Segura",
    description: "Achadinhos e ofertas selecionadas com links oficiais.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050E23",
    theme_color: "#050E23",
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}