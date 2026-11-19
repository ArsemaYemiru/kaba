import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/csp";
import { jsonLd } from "@/lib/seo";
import { artistLd, eventLd, newsLd } from "@/lib/structured-data";

describe("JSON-LD (spec §10)", () => {
  it("can't break out of the script tag", () => {
    expect(jsonLd({ name: "</script><script>alert(1)</script>" }).__html).not.toContain("</script>");
  });
  it("only emits an Event once date and venue are set, never for sample editions", () => {
    const base = { nameEn: "Feta Awards 2027", slug: "2027", ceremonyAt: new Date("2027-03-08T16:00:00Z"), venue: "Venue", isSample: false };
    expect(eventLd(base)).toMatchObject({ "@type": "Event", startDate: "2027-03-08T16:00:00.000Z", location: { name: "Venue" } });
    expect(eventLd({ ...base, venue: null })).toBeNull();
    expect(eventLd({ ...base, ceremonyAt: null })).toBeNull();
    expect(eventLd({ ...base, isSample: true })).toBeNull();
  });
  it("artists: Person vs MusicGroup, nothing invented", () => {
    const a = { slug: "x", nameEn: "X", nameAm: null, stageName: null, isGroup: false, shortBioEn: null, birthYear: null, deathYear: null, genres: [], sameAs: [] };
    const p = artistLd(a);
    expect(p["@type"]).toBe("Person");
    expect(Object.keys(p).sort()).toEqual(["@context", "@type", "name", "url"]);
    expect(artistLd({ ...a, isGroup: true, birthYear: 1970 })).toMatchObject({ "@type": "MusicGroup", foundingDate: "1970" });
  });
  it("news articles have a headline and dates", () => {
    expect(newsLd({ slug: "n", titleEn: "T", excerptEn: null, publishedAt: new Date("2026-11-18T00:00:00Z"), updatedAt: new Date("2026-11-19T00:00:00Z") })).toMatchObject({ "@type": "NewsArticle", headline: "T", datePublished: "2026-11-18T00:00:00.000Z" });
  });
});

describe("security headers (spec §11)", () => {
  it("CSP allows Turnstile and YouTube, blocks plugins/base hijacking", () => {
    const csp = contentSecurityPolicy();
    for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "https://challenges.cloudflare.com", "https://www.youtube-nocookie.com"]) expect(csp).toContain(d);
    expect(contentSecurityPolicy("'none'")).toContain("frame-ancestors 'none'");
  });
  it("sends nosniff, referrer and permissions policies", () => {
    const keys = securityHeaders().map((h) => h.key);
    expect(keys).toEqual(expect.arrayContaining(["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]));
  });
});
