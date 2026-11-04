-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VALIDATEUR', 'DEPOSITAIRE', 'CLIENT');

-- CreateEnum
CREATE TYPE "StatusDemande" AS ENUM ('ENVOYER', 'REFUSER', 'VALIDER');

-- CreateEnum
CREATE TYPE "StatusListeDemande" AS ENUM ('REJETER', 'VALIDER', 'MODIFIER');

-- CreateTable
CREATE TABLE "utilisateur" (
    "id_utilisateur_im" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "nom_complet" TEXT NOT NULL,
    "mail" TEXT,
    "service" TEXT NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "status_utilisateur" TEXT NOT NULL,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_utilisateur_im")
);

-- CreateTable
CREATE TABLE "catalogue" (
    "id_catalogue" SERIAL NOT NULL,
    "designation" TEXT NOT NULL,
    "emplacement" TEXT,
    "stock_min" INTEGER NOT NULL,
    "id_compte" INTEGER NOT NULL,
    "id_unite" INTEGER NOT NULL,

    CONSTRAINT "catalogue_pkey" PRIMARY KEY ("id_catalogue")
);

-- CreateTable
CREATE TABLE "stock" (
    "id_stock" SERIAL NOT NULL,
    "quantite_stock" INTEGER NOT NULL,
    "id_catalogue" INTEGER NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id_stock")
);

-- CreateTable
CREATE TABLE "liste_entre" (
    "id_liste_entre" SERIAL NOT NULL,
    "id_catalogue" INTEGER NOT NULL,
    "id_justification_entre" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL,

    CONSTRAINT "liste_entre_pkey" PRIMARY KEY ("id_liste_entre")
);

-- CreateTable
CREATE TABLE "justification_entre" (
    "id_justification_entre" INTEGER NOT NULL,
    "date_piece" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marche_concerne" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "id_utilisateur_im" INTEGER NOT NULL,

    CONSTRAINT "justification_entre_pkey" PRIMARY KEY ("id_justification_entre")
);

-- CreateTable
CREATE TABLE "compte" (
    "id_compte" INTEGER NOT NULL,
    "categorie" TEXT,
    "description" TEXT,

    CONSTRAINT "compte_pkey" PRIMARY KEY ("id_compte")
);

-- CreateTable
CREATE TABLE "unite" (
    "id_unite" SERIAL NOT NULL,
    "unite" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "unite_pkey" PRIMARY KEY ("id_unite")
);

-- CreateTable
CREATE TABLE "demande_client" (
    "id_demande_client" SERIAL NOT NULL,
    "date_demande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_livraison" TIMESTAMP(3),
    "status_demande" "StatusDemande" NOT NULL,
    "Urgence" TEXT NOT NULL,
    "id_utilisateur_im" INTEGER NOT NULL,

    CONSTRAINT "demande_client_pkey" PRIMARY KEY ("id_demande_client")
);

-- CreateTable
CREATE TABLE "liste_demande" (
    "id_liste_demande" SERIAL NOT NULL,
    "id_catalogue" INTEGER NOT NULL,
    "quantite_liste_demande" INTEGER NOT NULL,
    "motif_demande" INTEGER NOT NULL,
    "status_liste_demande" "StatusListeDemande" NOT NULL,
    "id_demande_client" INTEGER NOT NULL,

    CONSTRAINT "liste_demande_pkey" PRIMARY KEY ("id_liste_demande")
);

-- CreateTable
CREATE TABLE "historique_changement" (
    "id_model_historique_changement" SERIAL NOT NULL,

    CONSTRAINT "historique_changement_pkey" PRIMARY KEY ("id_model_historique_changement")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id_conversation" SERIAL NOT NULL,
    "id_utilisateur_im" INTEGER NOT NULL,
    "id_utilisateur_im2" INTEGER NOT NULL,
    "date_conversation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id_conversation")
);

-- CreateTable
CREATE TABLE "message" (
    "id_message" SERIAL NOT NULL,
    "id_conversation" INTEGER NOT NULL,
    "id_utilisateur_im" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "status_message" TEXT NOT NULL,
    "date_message" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id_message")
);

-- AddForeignKey
ALTER TABLE "catalogue" ADD CONSTRAINT "catalogue_id_compte_fkey" FOREIGN KEY ("id_compte") REFERENCES "compte"("id_compte") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue" ADD CONSTRAINT "catalogue_id_unite_fkey" FOREIGN KEY ("id_unite") REFERENCES "unite"("id_unite") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_id_catalogue_fkey" FOREIGN KEY ("id_catalogue") REFERENCES "catalogue"("id_catalogue") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liste_entre" ADD CONSTRAINT "liste_entre_id_catalogue_fkey" FOREIGN KEY ("id_catalogue") REFERENCES "catalogue"("id_catalogue") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liste_entre" ADD CONSTRAINT "liste_entre_id_justification_entre_fkey" FOREIGN KEY ("id_justification_entre") REFERENCES "justification_entre"("id_justification_entre") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justification_entre" ADD CONSTRAINT "justification_entre_id_utilisateur_im_fkey" FOREIGN KEY ("id_utilisateur_im") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demande_client" ADD CONSTRAINT "demande_client_id_utilisateur_im_fkey" FOREIGN KEY ("id_utilisateur_im") REFERENCES "utilisateur"("id_utilisateur_im") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liste_demande" ADD CONSTRAINT "liste_demande_id_catalogue_fkey" FOREIGN KEY ("id_catalogue") REFERENCES "catalogue"("id_catalogue") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liste_demande" ADD CONSTRAINT "liste_demande_id_demande_client_fkey" FOREIGN KEY ("id_demande_client") REFERENCES "demande_client"("id_demande_client") ON DELETE RESTRICT ON UPDATE CASCADE;
