CREATE TABLE "modification_stock" (
  "id_modification_stock" SERIAL PRIMARY KEY,
  "quantite_avant" INTEGER NOT NULL CHECK ("quantite_avant" >= 0),
  "quantite_apres" INTEGER NOT NULL CHECK ("quantite_apres" >= 0),
  "motif" TEXT NOT NULL CHECK (length(trim("motif")) > 0),
  "id_stock" INTEGER NOT NULL,
  CONSTRAINT "modification_stock_id_stock_fkey" FOREIGN KEY ("id_stock") REFERENCES "stock"("id_stock") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "modification_stock_id_stock_idx" ON "modification_stock"("id_stock");
