/**
 * k6 vote load test (spec §11): 100 vote submissions per second for 5 minutes,
 * p95 < 500 ms, zero duplicate votes (checked afterwards by load/verify.ts).
 * Turnstile is stubbed in the load environment (TURNSTILE_BYPASS=1 on the server),
 * so setup() can open a ballot session for every member through the real endpoint.
 *
 *   docker run --rm --network host -v "$PWD/load:/load" grafana/k6:1.4.0 run /load/vote.js
 */
import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3301";
const RATE = Number(__ENV.RATE || 100);
const DURATION = __ENV.DURATION || "5m";
const fixtures = JSON.parse(open("./.fixtures.json"));

const outcomes = new Counter("vote_outcomes");

export const options = {
  setupTimeout: "5m",
  scenarios: {
    votes: { executor: "constant-arrival-rate", rate: RATE, timeUnit: "1s", duration: DURATION, preAllocatedVUs: 200, maxVUs: 600 },
  },
  thresholds: {
    "http_req_duration{name:vote}": ["p(95)<500"],
    "checks{name:vote}": ["rate>0.99"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

/** Open a ballot session for every member (Turnstile stubbed) and collect the signed cookie. */
export function setup() {
  const members = [];
  const reqs = fixtures.members.map((m) => [
    "POST",
    `${BASE}/api/ballot-session`,
    JSON.stringify({ token: "" }),
    { headers: { "content-type": "application/json", origin: BASE, cookie: m.cookie, "x-real-ip": m.ip }, tags: { name: "ballot-session" } },
  ]);
  for (let i = 0; i < reqs.length; i += 50) {
    const res = http.batch(reqs.slice(i, i + 50));
    res.forEach((r, j) => {
      const m = fixtures.members[i + j];
      const ballot = (r.headers["Set-Cookie"] || "").split(";")[0];
      if (r.status === 200 && ballot.startsWith("feta_ballot=")) members.push({ cookie: `${m.cookie}; ${ballot}`, ip: m.ip });
    });
  }
  if (members.length < fixtures.members.length * 0.99) throw new Error(`only ${members.length} ballot sessions opened`);
  return { members };
}

export default function vote(data) {
  const m = data.members[Math.floor(Math.random() * data.members.length)];
  const t = fixtures.targets[Math.floor(Math.random() * fixtures.targets.length)];
  const nomineeId = t.nomineeIds[Math.floor(Math.random() * t.nomineeIds.length)];
  const res = http.post(`${BASE}/api/vote`, JSON.stringify({ categoryId: t.categoryId, nomineeId }), {
    headers: { "content-type": "application/json", origin: BASE, cookie: m.cookie, "x-real-ip": m.ip },
    tags: { name: "vote" },
  });
  let body = {};
  try {
    body = res.json();
  } catch (_) {
    body = {};
  }
  outcomes.add(1, { outcome: body.ok ? body.status : `${res.status}:${body.reason || "?"}` });
  check(res, { "vote accepted": (r) => r.status === 200 && body.ok === true }, { name: "vote" });
}
