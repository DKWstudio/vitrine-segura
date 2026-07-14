import Image from "next/image";
import Link from "next/link";
import VisitTracker from "@/components/ui/VisitTracker";
import { getSiteVisitCount } from "@/lib/visits";

function formatVisits(count: number | null) {
  if (count === null) {
    return "--";
  }

  return count.toLocaleString("pt-BR");
}

export default async function SiteFooter() {
  const visitCount = await getSiteVisitCount();

  return (
    <footer className="mt-12 bg-[#2D4169] text-white">
      <VisitTracker />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Link
            href="https://dkworksstudio.base44.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4"
            aria-label="Abrir site da DK Works Studio"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/70 bg-white/5 p-2 transition group-hover:bg-white/10">
              <Image
                src="/img/dkTransparente.png"
                alt="DK Works Studio"
                width={70}
                height={70}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="text-2xl font-black uppercase leading-none tracking-wide text-white/90">
              DK<br />Works<br />Studio
            </span>
          </Link>

          <div className="hidden h-24 w-px bg-white/30 sm:block" />

          <div className="space-y-2">
            <h2 className="text-xl font-black">DK Works Studio</h2>
            <p className="text-sm font-medium text-white/90">
              Daniel Felipe Kroth <span className="mx-2 text-white/40">|</span> CNPJ: 64.413.001/0001-40 <span className="mx-2 text-white/40">|</span> Telefone: (49) 98923-2307
            </p>
            <p className="text-sm font-semibold text-white/90">
              © 2026 Vitrine Segura - Desenvolvido por DK Works Studio.
            </p>
          </div>
        </div>

        <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90">
          Visitas: {formatVisits(visitCount)}
        </div>
      </div>
    </footer>
  );
}