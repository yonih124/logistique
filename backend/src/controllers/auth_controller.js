import * as authservice from "../services/auth_service.js";
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { creeUtilisateur, modifierUtilisateur, obtenirUtilisateur } from "../services/utilisateur_service.js";
import { enregistrerPhoto, supprimerPhoto } from "../services/photo_service.js";
import { env } from "../config/env.js";

export async function login(req, res) {
    const data = await authservice.login(
        req.body.id_utilisateur_im, 
        req.body.mot_de_passe
    );

    res.cookie("access_token", data.token, {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: env.cookieSameSite,
        maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
        success: true,
        data: {
            utilisateur: data.utilisateur
        }
    })
}

export async function me(req, res) {
    res.json({
        success: true,
        data: req.utilisateur
    })
}

export async function logout(_req, res) {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
  });

  res.json({
    success: true,
    message: "Déconnexion réussie",
  });
}

export async function register(req, res) {
  const service = await prisma.service.findUnique({ where: { nom_service: req.body.service } });
  if (!service) throw new AppError('Sélectionnez un service existant.', 400);
  let photoUrl = null;
  try {
    if (req.body.photo_profil) photoUrl = await enregistrerPhoto(req.body.photo_profil);
    const { photo_profil: _, ...account } = req.body;
    const utilisateur = await creeUtilisateur({ ...account, photo_url: photoUrl, status_utilisateur: "inactif" });
    res.status(201).json({ success: true, message: "Demande d'inscription envoyée", data: { utilisateur } });
  } catch (error) {
    if (photoUrl) await supprimerPhoto(photoUrl);
    throw error;
  }
}

export async function updatePhoto(req, res) {
  const current = await obtenirUtilisateur(req.utilisateur.id_utilisateur_im);
  const photoUrl = await enregistrerPhoto(req.body.photo_profil);
  try {
    const utilisateur = await modifierUtilisateur(req.utilisateur.id_utilisateur_im, { photo_url: photoUrl });
    await supprimerPhoto(current?.photo_url);
    res.json({ success: true, message: "Photo de profil mise à jour", data: { utilisateur } });
  } catch (error) {
    await supprimerPhoto(photoUrl);
    throw error;
  }
}

export async function updateProfile(req, res) {
  const utilisateur = await modifierUtilisateur(req.utilisateur.id_utilisateur_im, req.body);
  res.json({ success: true, message: "Profil mis à jour", data: { utilisateur } });
}

export async function updatePassword(req, res) {
  await authservice.changerMotDePasse(
    req.utilisateur.id_utilisateur_im,
    req.body.mot_de_passe_actuel,
    req.body.nouveau_mot_de_passe,
  );
  res.json({ success: true, message: "Mot de passe modifié" });
}
