ALTER TABLE "liste_demande" ADD COLUMN "stock_service_enregistre" BOOLEAN NOT NULL DEFAULT false;

UPDATE "liste_demande"
SET "stock_service_enregistre" = true
WHERE "status_reception" = 'RECU';
