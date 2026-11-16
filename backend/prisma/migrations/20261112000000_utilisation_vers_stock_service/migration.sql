-- Une sortie interne est désormais rattachée au stock du service (stock_service)
-- dont elle diminue le « restant », et non plus à une ligne de demande.

ALTER TABLE "utilisation_stock_service" ADD COLUMN "id_stock_service" INTEGER;

-- Reprise des sorties existantes : stock du service de l'agent pour l'article de l'ancienne ligne.
INSERT INTO "stock_service" ("id_service", "id_catalogue", "reparti", "restant")
SELECT DISTINCT u."id_service", ld."id_catalogue", 0, 0
FROM "utilisation_stock_service" us
JOIN "liste_demande" ld ON ld."id_liste_demande" = us."id_liste_demande"
JOIN "utilisateur" u ON u."id_utilisateur_im" = us."id_utilisateur_im"
ON CONFLICT ("id_service", "id_catalogue") DO NOTHING;

UPDATE "utilisation_stock_service" us
SET "id_stock_service" = ss."id_stock_service"
FROM "liste_demande" ld, "utilisateur" u, "stock_service" ss
WHERE ld."id_liste_demande" = us."id_liste_demande"
  AND u."id_utilisateur_im" = us."id_utilisateur_im"
  AND ss."id_service" = u."id_service"
  AND ss."id_catalogue" = ld."id_catalogue";

ALTER TABLE "utilisation_stock_service" ALTER COLUMN "id_stock_service" SET NOT NULL;

ALTER TABLE "utilisation_stock_service" DROP CONSTRAINT "utilisation_stock_service_id_liste_demande_fkey";
DROP INDEX "utilisation_stock_service_id_liste_demande_idx";
ALTER TABLE "utilisation_stock_service" DROP COLUMN "id_liste_demande";

CREATE INDEX "utilisation_stock_service_id_stock_service_idx" ON "utilisation_stock_service"("id_stock_service");
ALTER TABLE "utilisation_stock_service" ADD CONSTRAINT "utilisation_stock_service_id_stock_service_fkey"
  FOREIGN KEY ("id_stock_service") REFERENCES "stock_service"("id_stock_service") ON DELETE RESTRICT ON UPDATE CASCADE;
