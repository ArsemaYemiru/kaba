"use client";

import { useSyncExternalStore, useState } from "react";
import { siGoogle } from "simple-icons";
import { Button } from "@/components/ui/button";

/** Telegram, TikTok, Facebook/Instagram, Line and generic Android WebViews (Google blocks OAuth there; A-6). */
export function isInAppBrowser(ua: string) {
  return /Telegram|TikTok|musical_ly|Bytedance|FBAN|FBAV|FB_IAB|Instagram|Line\/|; wv\)|WebView/i.test(ua);
}

const subscribe = () => () => {};

/**
 * "Continue with Google" (shown only when Google is configured). Hidden in
 * in-app browsers, which Google refuses, with help to open a real browser.
 */
export function GoogleButton({ label, callbackURL, inAppTitle, inAppBody, consent }: { label: string; callbackURL: string; inAppTitle: string; inAppBody: string; consent: string }) {
  // null on the server (button hidden until we know the browser).
  const inApp = useSyncExternalStore(subscribe, () => isInAppBrowser(navigator.userAgent), () => null);
  const [busy, setBusy] = useState(false);
  if (inApp === null) return <div className="h-12" aria-hidden="true" />;
  if (inApp)
    return (
      <div role="note" className="rounded-md border border-line bg-bg/60 p-3 text-sm">
        <p className="font-semibold">{inAppTitle}</p>
        <p className="mt-1 text-muted-foreground">{inAppBody}</p>
      </div>
    );
  const start = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/sign-in/social", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: "google", callbackURL }) });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.assign(data.url);
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={start} disabled={busy}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path d={siGoogle.path} fill="currentColor" />
        </svg>
        {label}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{consent}</p>
    </div>
  );
}
