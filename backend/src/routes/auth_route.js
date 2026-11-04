import { Router } from "express";
import { prisma } from '../config/prisma.js';
import rateLimit from "express-rate-limit";

import * as authControlleur from "../controllers/auth_controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { loginSchema, passwordSchema, photoSchema, profileSchema, registerSchema } from "../validators/auth.validator.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

const publicAuthLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/auth/login", publicAuthLimit, validate(loginSchema), authControlleur.login);
router.get('/auth/services', async (_req, res) => {
  res.json({ success: true, data: await prisma.service.findMany({ select: { id_service: true, nom_service: true }, orderBy: { nom_service: 'asc' } }) });
});
router.post("/auth/register", publicAuthLimit, validate(registerSchema), authControlleur.register);
router.post("/auth/photo", authenticate, validate(photoSchema), authControlleur.updatePhoto);
router.patch("/auth/profile", authenticate, validate(profileSchema), authControlleur.updateProfile);
router.patch("/auth/password", authenticate, validate(passwordSchema), authControlleur.updatePassword);

router.get("/auth/me", authenticate, authControlleur.me);
router.post("/auth/logout", authenticate, authControlleur.logout);

export const authRoute = router;
