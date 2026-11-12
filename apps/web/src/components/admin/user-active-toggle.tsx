"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setUserActive } from "@/server/actions/users";

export function UserActiveToggle({ userId, active, email, disabled }: { userId: string; active: boolean; email: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={active ? "outline" : "secondary"}
      disabled={disabled || pending}
      onClick={() => {
        if (active && !window.confirm(`Deactivate ${email}? They'll be signed out everywhere.`)) return;
        start(async () => {
          const r = await setUserActive({ userId, active: !active });
          if (r.ok) toast.success(active ? `${email} deactivated` : `${email} reactivated`);
          else toast.error(r.error === "forbidden" ? "Not allowed." : r.error);
        });
      }}
    >
      {active ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
