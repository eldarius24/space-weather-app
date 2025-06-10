-- Création de la table space_objects
CREATE TABLE "space_objects" (
  "id" TEXT NOT NULL,
  "noradId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "launchDate" TIMESTAMP(3),
  "epoch" TIMESTAMP(3),
  "meanMotion" DOUBLE PRECISION,
  "eccentricity" DOUBLE PRECISION,
  "inclination" DOUBLE PRECISION,
  "raOfAscNode" DOUBLE PRECISION,
  "argOfPericenter" DOUBLE PRECISION,
  "meanAnomaly" DOUBLE PRECISION,
  "period" DOUBLE PRECISION,
  "apoapsis" DOUBLE PRECISION,
  "periapsis" DOUBLE PRECISION,
  "lastUpdated" TIMESTAMP(3) NOT NULL,
  "rawData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "space_objects_pkey" PRIMARY KEY ("id")
);

-- Création de l'index unique sur noradId
CREATE UNIQUE INDEX "space_objects_noradId_key" ON "space_objects"("noradId");

-- Création de l'index sur noradId pour optimiser les requêtes
CREATE INDEX "space_objects_norad_id_idx" ON "space_objects" ("noradId");

-- Création de l'index sur objectType pour les requêtes de filtrage
CREATE INDEX "space_objects_object_type_idx" ON "space_objects" ("objectType");

-- Création de l'index sur lastUpdated pour les requêtes de synchronisation différentielle
CREATE INDEX "space_objects_last_updated_idx" ON "space_objects" ("lastUpdated");

-- Ajout de la source de données Space-Track
INSERT INTO "data_sources" ("id", "name", "endpoint", "isActive", "status", "syncInterval", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'SPACE-TRACK',
  'https://www.space-track.org',
  true,
  'ACTIVE',
  3600, -- Synchronisation toutes les heures
  NOW(),
  NOW()
)
ON CONFLICT ("name") DO UPDATE
SET
  "endpoint" = EXCLUDED."endpoint",
  "isActive" = EXCLUDED."isActive",
  "status" = EXCLUDED."status",
  "syncInterval" = EXCLUDED."syncInterval",
  "updatedAt" = NOW();