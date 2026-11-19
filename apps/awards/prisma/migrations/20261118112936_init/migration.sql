-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'EDITOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ArtistCategory" AS ENUM ('SINGER', 'MUSICIAN', 'ACTOR', 'COMEDIAN', 'DANCER', 'PRODUCER_DJ', 'HOST_MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "EditionPhase" AS ENUM ('DRAFT', 'NOMINEES_ANNOUNCED', 'VOTING_OPEN', 'VOTING_CLOSED', 'WINNERS_ANNOUNCED');

-- CreateEnum
CREATE TYPE "VotingType" AS ENUM ('PUBLIC_VOTE', 'JURY', 'HYBRID', 'HONORARY');

-- CreateEnum
CREATE TYPE "NomineeType" AS ENUM ('PERSON', 'GROUP', 'SONG', 'ALBUM', 'MUSIC_VIDEO', 'FILM', 'SERIES', 'CREATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('AWARDS_NIGHT', 'RED_CARPET', 'PERFORMANCE', 'ACCEPTANCE_SPEECH', 'INTERVIEW', 'BEHIND_THE_SCENES');

-- CreateEnum
CREATE TYPE "VideoSource" AS ENUM ('NONE', 'YOUTUBE', 'UPLOAD');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "VoteEventType" AS ENUM ('CAST', 'CHANGED', 'VOIDED', 'RESTORED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN DEFAULT false,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "newsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "password" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN DEFAULT false,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "expire" TIMESTAMP(3),

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "variants" JSONB,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "blurDataUrl" TEXT,
    "alt" TEXT NOT NULL DEFAULT '',
    "caption" TEXT,
    "credit" TEXT,
    "tags" TEXT[],
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAm" TEXT,
    "stageName" TEXT,
    "legalNameEn" TEXT,
    "legalNameAm" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "categories" "ArtistCategory"[],
    "shortBioEn" TEXT,
    "shortBioAm" TEXT,
    "bioEn" TEXT,
    "bioAm" TEXT,
    "birthYear" INTEGER,
    "deathYear" INTEGER,
    "yearsActive" TEXT,
    "genres" TEXT[],
    "notableWorks" JSONB NOT NULL DEFAULT '[]',
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "portraitId" TEXT,
    "coverId" TEXT,
    "isLegend" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtistMedia" (
    "artistId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArtistMedia_pkey" PRIMARY KEY ("artistId","mediaId")
);

-- CreateTable
CREATE TABLE "AwardEdition" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAm" TEXT,
    "phase" "EditionPhase" NOT NULL DEFAULT 'DRAFT',
    "nomineesAnnouncedAt" TIMESTAMP(3),
    "votingOpensAt" TIMESTAMP(3),
    "votingClosesAt" TIMESTAMP(3),
    "ceremonyAt" TIMESTAMP(3),
    "venue" TEXT,
    "broadcastPartner" TEXT,
    "heroMediaId" TEXT,
    "showPublicPercentages" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardCategory" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAm" TEXT,
    "descriptionEn" TEXT,
    "descriptionAm" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'trophy',
    "votingType" "VotingType" NOT NULL,
    "publicWeight" INTEGER NOT NULL DEFAULT 50,
    "juryWeight" INTEGER NOT NULL DEFAULT 50,
    "nomineeType" "NomineeType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nominee" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayNameEn" TEXT NOT NULL,
    "displayNameAm" TEXT,
    "workTitleEn" TEXT,
    "workTitleAm" TEXT,
    "imageId" TEXT,
    "blurbEn" TEXT,
    "blurbAm" TEXT,
    "youtubeUrl" TEXT,
    "juryScore" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nominee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NomineeArtist" (
    "nomineeId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "NomineeArtist_pkey" PRIMARY KEY ("nomineeId","artistId")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "editionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "nomineeId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "uaHash" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedById" TEXT,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "editionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fromNomineeId" TEXT,
    "toNomineeId" TEXT,
    "type" "VoteEventType" NOT NULL,
    "ipHash" TEXT NOT NULL,
    "uaHash" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultSnapshot" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT,
    "payload" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WinnerOverride" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "nomineeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "byId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WinnerOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAm" TEXT,
    "type" "VideoType" NOT NULL,
    "source" "VideoSource" NOT NULL DEFAULT 'NONE',
    "youtubeUrl" TEXT,
    "mediaId" TEXT,
    "captionsUrl" TEXT,
    "posterId" TEXT,
    "editionId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoNominee" (
    "videoId" TEXT NOT NULL,
    "nomineeId" TEXT NOT NULL,

    CONSTRAINT "VideoNominee_pkey" PRIMARY KEY ("videoId","nomineeId")
);

-- CreateTable
CREATE TABLE "VideoArtist" (
    "videoId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,

    CONSTRAINT "VideoArtist_pkey" PRIMARY KEY ("videoId","artistId")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAm" TEXT,
    "descriptionEn" TEXT,
    "descriptionAm" TEXT,
    "coverId" TEXT,
    "editionId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlbumItem" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,

    CONSTRAINT "AlbumItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAm" TEXT,
    "excerptEn" TEXT,
    "excerptAm" TEXT,
    "bodyEn" TEXT NOT NULL,
    "bodyAm" TEXT,
    "coverId" TEXT,
    "tags" TEXT[],
    "editionId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "branding" JSONB NOT NULL,
    "hero" JSONB NOT NULL,
    "ticker" JSONB NOT NULL,
    "currentEditionId" TEXT,
    "featured" JSONB NOT NULL,
    "social" JSONB NOT NULL,
    "contact" JSONB NOT NULL,
    "sponsors" JSONB NOT NULL,
    "seo" JSONB NOT NULL,
    "footer" JSONB NOT NULL,
    "pages" JSONB NOT NULL,
    "voting" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_emailNormalized_key" ON "user"("emailNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE INDEX "Media_type_createdAt_idx" ON "Media"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist"("slug");

-- CreateIndex
CREATE INDEX "Artist_status_featured_idx" ON "Artist"("status", "featured");

-- CreateIndex
CREATE INDEX "Artist_isLegend_idx" ON "Artist"("isLegend");

-- CreateIndex
CREATE UNIQUE INDEX "AwardEdition_year_key" ON "AwardEdition"("year");

-- CreateIndex
CREATE UNIQUE INDEX "AwardEdition_slug_key" ON "AwardEdition"("slug");

-- CreateIndex
CREATE INDEX "AwardEdition_phase_idx" ON "AwardEdition"("phase");

-- CreateIndex
CREATE INDEX "AwardEdition_status_idx" ON "AwardEdition"("status");

-- CreateIndex
CREATE INDEX "AwardCategory_editionId_status_sortOrder_idx" ON "AwardCategory"("editionId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AwardCategory_editionId_slug_key" ON "AwardCategory"("editionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Nominee_slug_key" ON "Nominee"("slug");

-- CreateIndex
CREATE INDEX "Nominee_categoryId_status_sortOrder_idx" ON "Nominee"("categoryId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "NomineeArtist_artistId_idx" ON "NomineeArtist"("artistId");

-- CreateIndex
CREATE INDEX "Vote_createdAt_idx" ON "Vote"("createdAt");

-- CreateIndex
CREATE INDEX "Vote_editionId_createdAt_idx" ON "Vote"("editionId", "createdAt");

-- CreateIndex
CREATE INDEX "Vote_ipHash_idx" ON "Vote"("ipHash");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_categoryId_key" ON "Vote"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "VoteEvent_ipHash_createdAt_idx" ON "VoteEvent"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "VoteEvent_userId_createdAt_idx" ON "VoteEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VoteEvent_editionId_createdAt_idx" ON "VoteEvent"("editionId", "createdAt");

-- CreateIndex
CREATE INDEX "ResultSnapshot_editionId_lockedAt_idx" ON "ResultSnapshot"("editionId", "lockedAt");

-- CreateIndex
CREATE INDEX "WinnerOverride_categoryId_createdAt_idx" ON "WinnerOverride"("categoryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Video_slug_key" ON "Video"("slug");

-- CreateIndex
CREATE INDEX "Video_status_type_idx" ON "Video"("status", "type");

-- CreateIndex
CREATE INDEX "Video_featured_idx" ON "Video"("featured");

-- CreateIndex
CREATE INDEX "VideoArtist_artistId_idx" ON "VideoArtist"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "Album_slug_key" ON "Album"("slug");

-- CreateIndex
CREATE INDEX "Album_status_idx" ON "Album"("status");

-- CreateIndex
CREATE INDEX "AlbumItem_albumId_sortOrder_idx" ON "AlbumItem"("albumId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_status_publishedAt_idx" ON "NewsPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsPost_featured_idx" ON "NewsPost"("featured");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_portraitId_fkey" FOREIGN KEY ("portraitId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artist" ADD CONSTRAINT "Artist_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistMedia" ADD CONSTRAINT "ArtistMedia_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtistMedia" ADD CONSTRAINT "ArtistMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEdition" ADD CONSTRAINT "AwardEdition_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardCategory" ADD CONSTRAINT "AwardCategory_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "AwardEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AwardCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomineeArtist" ADD CONSTRAINT "NomineeArtist_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "Nominee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NomineeArtist" ADD CONSTRAINT "NomineeArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "AwardEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AwardCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "Nominee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "AwardEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AwardCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoteEvent" ADD CONSTRAINT "VoteEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSnapshot" ADD CONSTRAINT "ResultSnapshot_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "AwardEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSnapshot" ADD CONSTRAINT "ResultSnapshot_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinnerOverride" ADD CONSTRAINT "WinnerOverride_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AwardCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinnerOverride" ADD CONSTRAINT "WinnerOverride_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "Nominee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WinnerOverride" ADD CONSTRAINT "WinnerOverride_byId_fkey" FOREIGN KEY ("byId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "AwardEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoNominee" ADD CONSTRAINT "VideoNominee_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoNominee" ADD CONSTRAINT "VideoNominee_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "Nominee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoArtist" ADD CONSTRAINT "VideoArtist_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoArtist" ADD CONSTRAINT "VideoArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "AwardEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumItem" ADD CONSTRAINT "AlbumItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumItem" ADD CONSTRAINT "AlbumItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "AwardEdition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ───────────── Feta Awards integrity guards (A-12, A-17) ─────────────

-- Weights are percentages that add up to 100; jury scores are 0–100.
ALTER TABLE "AwardCategory" ADD CONSTRAINT "AwardCategory_weights_check"
  CHECK ("publicWeight" BETWEEN 0 AND 100 AND "juryWeight" BETWEEN 0 AND 100 AND "publicWeight" + "juryWeight" = 100);
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_juryScore_check"
  CHECK ("juryScore" IS NULL OR "juryScore" BETWEEN 0 AND 100);
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_singleton" CHECK ("id" = 1);

-- Tallies count only valid votes (spec §8 index).
CREATE INDEX "Vote_tally_idx" ON "Vote" ("categoryId", "nomineeId") WHERE "voidedAt" IS NULL;

-- A vote's nominee must belong to the voted category, and the category to the edition.
CREATE FUNCTION feta_vote_consistency() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Nominee" n JOIN "AwardCategory" c ON c."id" = n."categoryId"
    WHERE n."id" = NEW."nomineeId" AND c."id" = NEW."categoryId" AND c."editionId" = NEW."editionId"
  ) THEN
    RAISE EXCEPTION 'vote nominee/category/edition mismatch' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "Vote_consistency" BEFORE INSERT OR UPDATE OF "nomineeId", "categoryId", "editionId" ON "Vote"
  FOR EACH ROW EXECUTE FUNCTION feta_vote_consistency();

-- VoteEvent is append-only. Allowed exceptions:
--   UPDATE that only clears userId/actorId (account deletion, FK ON DELETE SET NULL);
--   DELETE when the transaction opts in: SET LOCAL feta.allow_vote_event_delete = 'on'
--   ("Remove sample data", deleting an edition).
CREATE FUNCTION feta_vote_event_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF coalesce(current_setting('feta.allow_vote_event_delete', true), '') = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'VoteEvent is append-only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF (NEW."userId" IS NULL OR NEW."userId" = OLD."userId")
     AND (NEW."actorId" IS NULL OR NEW."actorId" = OLD."actorId")
     AND ROW(NEW."id", NEW."editionId", NEW."categoryId", NEW."fromNomineeId", NEW."toNomineeId", NEW."type",
             NEW."ipHash", NEW."uaHash", NEW."reason", NEW."isSample", NEW."createdAt")
         IS NOT DISTINCT FROM
         ROW(OLD."id", OLD."editionId", OLD."categoryId", OLD."fromNomineeId", OLD."toNomineeId", OLD."type",
             OLD."ipHash", OLD."uaHash", OLD."reason", OLD."isSample", OLD."createdAt") THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'VoteEvent is append-only' USING ERRCODE = 'insufficient_privilege';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER "VoteEvent_append_only" BEFORE UPDATE OR DELETE ON "VoteEvent"
  FOR EACH ROW EXECUTE FUNCTION feta_vote_event_append_only();
