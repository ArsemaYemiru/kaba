import { SITE_URL } from "./seo";

const abs = (u: string | null | undefined) => (u ? new URL(u, SITE_URL).toString() : undefined);
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length))) as T;

export function organizationLd(o: { logoUrl?: string | null; sameAs: string[]; email?: string | null }) {
  return clean({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Feta Awards",
    alternateName: "ፈታ",
    url: SITE_URL,
    logo: abs(o.logoUrl) ?? abs("/icon.png"),
    sameAs: o.sameAs,
    email: o.email || undefined,
  });
}

/** Awards night: only once both the date and the venue are set (never invented). */
export function eventLd(e: { nameEn: string; slug: string; ceremonyAt: Date | null; venue: string | null }) {
  if (!e.ceremonyAt || !e.venue) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${e.nameEn} · Awards night`,
    startDate: e.ceremonyAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.venue },
    image: [abs(`/og/edition/${e.slug}`)],
    url: abs(`/awards/${e.slug}`),
    organizer: { "@id": `${SITE_URL}/#organization` },
  };
}

export function artistLd(a: {
  slug: string; nameEn: string; nameAm: string | null; stageName: string | null; isGroup: boolean; shortBioEn: string | null; birthYear: number | null; deathYear: number | null;
  genres: string[]; portraitUrl?: string | null; sameAs: string[];
}) {
  const alternate = [a.nameAm, a.stageName].filter((v): v is string => !!v && v !== a.nameEn);
  return clean({
    "@context": "https://schema.org",
    "@type": a.isGroup ? "MusicGroup" : "Person",
    name: a.nameEn,
    alternateName: alternate,
    url: abs(`/artists/${a.slug}`),
    image: abs(a.portraitUrl),
    description: a.shortBioEn || undefined,
    ...(a.isGroup ? { genre: a.genres, foundingDate: a.birthYear ? String(a.birthYear) : undefined } : { birthDate: a.birthYear ? String(a.birthYear) : undefined, deathDate: a.deathYear ? String(a.deathYear) : undefined }),
    sameAs: a.sameAs,
  });
}

export function newsLd(n: { slug: string; titleEn: string; excerptEn: string | null; publishedAt: Date | null; updatedAt: Date; coverUrl?: string | null; author?: string | null }) {
  return clean({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: n.titleEn.slice(0, 110),
    description: n.excerptEn || undefined,
    datePublished: n.publishedAt?.toISOString(),
    dateModified: n.updatedAt.toISOString(),
    image: [abs(n.coverUrl) ?? abs(`/og/news/${n.slug}`)],
    mainEntityOfPage: abs(`/news/${n.slug}`),
    author: n.author ? { "@type": "Person", name: n.author } : { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  });
}
