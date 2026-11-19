"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __fetaTurnstile?: Promise<void>;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript() {
  window.__fetaTurnstile ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      window.__fetaTurnstile = undefined;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return window.__fetaTurnstile;
}

/**
 * Cloudflare Turnstile (spec §2/§5.2). Puts the token in a hidden
 * `cf-turnstile-response` field; the Server Action verifies it. Renders
 * nothing when the server disabled it (TURNSTILE_BYPASS, non-production only).
 * Tokens are single-use, so the widget resets after every submit of its form.
 */
export function Turnstile({ siteKey, label, onToken }: { siteKey: string | null; label: string; onToken?: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "dark",
          size: "flexible",
          appearance: "always",
          callback: (t: string) => {
            setToken(t);
            onToken?.(t);
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => undefined);
    const form = ref.current.closest("form");
    const onSubmit = () =>
      window.setTimeout(() => {
        setToken("");
        if (id && window.turnstile) window.turnstile.reset(id);
      }, 0);
    form?.addEventListener("submit", onSubmit);
    return () => {
      cancelled = true;
      form?.removeEventListener("submit", onSubmit);
      if (id && window.turnstile) window.turnstile.remove(id);
    };
    // onToken is read at callback time; re-rendering the widget for a new callback would reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return (
    <div role="group" aria-label={label} className="min-h-[65px]">
      <div ref={ref} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
    </div>
  );
}
