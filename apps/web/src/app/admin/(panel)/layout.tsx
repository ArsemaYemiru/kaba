import { Suspense } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { getSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

/** Admin shell: sidebar + top bar. Session-dependent parts stream inside Suspense. */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh">
      <Suspense fallback={<div className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block" />}>
        <ShellSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-14 border-b border-line" />}>
          <ShellTopbar />
        </Suspense>
        <main id="content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

async function shellData() {
  const s = await getSession();
  if (!s) return null;
  const unread = await prisma.submission.count({ where: { status: "NEW" } });
  return { user: s.user, unread };
}

async function ShellSidebar() {
  const d = await shellData();
  if (!d) return null;
  return <Sidebar isSuperAdmin={d.user.role === "SUPER_ADMIN"} unread={d.unread} />;
}

async function ShellTopbar() {
  const d = await shellData();
  if (!d) return null;
  return <Topbar name={d.user.name} email={d.user.email} role={d.user.role} unread={d.unread} />;
}
