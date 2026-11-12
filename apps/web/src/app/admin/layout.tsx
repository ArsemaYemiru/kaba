import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { HydrationMarker } from "@/components/site/hydration-marker";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · Feta Show", template: "%s · Feta Admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0A0A0C", colorScheme: "dark" };

/** Admin root layout: English only, same dark tokens, denser UI (spec §5). */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="en" className={`dark ${fontVariables}`}>
      <body className="min-h-dvh bg-bg text-sm text-foreground">
        {children}
        <HydrationMarker />
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
