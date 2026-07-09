"use client";

import { useEffect, useRef, useState } from "react";

export default function ShopeeAffiliateWarning() {
  const markerRef = useRef<HTMLDivElement>(null);
  const [shouldWarn, setShouldWarn] = useState(false);

  useEffect(() => {
    const form = markerRef.current?.closest("form");

    if (!form) {
      return;
    }

    const source = form.querySelector<HTMLSelectElement>('select[name="source"]');
    const affiliateUrl = form.querySelector<HTMLInputElement>('input[name="affiliate_url"]');

    if (!source || !affiliateUrl) {
      return;
    }

    const updateWarning = () => {
      setShouldWarn(source.value === "shopee" && affiliateUrl.value.trim() === "");
    };

    updateWarning();
    source.addEventListener("change", updateWarning);
    affiliateUrl.addEventListener("input", updateWarning);

    return () => {
      source.removeEventListener("change", updateWarning);
      affiliateUrl.removeEventListener("input", updateWarning);
    };
  }, []);

  return (
    <div ref={markerRef} className="md:col-span-12">
      {shouldWarn ? (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800">
          Shopee selecionada sem link afiliado. O produto pode ser salvo assim, mas o botao de compra usara o link original e pode nao gerar comissao.
        </p>
      ) : null}
    </div>
  );
}