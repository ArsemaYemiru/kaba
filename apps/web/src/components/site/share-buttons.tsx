"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { siFacebook, siTelegram, siWhatsapp, siX } from "simple-icons";

const SVG = ({ path }: { path: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
    <path d={path} />
  </svg>
);

/** Share to Telegram, WhatsApp, Facebook, X, or copy the link (spec §4.6). */
export function ShareButtons({ url, title, labels }: { url: string; title: string; labels: { share: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const targets = [
    { name: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}`, icon: siTelegram },
    { name: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, icon: siWhatsapp },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: siFacebook },
    { name: "X", href: `https://x.com/intent/post?url=${u}&text=${t}`, icon: siX },
  ];
  const btn = "inline-flex size-11 items-center justify-center rounded-full border border-line text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">{labels.share}</span>
      {targets.map((s) => (
        <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${labels.share}: ${s.name}`} className={btn}>
          <SVG path={s.icon.path} />
        </a>
      ))}
      <button
        type="button"
        className={btn}
        aria-label={copied ? labels.copied : labels.copy}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard blocked: nothing to do */
          }
        }}
      >
        {copied ? <Check className="size-4 text-green" /> : <Link2 className="size-4" />}
      </button>
      <span role="status" className="sr-only">{copied ? labels.copied : ""}</span>
    </div>
  );
}
