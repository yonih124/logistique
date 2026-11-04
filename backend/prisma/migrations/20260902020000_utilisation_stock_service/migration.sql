CREATE TABLE "utilisation_stock_service" (
    "id_utilisation" SERIAL NOT NULL,
    "quantite" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "date_utilisation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_utilisateur_im" INTEGER NOT NULL,
    "id_liste_demande" INTEGER NOT NULL,

    CONSTRAINT "utilisation_stock_service_pkey" PRIMARY KEY ("id_utilisation")
);

CREATE INDEX "utilisation_stock_service_id_utilisateur_im_idx" ON "utilisation_stock_service"("id_utilisateur_im");
CREATE INDEX "utilisation_stock_service_id_liste_demande_idx" ON "utilisation_stock_service"("id_liste_demande");

ALTER TABLE "utilisation_stock_service" ADD CONSTRAINT "utilisation_stock_service_id_utilisateur_im_fkey" FOREIGN KEY ("id_utilisateur_im") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "utilisation_stock_service" ADD CONSTRAINT "utilisation_stock_service_id_liste_demande_fkey" FOREIGN KEY ("id_liste_demande") REFERENCES "liste_demande"("id_liste_demande") ON DELETE RESTRICT ON UPDATE CASCADE;
