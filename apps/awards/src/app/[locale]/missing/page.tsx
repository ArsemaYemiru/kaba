import type { Metadata } from "next";
import NotFound from "../not-found";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

/**
 * Branded 404 body that the proxy fetches internally and returns with a real
 * 404 status (A-39). Requests without the internal header get a 404 themselves.
 */
export default function MissingPage() {
  return <NotFound />;
}
