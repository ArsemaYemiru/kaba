import type { Metadata } from "next";
import { ForbiddenPanel } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Not allowed" };

/** Target of the proxy's 403 rewrite for SUPER_ADMIN-only areas. */
export default function Forbidden() {
  return <ForbiddenPanel />;
}
