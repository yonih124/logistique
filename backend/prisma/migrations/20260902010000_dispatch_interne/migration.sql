CREATE TABLE "dispatch_interne" (
    "id_dispatch" SERIAL NOT NULL,
    "destination" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "date_dispatch" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_utilisateur_im" INTEGER NOT NULL,
    "id_liste_demande" INTEGER NOT NULL,

    CONSTRAINT "dispatch_interne_pkey" PRIMARY KEY ("id_dispatch")
);

CREATE INDEX "dispatch_interne_id_utilisateur_im_idx" ON "dispatch_interne"("id_utilisateur_im");
CREATE INDEX "dispatch_interne_id_liste_demande_idx" ON "dispatch_interne"("id_liste_demande");

ALTER TABLE "dispatch_interne" ADD CONSTRAINT "dispatch_interne_id_utilisateur_im_fkey" FOREIGN KEY ("id_utilisateur_im") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dispatch_interne" ADD CONSTRAINT "dispatch_interne_id_liste_demande_fkey" FOREIGN KEY ("id_liste_demande") REFERENCES "liste_demande"("id_liste_demande") ON DELETE RESTRICT ON UPDATE CASCADE;
