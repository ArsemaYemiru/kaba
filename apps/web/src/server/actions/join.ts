"use server";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { clientIp, hashIp, hit } from "@/lib/rate-limit";
import { JoinSchema, type JoinResult } from "@/schemas/join";

/** Saves a Join form as a Submission (spec §4.8). Honeypot + 5/hour/IP. */
export async function submitJoin(input: unknown): Promise<JoinResult> {
  const parsed = JoinSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      fieldErrors[k] ??= issue.message;
    }
    // A filled honeypot gets a fake success so bots learn nothing.
    if (fieldErrors.website) return { ok: true };
    return { ok: false, error: "invalid", fieldErrors };
  }
  const data = parsed.data;
  const ipHash = hashIp(await clientIp());

  try {
    const limit = await hit(`join:${ipHash}`, 5, 60 * 60);
    if (!limit.allowed) return { ok: false, error: "rateLimited" };

    let payload: Prisma.InputJsonValue;
    let email: string | null = null;
    let name = data.name;
    if (data.type === "CONTESTANT") {
      email = data.email;
      payload = { city: data.city, category: data.category, socialLinks: data.socialLinks, whyYou: data.whyYou, videoLink: data.videoLink };
    } else if (data.type === "AUDIENCE") {
      payload = { preferredDate: data.preferredDate, groupSize: data.groupSize };
    } else {
      email = data.email;
      name = data.name;
      payload = { company: data.company, message: data.message };
    }
    await prisma.submission.create({
      data: { type: data.type, name, email, phone: data.phone, payload, ipHash },
    });
    return { ok: true };
  } catch (err) {
    console.error("[join] failed to save submission", err);
    return { ok: false, error: "server" };
  }
}
