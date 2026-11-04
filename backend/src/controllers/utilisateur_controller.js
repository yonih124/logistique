import * as utilisateurService from "../services/utilisateur_service.js";

export async function creeUtlisateurController(req, res){
    const utilisateur = await utilisateurService.creeUtilisateur(
        req.body
    );

    res.status(201).json({
        success: true,
        message: "Client cree avec succes",
        data: utilisateur
    });
}

export async function listerUtilisateursController(_req, res) {
    const utilisateurs = await utilisateurService.listerUtilisateurs();
    res.json({ success: true, data: utilisateurs });
}

export async function obtenirUtilisateurController(req, res) {
    const utilisateur = await utilisateurService.obtenirUtilisateur(req.params.id);
    if (!utilisateur) {
        return res.status(404).json({ success: false, message: "Utilisateur introuvable" });
    }
    res.json({ success: true, data: utilisateur });
}

export async function modifierUtilisateurController(req, res) {
    const utilisateur = await utilisateurService.modifierUtilisateur(req.params.id, req.body);
    res.json({ success: true, message: "Utilisateur modifié avec succès", data: utilisateur });
}

export async function supprimerUtilisateurController(req, res) {
    const utilisateur = await utilisateurService.supprimerUtilisateur(req.params.id);
    res.json({ success: true, message: "Utilisateur supprimé avec succès", data: utilisateur });
}
