-- Remove the 13 placeholder artist profiles the old seed created (A-81): artists
-- are now added only in the admin. A profile is kept if staff have already
-- worked on it: it has a portrait, gallery photos or a Feta Awards honor.
CREATE TEMP TABLE _seeded_artist AS
  SELECT a.id FROM "Artist" a
  WHERE a.slug IN ('mulatu-astatke', 'mahmoud-ahmed', 'tilahun-gessesse', 'alemayehu-eshete', 'aster-aweke', 'hailu-mergia',
                   'teddy-afro', 'gigi', 'betty-g', 'rophnan', 'seifu-fantahun', 'amleset-muchie', 'jano-band')
    AND a."portraitId" IS NULL
    AND a."coverId" IS NULL
    AND NOT EXISTS (SELECT 1 FROM "ArtistMedia" m WHERE m."artistId" = a.id)
    AND NOT EXISTS (SELECT 1 FROM "Nominee" n WHERE n."artistId" = a.id);

-- Home page picks that point at them.
UPDATE "SiteSettings" s SET "featured" = jsonb_set(s."featured", '{artistIds}',
  COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements_text(COALESCE(s."featured"->'artistIds', '[]'::jsonb)) x
            WHERE x NOT IN (SELECT id FROM _seeded_artist)), '[]'::jsonb))
WHERE jsonb_typeof(s."featured") = 'object';

DELETE FROM "Artist" WHERE id IN (SELECT id FROM _seeded_artist);
DROP TABLE _seeded_artist;
