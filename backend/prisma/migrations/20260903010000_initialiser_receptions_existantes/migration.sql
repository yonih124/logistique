UPDATE "liste_demande" ld
SET "status_reception" = 'RECU'
FROM "demande_client" dc
WHERE dc."id_demande_client" = ld."id_demande_client"
  AND dc."status_demande" = 'BON_IMPRIME'
  AND ld."status_liste_demande" IN ('VALIDER', 'MODIFIER');
