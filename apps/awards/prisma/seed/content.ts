import type { VideoType } from "../../src/generated/prisma/enums";

/** §9.5: sample videos (coming-soon state until a link or upload is added). */
export const VIDEOS: { title: string; type: VideoType }[] = [
  { title: "Red carpet highlights", type: "RED_CARPET" },
  { title: "Awards night performances", type: "PERFORMANCE" },
  { title: "Nominee interviews", type: "INTERVIEW" },
];

/** §9.7. No invented dates, venues, prizes or announcements. */
export const NEWS = [
  {
    title: "Welcome to the official Feta Awards website",
    status: "PUBLISHED" as const,
    isSample: false,
    featured: true,
    tags: ["announcement", "how to vote"],
    excerpt: "Meet the nominees, create your account, verify your email and vote for your favourites in every category.",
    body: `<p>Feta Awards celebrates the artists and creators shaping Ethiopian entertainment, and this is its official home online. Here you can follow each edition, meet the nominees, vote for your favourites and see the winners.</p>
<h2>How to vote</h2>
<ol>
<li><strong>Create your account.</strong> Choose <a href="/sign-up">Sign up</a> and enter your name, email and a password.</li>
<li><strong>Verify your email.</strong> We send a 6-digit code to your inbox. Enter it to unlock voting.</li>
<li><strong>Vote in each category.</strong> Open the <a href="/vote">ballot</a> and pick one nominee per category. You can change your votes until voting closes.</li>
</ol>
<p>The full <a href="/rules">voting rules</a> explain who can vote, how winners are decided and when results are published.</p>`,
  },
  {
    title: "Nominees announced",
    status: "DRAFT" as const,
    isSample: true,
    featured: false,
    tags: ["nominees"],
    excerpt: "Sample draft: introduce this edition's nominees.",
    body: `<p>Sample draft. Use this post to introduce the nominees once the official list is confirmed, and link to the <a href="/awards">awards pages</a>.</p>`,
  },
  {
    title: "Voting is open: how to vote",
    status: "DRAFT" as const,
    isSample: true,
    featured: false,
    tags: ["voting"],
    excerpt: "Sample draft: remind fans how to create an account, verify and vote.",
    body: `<p>Sample draft. Remind fans to <a href="/sign-up">create an account</a>, verify their email and <a href="/vote">vote in every category</a> before voting closes.</p>`,
  },
  {
    title: "Awards night: date and venue",
    status: "DRAFT" as const,
    isSample: true,
    featured: false,
    tags: ["awards night"],
    excerpt: "Sample draft: publish once the organizers confirm the date and venue.",
    body: `<p>Sample draft. Publish this post once the organizers confirm the awards night date, venue and broadcast partner.</p>`,
  },
];

/** Long-form page templates (flagged isTemplate until staff edit them). */
export const ABOUT = `<p>Feta Awards celebrates the artists and creators shaping Ethiopian entertainment. Nominees are announced for each edition, fans vote for their favorites here on the official website, and the winners are revealed on awards night.</p>
<h2>How nominees are chosen</h2>
<p><em>Template: the organizers will describe the nomination process here.</em></p>
<h2>How voting works</h2>
<p>Create an account, verify your email, and vote once in each public-vote category. You can change your vote until voting closes. Some categories are decided by a jury, or by a mix of public votes and jury scores. See the <a href="/rules">voting rules</a> for details.</p>`;

const REVIEW = `<p><strong>Template for organizer and legal review.</strong> This text must be confirmed before launch.</p>`;

export const RULES = `${REVIEW}
<h2>1. Who can vote</h2>
<p>Anyone with a Feta Awards account and a verified email address can vote. One account per person. Accounts that share an inbox, or that use disposable email addresses, are not allowed.</p>
<h2>2. One vote per category</h2>
<p>Each member can vote once in every category that accepts public votes. Voting again in the same category moves your vote to the new nominee; it does not add a second vote.</p>
<h2>3. Changing your vote</h2>
<p>You can change your votes as often as you like until voting closes. Your latest choice in each category is the one that counts.</p>
<h2>4. Voting window</h2>
<p>Votes are accepted only between the opening and closing times published for the edition, in East Africa Time (EAT). Votes outside that window are rejected.</p>
<h2>5. Verification</h2>
<p>You must verify your email before voting. The organizers may also require phone verification for an edition.</p>
<h2>6. Fair play</h2>
<p>Automated voting, multiple accounts, or any attempt to manipulate results is not allowed. The organizers may void votes and suspend accounts involved in fraudulent activity, and every such action is logged.</p>
<h2>7. How winners are decided</h2>
<ul>
<li><strong>Public vote:</strong> the nominee with the largest share of valid votes wins.</li>
<li><strong>Jury:</strong> the jury's scores decide the winner.</li>
<li><strong>Public + Jury:</strong> the public share and the jury score are combined using the weights published for the category.</li>
<li><strong>Honorary:</strong> the recipient is chosen by the organizers.</li>
</ul>
<h2>8. Results</h2>
<p>Vote counts are not published while voting is open. After voting closes the results are locked, and winners are announced on awards night.</p>`;

export const PRIVACY = `${REVIEW}
<h2>What we collect</h2>
<p>Your display name, email address, password (stored only as a secure hash), and optionally your phone number. If you vote, we record your choice in each category and the time you voted.</p>
<h2>Security and fraud prevention</h2>
<p>To keep voting fair we store one-way hashes of your IP address and browser user agent with your votes. We never store your IP address itself.</p>
<h2>How we use it</h2>
<p>To run your account, count your votes, prevent fraud, and, if you opt in, send you Feta Awards news.</p>
<h2>Your choices</h2>
<p>You can update your details, change your news preference or delete your account from your account page at any time.</p>`;

export const TERMS = `${REVIEW}
<h2>Using this website</h2>
<p>By creating an account you agree to provide accurate information, keep your password private, and follow the <a href="/rules">voting rules</a>.</p>
<h2>Accounts</h2>
<p>One account per person. The organizers may suspend accounts that break the rules.</p>
<h2>Content</h2>
<p>Photos, videos and text on this site belong to their owners and are used with permission.</p>`;

export const FAQ = [
  { qEn: "How do I vote?", aEn: "Create an account, verify your email with the 6-digit code we send you, then open the ballot and choose one nominee in each category. The voting rules explain every step." },
  { qEn: "Can I change my vote?", aEn: "Yes. You can change your vote in any category as often as you like until voting closes. Your latest choice is the one that counts." },
  { qEn: "Why do I need an account?", aEn: "Accounts keep voting fair: one verified person, one vote per category. See the voting rules for details." },
  { qEn: "How are winners decided?", aEn: "It depends on the category: public vote, jury, a mix of both, or honorary. The voting rules explain each method." },
  { qEn: "When are the winners announced?", aEn: "Winners are revealed on awards night, after voting closes and the results are locked. Check the voting rules and the edition page for this year's key dates." },
];
