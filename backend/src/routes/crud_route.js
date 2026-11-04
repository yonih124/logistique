import { proposerQuantites } from '../services/demande_limit_service.js';
import { updateDivision, deleteDivision } from '../services/dispatch_service.js';
import { notificationEvents } from '../services/notification_service.js';
import { creerDemandeComplete } from '../services/liste_demande_service.js';
import { demandeCompleteSchema } from '../validators/crud.validator.js';
import { Router } from "express";
import { entreeCompleteSchema } from '../validators/crud.validator.js';
import { creerEntreeComplete } from '../services/liste_entre_service.js';
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { creerCrudService } from "../services/crud_service.js";
import { creerCrudController } from "../controllers/crud_controller.js";
import {
  catalogueSchemas,
  stockSchemas,
  listeEntreSchemas,
  listeEntreMultipleSchema,
  justificationEntreSchemas,
  compteSchemas,
  uniteSchemas,
  demandeClientSchemas,
  listeDemandeSchemas,
  listeDemandeMultipleSchema,
  motifRejetSchemas,
  confirmerDemandeSchema,
  conversationSchemas,
  messageSchemas,
  historiqueSchemas,
  dispatchInterneSchema,
  utilisationStockSchema,
  divisionSchema,
  receptionSchema,
  serviceSchemas,
} from "../validators/crud.validator.js";
import {
  creerEntreeController,
  creerPlusieursEntreesController,
} from "../controllers/liste_entre_controller.js";
import { creerPlusieursLignesDemandeController } from "../controllers/liste_demande_controller.js";
import { prisma } from "../config/prisma.js";
import { getDashboard } from "../services/dashboard_service.js";
import { confirmerDemande } from "../services/validation_demande_service.js";
import { createDispatch, createDivision, createStockUsage, getServiceStock, listDispatches, listDivisions, listStockUsages, receiveLines } from "../services/dispatch_service.js";
import { getOperationsHistory } from "../services/history_service.js";

const router = Router();
router.post('/demandes-client', authenticate, authorize('CLIENT'), validate(demandeCompleteSchema), async (req, res) => {
  res.status(201).json({ success: true, data: await creerDemandeComplete(req.utilisateur, req.body) });
});


router.post('/entrees-stock', authenticate, authorize('DEPOSITAIRE', 'VALIDATEUR'), validate(entreeCompleteSchema), async (req, res) => {
  res.status(201).json({ success: true, data: await creerEntreeComplete(req.utilisateur, req.body) });
});

router.get('/historique-operations', authenticate, authorize('CLIENT', 'DEPOSITAIRE', 'VALIDATEUR'), async (req, res) => {
  res.json({ success: true, data: await getOperationsHistory(req.utilisateur) });
});

router.get('/stock-service', authenticate, authorize('CLIENT', 'DEPOSITAIRE', 'VALIDATEUR'), async (req, res) => {
  res.json({ success: true, data: await getServiceStock(req.utilisateur) });
});

router.get('/dispatches', authenticate, authorize('CLIENT', 'DEPOSITAIRE', 'VALIDATEUR'), async (req, res) => {
  res.json({ success: true, data: await listDispatches(req.utilisateur) });
});

router.post('/dispatches', authenticate, authorize('CLIENT'), validate(dispatchInterneSchema), async (req, res) => {
  const data = await createDispatch(req.utilisateur, req.body);
  res.status(201).json({ success: true, message: 'Dispatch enregistré', data });
});

router.patch('/divisions/:id', authenticate, authorize('CLIENT'), validate(divisionSchema), async (req, res) => {
  res.json({ success: true, data: await updateDivision(req.utilisateur, Number(req.params.id), req.body.nom_division) });
});
router.delete('/divisions/:id', authenticate, authorize('CLIENT'), async (req, res) => {
  res.json({ success: true, data: await deleteDivision(req.utilisateur, Number(req.params.id)) });
});
router.get('/divisions', authenticate, authorize('CLIENT', 'DEPOSITAIRE', 'VALIDATEUR'), async (req, res) => {
  res.json({ success: true, data: await listDivisions(req.utilisateur) });
});

