import * as listeDemandeService from "../services/liste_demande_service.js";

export async function creerPlusieursLignesDemandeController(req, res) {
  const lignes = await listeDemandeService.creerPlusieursLignesDemande(
    req.body.id_demande_client,
    req.body.produits,
    req.utilisateur,
  );

  res.status(201).json({
    success: true,
    message: `${lignes.length} produit(s) ajouté(s) à la demande`,
    data: lignes,
  });
}
