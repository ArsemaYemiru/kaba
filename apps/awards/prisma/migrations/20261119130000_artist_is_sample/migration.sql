-- Sample artists for the dev sample edition (A-76); "Remove sample data" deletes them.
ALTER TABLE "Artist" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;
