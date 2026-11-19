import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ListParams } from "@/lib/admin-list";
import { prisma } from "@/lib/db";

const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });

/** Members list (spec §6): search, verified, banned, voted / not voted. */
export async function listMembers(p: ListParams, editionId: string | null) {
  const f = p.filters as Record<string, string | undefined>;
  const where: Prisma.UserWhereInput = {
    role: "MEMBER",
    ...(f.verified === "1" ? { emailVerified: true } : f.verified === "0" ? { emailVerified: false } : {}),
    ...(f.banned === "1" ? { banned: true } : {}),
    ...(f.voted === "1" && editionId ? { votes: { some: { editionId } } } : f.voted === "0" && editionId ? { votes: { none: { editionId } } } : {}),
    ...(f.sample === "1" ? { isSample: true } : f.sample === "0" ? { isSample: false } : {}),
    ...(p.q ? { OR: [{ email: contains(p.q) }, { displayName: contains(p.q) }, { name: contains(p.q) }, { phoneNumber: contains(p.q) }] } : {}),
  };
  const orderBy: Prisma.UserOrderByWithRelationInput = p.sort === "email" ? { email: p.dir } : p.sort === "lastLogin" ? { lastLoginAt: { sort: p.dir, nulls: "last" } } : { createdAt: p.dir };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        emailVerified: true,
        phoneNumberVerified: true,
        banned: true,
        isSample: true,
        newsOptIn: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { votes: editionId ? { where: { editionId } } : true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { rows, total };
}

export async function memberDetail(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: "MEMBER" },
    select: {
      id: true,
      email: true,
      displayName: true,
      name: true,
      emailVerified: true,
      phoneNumber: true,
      phoneNumberVerified: true,
      banned: true,
      banReason: true,
      banExpires: true,
      isActive: true,
      isSample: true,
      newsOptIn: true,
      consentAt: true,
      createdAt: true,
      lastLoginAt: true,
      votes: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          voidedAt: true,
          voidReason: true,
          ipHash: true,
          category: { select: { nameEn: true, edition: { select: { year: true } } } },
          nominee: { select: { displayNameEn: true, workTitleEn: true } },
        },
      },
    },
  });
  if (!user) return null;
  const events = await prisma.voteEvent.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, type: true, createdAt: true, ipHash: true, reason: true, fromNomineeId: true, toNomineeId: true, category: { select: { nameEn: true } } },
  });
  const nomineeIds = [...new Set(events.flatMap((e) => [e.fromNomineeId, e.toNomineeId]).filter((v): v is string => !!v))];
  const names = new Map((await prisma.nominee.findMany({ where: { id: { in: nomineeIds } }, select: { id: true, displayNameEn: true, workTitleEn: true } })).map((n) => [n.id, n.workTitleEn ?? n.displayNameEn]));
  return { user, events: events.map((e) => ({ ...e, from: e.fromNomineeId ? names.get(e.fromNomineeId) : null, to: e.toNomineeId ? names.get(e.toNomineeId) : null })) };
}
