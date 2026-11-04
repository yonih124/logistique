CREATE TABLE "photo_justification" (
  "id_photo_justification" SERIAL PRIMARY KEY,
  "url_photo" TEXT NOT NULL,
  "id_justification_entre" INTEGER NOT NULL REFERENCES "justification_entre"("id_justification_entre") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "photo_justification_id_justification_entre_idx" ON "photo_justification"("id_justification_entre");
INSERT INTO "photo_justification" ("url_photo", "id_justification_entre")
SELECT "image_url", "id_justification_entre" FROM "justification_entre" WHERE "image_url" IS NOT NULL;
ALTER TABLE "justification_entre" DROP COLUMN "image_url";
