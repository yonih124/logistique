import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {prisma} from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export async function login (id_utilisateur_im, mot_de_passe){
    const utilisateur = await prisma.utilisateur.findUnique(
        {where: {id_utilisateur_im}, include: { Service: true }});
    if (
        utilisateur?.status_utilisateur !== "actif" ||
        !(await bcrypt.compare(mot_de_passe,utilisateur.mot_de_passe))) 
        throw new AppError('Identifiants incorrects', 401);

    const token = jwt.sign(
        {sub: utilisateur.id_utilisateur_im, role: utilisateur.role},
        env.jwtSecret,
        {expiresIn: env.jwtExpiresIn}
    )
    const {mot_de_passe: _, ...safeUser} = utilisateur;
    safeUser.service = utilisateur.Service.nom_service;
    return {
        token,
        utilisateur: safeUser
    };
}

export async function changerMotDePasse(idUtilisateur, motDePasseActuel, nouveauMotDePasse) {
    const utilisateur = await prisma.utilisateur.findUnique({ where: { id_utilisateur_im: idUtilisateur } });
    if (!utilisateur || !(await bcrypt.compare(motDePasseActuel, utilisateur.mot_de_passe))) {
        throw new AppError('Mot de passe actuel incorrect', 400);
    }
    const hash = await bcrypt.hash(nouveauMotDePasse, 12);
    await prisma.utilisateur.update({
        where: { id_utilisateur_im: idUtilisateur },
        data: { mot_de_passe: hash },
    });
}
