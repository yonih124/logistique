export function creerCrudController(service, nomRessource) {
  return {
    async lister(_req, res) {
      const data = await service.lister();
      res.json({ success: true, data });
    },

    async obtenir(req, res) {
      const data = await service.obtenir(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: `${nomRessource} introuvable` });
      }
      res.json({ success: true, data });
    },

    async creer(req, res) {
      const data = await service.creer(req.body);
      res.status(201).json({ success: true, message: `${nomRessource} créé avec succès`, data });
    },

    async modifier(req, res) {
      const data = await service.modifier(req.params.id, req.body);
      res.json({ success: true, message: `${nomRessource} modifié avec succès`, data });
    },

    async supprimer(req, res) {
      const data = await service.supprimer(req.params.id);
      res.json({ success: true, message: `${nomRessource} supprimé avec succès`, data });
    },
  };
}