router.post('/divisions', authenticate, authorize('CLIENT'), validate(divisionSchema), async (req, res) => {
  res.status(201).json({ success: true, data: await createDivision(req.utilisateur, req.body.nom_division) });
});

router.post('/receptions', authenticate, authorize('CLIENT'), validate(receptionSchema), async (req, res) => {
  res.json({ success: true, message: 'Réception enregistrée', data: await receiveLines(req.utilisateur, req.body.decisions) });
});

router.get('/utilisations-stock-service', authenticate, authorize('CLIENT', 'DEPOSITAIRE', 'VALIDATEUR'), async (req, res) => {
  res.json({ success: true, data: await listStockUsages(req.utilisateur) });
});

router.post('/utilisations-stock-service', authenticate, authorize('CLIENT'), validate(utilisationStockSchema), async (req, res) => {
  const data = await createStockUsage(req.utilisateur, req.body);
  res.status(201).json({ success: true, message: 'Sortie du stock interne enregistrée', data });
});

router.get("/dashboard", authenticate, async (req, res) => {
  const data = await getDashboard(req.utilisateur);
  res.json({ success: true, data });
});

router.post(
  "/demandes/:id/confirmer",
  authenticate,
  authorize("VALIDATEUR", "DEPOSITAIRE"),
  validate(confirmerDemandeSchema),
  async (req, res) => {
    const data = await confirmerDemande(req.params.id, req.body.decisions);
    res.json({ success: true, message: "Demande traitée et stock mis à jour", data });
  },
);

router.get(
  "/catalogues-disponibles",
  authenticate,
  authorize("CLIENT", "DEPOSITAIRE", "VALIDATEUR"),
  async (_req, res) => {
    const data = await prisma.catalogue.findMany({
      select: {
        id_catalogue: true,
        designation: true,
        id_compte: true,
        Compte: { select: { id_compte: true, categorie: true } },
      },
      orderBy: { designation: "asc" },
    });
    res.json({ success: true, data });
  },
);

router.get(
  "/mes-demandes",
  authenticate,
  authorize("CLIENT"),
  async (req, res) => {
    const data = await prisma.demande_client.findMany({
      where: { id_utilisateur_im: req.utilisateur.id_utilisateur_im },
      include: {
        Liste_demande: {
          include: {
            Catalogue: {
              select: { id_catalogue: true, designation: true },
            },
            Motif_rejet: true,
          },
          orderBy: { id_liste_demande: "asc" },
        },
      },
      orderBy: { date_demande: "desc" },
    });
    res.json({ success: true, data });
  },
);

router.get(
  "/demandes-a-valider",
  authenticate,
  authorize("VALIDATEUR", "DEPOSITAIRE"),
  async (_req, res) => {
    const data = await prisma.demande_client.findMany({
      where: { status_demande: "ENVOYER" },
      include: {
        Utilisateur: {
          select: { id_utilisateur_im: true, nom_complet: true, Service: true },
        },
        Liste_demande: {
          include: {
            Catalogue: {
              include: { Stock: true },
            },
          },
          orderBy: { id_liste_demande: "asc" },
        },
      },
      orderBy: { date_demande: "asc" },
    });
    res.json({ success: true, data: data.map(demande => ({ ...demande, Liste_demande: proposerQuantites(demande.Liste_demande) })) });
  },
);

router.get(
  "/bons-livraison",
  authenticate,
  authorize("DEPOSITAIRE", "VALIDATEUR"),
  async (_req, res) => {
    const data = await prisma.demande_client.findMany({
      where: { status_demande: "VALIDER" },
      include: {
        Utilisateur: { select: { id_utilisateur_im: true, nom_complet: true, Service: true } },
        Liste_demande: {
          where: { status_liste_demande: { in: ["VALIDER", "MODIFIER"] } },
          include: { Catalogue: { include: { Unite: true } } },
          orderBy: { id_liste_demande: "asc" },
        },
      },
      orderBy: { date_demande: "asc" },
    });
    res.json({ success: true, data });
  },
);

