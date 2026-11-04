CREATE TYPE "StatusReception" AS ENUM ('EN_ATTENTE', 'RECU', 'NON_RECU');

CREATE TABLE "service" (
  "id_service" SERIAL NOT NULL,
  "nom_service" TEXT NOT NULL,
  CONSTRAINT "service_pkey" PRIMARY KEY ("id_service")
);
CREATE UNIQUE INDEX "service_nom_service_key" ON "service"("nom_service");

INSERT INTO "service" ("nom_service")
SELECT DISTINCT "service" FROM "utilisateur";

ALTER TABLE "utilisateur" ADD COLUMN "id_service" INTEGER;
UPDATE "utilisateur" u SET "id_service" = s."id_service" FROM "service" s WHERE s."nom_service" = u."service";
ALTER TABLE "utilisateur" ALTER COLUMN "id_service" SET NOT NULL;
ALTER TABLE "utilisateur" DROP COLUMN "service";
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_id_service_fkey" FOREIGN KEY ("id_service") REFERENCES "service"("id_service") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "liste_demande" ADD COLUMN "status_reception" "StatusReception" NOT NULL DEFAULT 'EN_ATTENTE';

CREATE TABLE "stock_service" (
  "id_stock_service" SERIAL NOT NULL,
  "id_service" INTEGER NOT NULL,
  "id_catalogue" INTEGER NOT NULL,
  "reparti" INTEGER NOT NULL DEFAULT 0,
  "restant" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "stock_service_pkey" PRIMARY KEY ("id_stock_service")
);
CREATE UNIQUE INDEX "stock_service_id_service_id_catalogue_key" ON "stock_service"("id_service", "id_catalogue");
ALTER TABLE "stock_service" ADD CONSTRAINT "stock_service_id_service_fkey" FOREIGN KEY ("id_service") REFERENCES "service"("id_service") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_service" ADD CONSTRAINT "stock_service_id_catalogue_fkey" FOREIGN KEY ("id_catalogue") REFERENCES "catalogue"("id_catalogue") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "stock_service" ("id_service", "id_catalogue", "reparti", "restant")
SELECT u."id_service", ld."id_catalogue",
  COALESCE(SUM((SELECT COALESCE(SUM(di."quantite"), 0) FROM "dispatch_interne" di WHERE di."id_liste_demande" = ld."id_liste_demande")), 0)::INTEGER,
  GREATEST(
    SUM(COALESCE(ld."quantite_accordee", 0))
    - SUM((SELECT COALESCE(SUM(di."quantite"), 0) FROM "dispatch_interne" di WHERE di."id_liste_demande" = ld."id_liste_demande"))
    - SUM((SELECT COALESCE(SUM(us."quantite"), 0) FROM "utilisation_stock_service" us WHERE us."id_liste_demande" = ld."id_liste_demande")),
    0
  )::INTEGER
FROM "liste_demande" ld
JOIN "demande_client" dc ON dc."id_demande_client" = ld."id_demande_client"
JOIN "utilisateur" u ON u."id_utilisateur_im" = dc."id_utilisateur_im"
WHERE dc."status_demande" = 'BON_IMPRIME' AND ld."status_liste_demande" IN ('VALIDER', 'MODIFIER')
GROUP BY u."id_service", ld."id_catalogue";

CREATE TABLE "division" (
  "id_division" SERIAL NOT NULL,
  "nom_division" TEXT NOT NULL,
  "id_service" INTEGER NOT NULL,
  CONSTRAINT "division_pkey" PRIMARY KEY ("id_division")
);
CREATE UNIQUE INDEX "division_id_service_nom_division_key" ON "division"("id_service", "nom_division");
ALTER TABLE "division" ADD CONSTRAINT "division_id_service_fkey" FOREIGN KEY ("id_service") REFERENCES "service"("id_service") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "division" ("nom_division", "id_service")
SELECT DISTINCT di."destination", u."id_service"
FROM "dispatch_interne" di JOIN "utilisateur" u ON u."id_utilisateur_im" = di."id_utilisateur_im";

CREATE TABLE "dispatch" (
  "id_dispatch" SERIAL NOT NULL,
  "id_division" INTEGER NOT NULL,
  "id_stock_service" INTEGER NOT NULL,
  "nombre" INTEGER NOT NULL,
  "date_dispatch" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "id_utilisateur_im" INTEGER NOT NULL,
  CONSTRAINT "dispatch_pkey" PRIMARY KEY ("id_dispatch")
);
CREATE INDEX "dispatch_id_utilisateur_im_idx" ON "dispatch"("id_utilisateur_im");
CREATE INDEX "dispatch_id_stock_service_idx" ON "dispatch"("id_stock_service");
ALTER TABLE "dispatch" ADD CONSTRAINT "dispatch_id_utilisateur_im_fkey" FOREIGN KEY ("id_utilisateur_im") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch" ADD CONSTRAINT "dispatch_id_division_fkey" FOREIGN KEY ("id_division") REFERENCES "division"("id_division") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch" ADD CONSTRAINT "dispatch_id_stock_service_fkey" FOREIGN KEY ("id_stock_service") REFERENCES "stock_service"("id_stock_service") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "dispatch" ("id_division", "id_stock_service", "nombre", "date_dispatch", "id_utilisateur_im")
SELECT dv."id_division", ss."id_stock_service", di."quantite", di."date_dispatch", di."id_utilisateur_im"
FROM "dispatch_interne" di
JOIN "utilisateur" u ON u."id_utilisateur_im" = di."id_utilisateur_im"
JOIN "liste_demande" ld ON ld."id_liste_demande" = di."id_liste_demande"
JOIN "division" dv ON dv."id_service" = u."id_service" AND dv."nom_division" = di."destination"
JOIN "stock_service" ss ON ss."id_service" = u."id_service" AND ss."id_catalogue" = ld."id_catalogue";

DROP TABLE "dispatch_interne";
