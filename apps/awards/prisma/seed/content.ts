/** §9.7. No invented dates, venues, prizes or announcements. */
export const NEWS = [
  {
    title: "Welcome to the official Feta Awards website",
    status: "PUBLISHED" as const,
    featured: true,
    tags: ["announcement"],
    excerpt: "Feta Awards recognizes Ethiopian artists across every genre. Here's how the site works.",
    body: `<p>Feta Awards celebrates the artists shaping Ethiopian music and entertainment, and this is its official home online.</p>
<h2>Recognition, genre by genre</h2>
<p>Each edition honors artists in genre categories such as Classical, Bati and Afrobeat. Every artist recognized in a genre is honored equally: open a genre to read each artist's citation and the work they're recognized for.</p>
<h2>Explore</h2>
<ul>
<li><a href="/awards">The current edition</a>: its genres and honored artists.</li>
<li><a href="/artists">Artists</a>: profiles of the faces and voices of Ethiopian music.</li>
<li><a href="/awards/archive">The archive</a>: every past edition.</li>
</ul>`,
  },
];

/** Long-form page templates (flagged isTemplate until staff edit them). */
export const ABOUT = `<p>Feta Awards celebrates the artists shaping Ethiopian music and entertainment. Each edition recognizes artists genre by genre, so that every tradition and every sound gets its due.</p>
<h2>How artists are recognized</h2>
<p><em>Template: the organizers will describe how artists are selected for each genre here.</em></p>
<h2>Genres</h2>
<p>Each edition has its own genre categories. Every artist recognized in a genre is honored equally, with a citation explaining why.</p>`;

const REVIEW = `<p><strong>Template for organizer and legal review.</strong> This text must be confirmed before launch.</p>`;

export const PRIVACY = `${REVIEW}
<h2>Visitors</h2>
<p>You can use this website without an account. We don't ask visitors for personal information.</p>
<h2>Analytics</h2>
<p>If analytics are enabled, we use privacy-friendly, cookieless page-view statistics. We never sell visitor data.</p>
<h2>Staff accounts</h2>
<p>Only Feta Awards staff have accounts. For them we store a name, email address and a securely hashed password, and we log changes they make in the admin.</p>`;

export const TERMS = `${REVIEW}
<h2>Using this website</h2>
<p>This website presents Feta Awards editions, the artists they recognize, and related news, photos and videos.</p>
<h2>Content</h2>
<p>Photos, videos and text on this site belong to their owners and are used with permission.</p>`;

export const FAQ = [
  { qEn: "What is Feta Awards?", aEn: "A celebration of Ethiopian artists. Each edition recognizes artists genre by genre, from Classical to Bati to Afrobeat." },
  { qEn: "Is there a winner in each genre?", aEn: "No. Every artist recognized in a genre is honored equally." },
  { qEn: "Can an artist be honored in more than one genre?", aEn: "Yes. An artist can be recognized in several genres in the same edition." },
  { qEn: "Do I need an account?", aEn: "No. Everything on the site is open to everyone." },
];
