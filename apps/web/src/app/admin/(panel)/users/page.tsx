import type { Metadata } from "next";
import { Chip } from "@/components/brand/chip";
import { CreateUserButton, ResetPasswordButton, RoleSelect } from "@/components/admin/modules/users-admin";
import { UserActiveToggle } from "@/components/admin/user-active-toggle";
import { AdminPage, ForbiddenPanel, Panel } from "@/components/admin/ui";
import { isSuperAdmin, requireUser } from "@/lib/authz";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUser();
  if (!isSuperAdmin(me)) return <ForbiddenPanel />; // re-check; the proxy already returned 403
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, lastLoginAt: true },
  });
  return (
    <AdminPage title="Users" description="Who can sign in to the admin. Public sign-up is disabled." actions={<CreateUserButton />}>
      <Panel>
        <div className="-m-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelect userId={u.id} role={u.role} disabled={u.id === me.id} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Chip size="sm" variant={u.isActive ? "green" : "red"}>
                        {u.isActive ? "Active" : "Deactivated"}
                      </Chip>
                      {u.mustChangePassword ? (
                        <Chip size="sm" variant="muted">
                          Must change password
                        </Chip>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {u.lastLoginAt ? u.lastLoginAt.toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa", dateStyle: "medium", timeStyle: "short" }) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {u.id !== me.id ? <ResetPasswordButton userId={u.id} email={u.email} /> : null}
                    <UserActiveToggle userId={u.id} active={u.isActive} email={u.email} disabled={u.id === me.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <p className="mt-3 text-xs text-muted-foreground">You can&apos;t change your own role or deactivate yourself, and at least one active super admin is always kept.</p>
    </AdminPage>
  );
}
