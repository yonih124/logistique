ALTER TABLE "demande_client" ADD COLUMN "date_traitement" TIMESTAMP(3);
ALTER TABLE "liste_demande" ADD COLUMN "date_reception" TIMESTAMP(3);

UPDATE "demande_client"
SET "date_traitement" = "date_demande"
WHERE "status_demande" IN ('VALIDER', 'REFUSER', 'BON_IMPRIME');

UPDATE "demande_client"
SET "date_livraison" = COALESCE("date_livraison", "date_traitement", "date_demande")
WHERE "status_demande" = 'BON_IMPRIME';

UPDATE "liste_demande"
SET "date_reception" = dc."date_livraison"
FROM "demande_client" dc
WHERE dc."id_demande_client" = "liste_demande"."id_demande_client"
  AND "liste_demande"."status_reception" <> 'EN_ATTENTE';
