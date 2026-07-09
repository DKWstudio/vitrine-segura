"use client";

import { useState } from "react";

type CopyProductLinkButtonProps = {
  productId: string;
};

export default function CopyProductLinkButton({ productId }: CopyProductLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const origin = window.location.origin;
    await navigator.clipboard.writeText(`${origin}/produto/${productId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="w-full rounded-lg border border-blue-200 px-3 py-2 text-xs font-black uppercase text-blue-700 hover:bg-blue-50"
    >
      {copied ? "Link copiado" : "Copiar link publico"}
    </button>
  );
}
