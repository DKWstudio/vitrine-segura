export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vitrine-segura.vercel.app";

export const siteName = "Vitrine Segura";

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export const defaultOgImagePath = "/og-image.png";
export const defaultOgImage = absoluteUrl(defaultOgImagePath);
export const defaultOgImageAlt = "Vitrine Segura - Achadinhos uteis e ofertas selecionadas";

export function slugifyCategory(category: string) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncateDescription(value: string, maxLength = 155) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}...`;
}
