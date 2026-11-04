ALTER TABLE "catalogue" ADD COLUMN "pourcentage_demande_max" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "catalogue" ADD CONSTRAINT "catalogue_pourcentage_demande_max_check" CHECK ("pourcentage_demande_max" BETWEEN 0 AND 100);
