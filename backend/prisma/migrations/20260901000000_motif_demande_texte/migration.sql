ALTER TABLE "liste_demande"
ALTER COLUMN "motif_demande" TYPE TEXT
USING "motif_demande"::TEXT;
