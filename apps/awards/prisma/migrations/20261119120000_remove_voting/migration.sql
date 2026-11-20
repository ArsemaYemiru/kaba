-- Feta Awards becomes a recognition site (A-76): no public voting, no winners,
-- no public member accounts (A-77). Categories are genres within an edition and
-- each Nominee row is an honoree entry for exactly one artist.

-- 1. Voting tables go first (VoteEvent's append-only trigger would otherwise
--    block the SET NULL cascades when member accounts are deleted below).
DROP TABLE "WinnerOverride";
DROP TABLE "ResultSnapshot";
DROP TABLE "VoteEvent";
DROP TABLE "Vote";
DROP FUNCTION IF EXISTS feta_vote_event_append_only();
DROP FUNCTION IF EXISTS feta_vote_consistency();
DROP TYPE "VoteEventType";

-- 2. Honoree entries link to one artist. Backfill from the old join table,
--    drop entries without an artist and keep one entry per artist per genre.
ALTER TABLE "Nominee" ADD COLUMN "artistId" TEXT;
UPDATE "Nominee" n SET "artistId" = (
  SELECT MIN(na."artistId") FROM "NomineeArtist" na WHERE na."nomineeId" = n."id"
);
DELETE FROM "Nominee" WHERE "artistId" IS NULL;
DELETE FROM "Nominee" n USING "Nominee" d
  WHERE n."categoryId" = d."categoryId" AND n."artistId" = d."artistId"
    AND (n."sortOrder", n."id") > (d."sortOrder", d."id");
ALTER TABLE "Nominee" ALTER COLUMN "artistId" SET NOT NULL;
DROP TABLE "NomineeArtist";
ALTER TABLE "Nominee" DROP COLUMN "isWinner", DROP COLUMN "juryScore";
CREATE INDEX "Nominee_artistId_idx" ON "Nominee"("artistId");
CREATE UNIQUE INDEX "Nominee_categoryId_artistId_key" ON "Nominee"("categoryId", "artistId");
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Categories and editions lose their voting fields (their CHECKs drop with the columns).
ALTER TABLE "AwardCategory" DROP COLUMN "juryWeight", DROP COLUMN "nomineeType", DROP COLUMN "publicWeight", DROP COLUMN "votingType";
DROP INDEX "AwardEdition_phase_idx";
ALTER TABLE "AwardEdition" DROP COLUMN "nomineesAnnouncedAt", DROP COLUMN "phase", DROP COLUMN "showPublicPercentages", DROP COLUMN "votingClosesAt", DROP COLUMN "votingOpensAt";
DROP TYPE "EditionPhase";
DROP TYPE "NomineeType";
DROP TYPE "VotingType";
ALTER TABLE "SiteSettings" DROP COLUMN "voting";

-- 4. Staff-only accounts: member users (and their sessions) are removed.
DELETE FROM "user" WHERE "role" = 'MEMBER';
DROP INDEX "user_phoneNumber_key";
ALTER TABLE "user" DROP COLUMN "consentAt", DROP COLUMN "newsOptIn", DROP COLUMN "phoneNumber", DROP COLUMN "phoneNumberVerified";
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'EDITOR');
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
