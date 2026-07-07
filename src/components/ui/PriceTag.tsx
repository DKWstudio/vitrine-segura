export default function PriceTag({
  price,
  oldPrice,
}: {
  price: number;
  oldPrice?: number | null;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
        A partir de
      </span>
      {oldPrice && oldPrice > price ? (
        <span className="text-[11px] font-bold text-slate-400 line-through">
          {oldPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ) : null}
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-bold text-slate-900">R$</span>
        <span className="text-2xl font-black text-slate-900 tracking-tight">
          {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