router.post(
  "/bons-livraison/:id/imprimer",
  authenticate,
  authorize("DEPOSITAIRE"),
  async (req, res) => {
    const data = await prisma.demande_client.update({
      where: { id_demande_client: Number(req.params.id), status_demande: "VALIDER" },
      data: { status_demande: "BON_IMPRIME", date_livraison: new Date() },
    });
    notificationEvents.emit('workflow', { role: 'DEPOSITAIRE', type: 'notification:remove', data: { id: `bon-${data.id_demande_client}` } });
    res.json({ success: true, message: "Bon imprimé et archivé", data });
  },
);

router.post(
  "/listes-entree/multiple",
  authenticate,
  authorize("DEPOSITAIRE", "VALIDATEUR"),
  validate(listeEntreMultipleSchema),
  creerPlusieursEntreesController,
);

router.post(
  "/listes-entree",
  authenticate,
  authorize("DEPOSITAIRE", "VALIDATEUR"),
  validate(listeEntreSchemas.create),
  creerEntreeController,
);

router.post(
  "/listes-demande/multiple",
  authenticate,
  authorize("CLIENT", "VALIDATEUR"),
  validate(listeDemandeMultipleSchema),
  creerPlusieursLignesDemandeController,
);

const ressources = [
  { path: "catalogues", model: "catalogue", id: "id_catalogue", nom: "Catalogue", schemas: catalogueSchemas, roles: ["DEPOSITAIRE", "VALIDATEUR"] },
  { path: "stocks", model: "stock", id: "id_stock", nom: "Stock", schemas: stockSchemas, roles: ["DEPOSITAIRE", "VALIDATEUR"] },
  { path: "listes-entree", model: "liste_entre", id: "id_liste_entre", nom: "Ligne d'entrée", schemas: listeEntreSchemas, roles: ["DEPOSITAIRE", "VALIDATEUR"] },
  { path: "justifications-entree", model: "justification_entre", id: "id_justification_entre", nom: "Justification d'entrée", schemas: justificationEntreSchemas, roles: ["DEPOSITAIRE", "VALIDATEUR"] },
  { path: "comptes", model: "compte", id: "id_compte", nom: "Compte", schemas: compteSchemas, roles: ["DEPOSITAIRE", "VALIDATEUR"] },
  { path: "unites", model: "unite", id: "id_unite", nom: "Unité", schemas: uniteSchemas, roles: ["DEPOSITAIRE", "VALIDATEUR"] },
  { path: "services", model: "service", id: "id_service", nom: "Service", schemas: serviceSchemas, roles: ["DEPOSITAIRE", "VALIDATEUR"] },
  { path: "demandes", model: "demande_client", id: "id_demande_client", nom: "Demande", schemas: demandeClientSchemas, roles: ["VALIDATEUR", "DEPOSITAIRE"] },
  { path: "listes-demande", model: "liste_demande", id: "id_liste_demande", nom: "Ligne de demande", schemas: listeDemandeSchemas, roles: ["VALIDATEUR", "DEPOSITAIRE"] },
  { path: "motifs-rejet", model: "motif_rejet", id: "id_motif_rejet", nom: "Motif de rejet", schemas: motifRejetSchemas, roles: ["VALIDATEUR"] },
  { path: "historiques", model: "historique_changement", id: "id_model_historique_changement", nom: "Historique", schemas: historiqueSchemas, roles: ["VALIDATEUR"] },
];

for (const ressource of ressources) {
  const service = creerCrudService(ressource.model, ressource.id);
  const controller = creerCrudController(service, ressource.nom);
  const base = `/${ressource.path}`;
  const protection = [authenticate, authorize(...ressource.roles)];

  router.get(base, ...protection, controller.lister);
  router.get(`${base}/:id`, ...protection, validate(ressource.schemas.id), controller.obtenir);
  if (ressource.path !== "listes-entree") {
    router.post(base, ...protection, validate(ressource.schemas.create), controller.creer);
  }
  router.patch(`${base}/:id`, ...protection, validate(ressource.schemas.update), controller.modifier);
  router.delete(`${base}/:id`, ...protection, validate(ressource.schemas.id), controller.supprimer);
}

export const crudRoute = router;
