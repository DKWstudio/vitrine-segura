"use client";

import { Check, Copy, MessageCircle, Send, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

type ShareButtonsProps = {
  title: string;
  url: string;
};

export default function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encoded = useMemo(
    () => ({
      title: encodeURIComponent(title),
      text: encodeURIComponent(`${title} ${url}`),
      url: encodeURIComponent(url),
    }),
    [title, url],
  );

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  const links = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encoded.text}`,
      className: "bg-emerald-500 text-white hover:bg-emerald-600",
      icon: <MessageCircle className="h-4 w-4" />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded.url}`,
      className: "bg-blue-600 text-white hover:bg-blue-700",
      icon: <Share2 className="h-4 w-4" />,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encoded.title}&url=${encoded.url}`,
      className: "bg-slate-950 text-white hover:bg-slate-800",
      icon: <Share2 className="h-4 w-4" />,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encoded.url}&text=${encoded.title}`,
      className: "bg-sky-500 text-white hover:bg-sky-600",
      icon: <Send className="h-4 w-4" />,
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-950">Compartilhar</h2>
          <p className="text-xs font-medium text-slate-500">Envie esse achadinho para alguem.</p>
        </div>
        {copied ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-emerald-700">
            Link copiado
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-black uppercase tracking-wide transition ${link.className}`}
          >
            {link.icon}
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copiar
        </button>
      </div>
    </section>
  );
}
