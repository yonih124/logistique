ALTER TABLE "liste_demande"
ADD COLUMN "quantite_accordee" INTEGER,
ADD COLUMN "pourcentage_accorde" INTEGER;

ALTER TABLE "liste_demande"
ADD CONSTRAINT "liste_demande_pourcentage_accorde_check"
CHECK ("pourcentage_accorde" IS NULL OR "pourcentage_accorde" BETWEEN 0 AND 100);
