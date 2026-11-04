import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export async function authenticate(req, _res, next) {
  try {
    const bearerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;

    const token = req.cookies?.access_token || bearerToken;

    if (!token) {
      throw new AppError("Authentification requise", 401);
    }

    const payload = jwt.verify(token, env.jwtSecret);

    const utilisateur = await prisma.utilisateur.findUnique({
      where: {
        id_utilisateur_im: Number(payload.sub),
      },
      select: {
        id_utilisateur_im: true,
        role: true,
        nom_complet: true,
        mail: true,
        id_service: true,
        Service: { select: { nom_service: true } },
        photo_url: true,
        status_utilisateur: true,
      },
    });

    if (!utilisateur || utilisateur.status_utilisateur !== "actif") {
      throw new AppError("Utilisateur invalide", 401);
    }

    req.utilisateur = { ...utilisateur, service: utilisateur.Service.nom_service };
    next();
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError("Token invalide ou expiré", 401)
    );
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.utilisateur) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié',
      });
    }

    if (!roles.includes(req.utilisateur.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé',
      });
    }

    next();
  };
}
