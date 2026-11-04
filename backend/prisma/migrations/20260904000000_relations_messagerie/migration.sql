CREATE INDEX "conversation_id_utilisateur_im_idx" ON "conversation"("id_utilisateur_im");
CREATE INDEX "conversation_id_utilisateur_im2_idx" ON "conversation"("id_utilisateur_im2");
CREATE INDEX "message_id_conversation_idx" ON "message"("id_conversation");
CREATE INDEX "message_id_utilisateur_im_idx" ON "message"("id_utilisateur_im");

ALTER TABLE "conversation" ADD CONSTRAINT "conversation_id_utilisateur_im_fkey" FOREIGN KEY ("id_utilisateur_im") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_id_utilisateur_im2_fkey" FOREIGN KEY ("id_utilisateur_im2") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message" ADD CONSTRAINT "message_id_conversation_fkey" FOREIGN KEY ("id_conversation") REFERENCES "conversation"("id_conversation") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message" ADD CONSTRAINT "message_id_utilisateur_im_fkey" FOREIGN KEY ("id_utilisateur_im") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;
