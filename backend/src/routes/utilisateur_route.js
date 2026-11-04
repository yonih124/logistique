import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  authenticate,
  authorize,
} from "../middlewares/auth.middleware.js";

import * as utilisateurController from "../controllers/utilisateur_controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createUtilisateurSchema,
  updateUtilisateurSchema,
  utilisateurIdSchema,
} from "../validators/utilisateur.validator.js";

const router = Router();

router.use("/utilisateurs", authenticate, authorize("VALIDATEUR"));

router.get("/utilisateurs", utilisateurController.listerUtilisateursController);
router.get("/utilisateurs/:id", validate(utilisateurIdSchema), utilisateurController.obtenirUtilisateurController);
router.post("/utilisateurs", validate(createUtilisateurSchema), utilisateurController.creeUtlisateurController);
router.patch("/utilisateurs/:id", validate(updateUtilisateurSchema), utilisateurController.modifierUtilisateurController);
router.delete("/utilisateurs/:id", validate(utilisateurIdSchema), utilisateurController.supprimerUtilisateurController);

export const utilisateurRoute = router;
