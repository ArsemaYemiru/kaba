"use client";

import { useEffect, useState } from "react";
import { humanizeRemaining, remaining } from "@/lib/time";

/** "3 days" until target, computed on the client (cached HTML shows nothing stale). */
export function RelativeTime({ target, template }: { target: string; template: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setText(humanizeRemaining(remaining(target)));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [target]);
  if (!text) return null;
  return <span>{template.replace("{time}", text)}</span>;
}
