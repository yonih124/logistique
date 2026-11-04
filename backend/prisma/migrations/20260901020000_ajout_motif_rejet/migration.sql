CREATE TABLE "motif_rejet" (
    "id_motif_rejet" SERIAL NOT NULL,
    "motif" TEXT NOT NULL,
    "date_rejet" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_liste_demande" INTEGER NOT NULL,
    CONSTRAINT "motif_rejet_pkey" PRIMARY KEY ("id_motif_rejet")
);

CREATE UNIQUE INDEX "motif_rejet_id_liste_demande_key"
ON "motif_rejet"("id_liste_demande");

ALTER TABLE "motif_rejet"
ADD CONSTRAINT "motif_rejet_id_liste_demande_fkey"
FOREIGN KEY ("id_liste_demande") REFERENCES "liste_demande"("id_liste_demande")
ON DELETE CASCADE ON UPDATE CASCADE;
