import { Suspense } from "react";

type User = {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function getUsers(): Promise<User[] | null> {
  try {
    const res = await fetch(`${API_URL}/users`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function UserList() {
  const users = await getUsers();

  if (users === null) {
    return (
      <p className="mt-2 text-red-500">
        Could not reach the API at {API_URL}. Is it running?
      </p>
    );
  }

  if (users.length === 0) {
    return (
      <p className="mt-2 text-zinc-500">
        No users yet. Try: curl -X POST {API_URL}/users -H
        &quot;Content-Type: application/json&quot; -d
        &apos;{`{"email":"a@b.com","name":"Ada"}`}&apos;
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1">
      {users.map((u) => (
        <li key={u.id}>
          {u.name ?? "—"} &lt;{u.email}&gt;
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <h1 className="text-3xl font-bold">kaba</h1>
      <p className="mt-2 text-zinc-500">
        Next.js + NestJS + Prisma monorepo
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Users</h2>
        <Suspense fallback={<p className="mt-2 text-zinc-500">Loading…</p>}>
          <UserList />
        </Suspense>
      </section>
    </main>
  );
}
