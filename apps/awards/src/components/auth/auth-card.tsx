import { TibebStrip } from "@/components/brand/tibeb";

/** Centered card for auth pages, inside the public layout (header/footer stay). */
export function AuthCard({ title, lead, children, footer }: { title: string; lead?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grain relative overflow-hidden">
      <div aria-hidden="true" className="glow-gold absolute top-0 left-1/2 size-[min(900px,140vw)] -translate-x-1/2 -translate-y-1/3" />
      <div className="relative z-10 mx-auto w-full max-w-md px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-line bg-surface/90 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur sm:p-8">
          <TibebStrip height={6} className="mb-6 max-w-24" />
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {lead ? <div className="mt-2 text-sm text-muted-foreground">{lead}</div> : null}
          <div className="mt-6">{children}</div>
        </div>
        {footer ? <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
