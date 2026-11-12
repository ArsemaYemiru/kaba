"use client";

import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createUser, resetUserPassword, setUserRole } from "@/server/actions/users";
import { FormField } from "../form-field";

/** A random 16-char temporary password (the user must change it). */
function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#!%";
  const a = new Uint32Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

export function CreateUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwd, setPwd] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <Button size="sm" onClick={() => { setPwd(tempPassword()); setErrors({}); setOpen(true); }}>
        <UserPlus /> Add user
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-line bg-surface sm:max-w-md">
          <DialogTitle className="font-display text-lg font-bold">Add user</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Share the temporary password securely. They must change it at first sign-in.</DialogDescription>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const r = await createUser({ name: fd.get("name"), email: fd.get("email"), role: fd.get("role"), password: fd.get("password") });
                if (r.ok) {
                  toast.success("User created");
                  setOpen(false);
                  router.refresh();
                } else {
                  setErrors("fieldErrors" in r && r.fieldErrors ? r.fieldErrors : {});
                  toast.error(r.error === "forbidden" ? "Super admins only." : r.error);
                }
              });
            }}
          >
            <FormField label="Name" name="name" required error={errors.name} />
            <FormField label="Email" name="email" type="email" required error={errors.email} />
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Role
              <select name="role" defaultValue="EDITOR" className="h-11 rounded-md border border-line bg-bg px-3 text-sm font-normal">
                <option value="EDITOR">Editor (content only)</option>
                <option value="SUPER_ADMIN">Super admin (everything)</option>
              </select>
            </label>
            <FormField label="Temporary password" name="password" value={pwd} onChange={(e) => setPwd(e.target.value)} error={errors.password} hint="Auto-generated. At least 12 characters." />
            <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : null} Create user</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RoleSelect({ userId, role, disabled }: { userId: string; role: "SUPER_ADMIN" | "EDITOR"; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Role"
      defaultValue={role}
      disabled={disabled || pending}
      onChange={(e) => {
        const next = e.target.value as "SUPER_ADMIN" | "EDITOR";
        start(async () => {
          const r = await setUserRole({ userId, role: next });
          if (r.ok) toast.success("Role updated");
          else {
            toast.error(r.error);
            e.target.value = role;
          }
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-line bg-bg px-2 text-xs"
    >
      <option value="EDITOR">Editor</option>
      <option value="SUPER_ADMIN">Super admin</option>
    </select>
  );
}

export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useState<string | null>(null);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Reset the password for ${email}? They'll be signed out and must set a new one.`)) return;
          const pwd = tempPassword();
          start(async () => {
            const r = await resetUserPassword({ userId, password: pwd });
            if (r.ok) {
              setShown(pwd);
              router.refresh();
            } else toast.error(r.error);
          });
        }}
      >
        <KeyRound /> Reset password
      </Button>
      <Dialog open={!!shown} onOpenChange={(o) => !o && setShown(null)}>
        <DialogContent className="border-line bg-surface sm:max-w-md">
          <DialogTitle className="font-display text-lg font-bold">Temporary password</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Share this with {email} securely. It&apos;s shown only once.</DialogDescription>
          <code className="rounded-md border border-line bg-bg px-3 py-2 font-mono text-base select-all">{shown}</code>
          <Button onClick={() => { void navigator.clipboard?.writeText(shown ?? ""); toast.success("Copied"); }}>Copy</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
