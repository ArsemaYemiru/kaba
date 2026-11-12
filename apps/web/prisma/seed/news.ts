/** §8.7. No invented dates, schedules or announcements. */
export const NEWS = [
  {
    title: "Welcome to the new home of Feta Show",
    status: "PUBLISHED" as const,
    isSample: false,
    featured: true,
    tags: ["announcement"],
    excerpt:
      "Episodes, Ethiopian artists, videos and photos from Feta (ፈታ), all in one place, plus a way to get on the show yourself.",
    body: `<p>Feta (ፈታ) is the celebrity game show that launched on EBS TV in 2016, putting two well-known Ethiopian personalities head-to-head across rounds of games and challenges, all the way to a final round. This site is its new home online.</p>
<h2>What you'll find here</h2>
<ul>
<li><strong>Episodes</strong>: every matchup, from game-show face-offs to holiday-special team battles like Traffic Police vs Taxi Drivers.</li>
<li><strong>Artists</strong>: profiles of Ethiopian artists, including the legends of Ethiopian music.</li>
<li><strong>Videos</strong>: highlights, performances and behind-the-scenes clips as they're added.</li>
<li><strong>Gallery</strong>: photos from the studio.</li>
</ul>
<h2>Get involved</h2>
<p>Want to go head-to-head on Feta, sit in the studio audience, or partner with the show? Head to the <a href="/join">Join</a> page and pick the form that fits. Every submission goes straight to the Feta team.</p>`,
  },
  {
    title: "Casting call: go head-to-head on Feta",
    status: "DRAFT" as const,
    isSample: true,
    featured: false,
    tags: ["casting"],
    excerpt: "Think you've got what it takes to face off on the Feta stage? Here's how to apply.",
    body: `<p>Sample draft. Think you've got what it takes to face off on the Feta stage? Apply through the <a href="/join">Be a contestant</a> form and tell us why you'd be great on the show.</p>`,
  },
  {
    title: "From the archive: Traffic Police vs Taxi Drivers",
    status: "DRAFT" as const,
    isSample: true,
    featured: false,
    tags: ["archive", "holiday special"],
    excerpt: "A look back at one of Feta's holiday-special team battles.",
    body: `<p>Sample draft. Holiday specials turn Feta's format into team battles, and Traffic Police vs Taxi Drivers is one of them. Find the matchup on the <a href="/episodes/traffic-police-vs-taxi-drivers">episode page</a>.</p>`,
  },
];
