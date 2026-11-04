import * as listeEntreService from "../services/liste_entre_service.js";

export async function creerEntreeController(req, res) {
  const data = await listeEntreService.creerEntree(req.body);

  res.status(201).json({
    success: true,
    message: "Produit ajouté et stock mis à jour avec succès",
    data,
  });
}

export async function creerPlusieursEntreesController(req, res) {
  const data = await listeEntreService.creerPlusieursEntrees(
    req.body.id_justification_entre,
    req.body.produits,
  );

  res.status(201).json({
    success: true,
    message: `${data.lignes.length} produit(s) ajouté(s) et stock mis à jour`,
    data,
  });
}
