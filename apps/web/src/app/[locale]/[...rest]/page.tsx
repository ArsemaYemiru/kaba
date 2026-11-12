import { notFound } from "next/navigation";

// Routes any unknown path under a locale to the on-brand not-found page.
export default function CatchAll() {
  notFound();
}
