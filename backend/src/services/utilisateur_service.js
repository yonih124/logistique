import { prisma } from "../config/prisma.js";
import bcrypt from 'bcryptjs';
import { notificationEvents, accountNotification } from './notification_service.js';

const publicSelect = {
    id_utilisateur_im: true,
    role: true,
    nom_complet: true,
    mail: true,
    id_service: true,
    Service: { select: { nom_service: true } },
    status_utilisateur: true,
    photo_url: true,
};

const withServiceName = utilisateur => utilisateur ? {
    ...utilisateur,
    service: utilisateur.Service?.nom_service || '',
} : utilisateur;

export async function creeUtilisateur(
    payload
){
    const hash_mdp = await bcrypt.hash(payload.mot_de_passe, 12) ;

    const utilisateur = await prisma.utilisateur.create({
        data: {
            id_utilisateur_im : payload.id_utilisateur_im,
            role: payload.role,
            nom_complet: payload.nom_complet,
            mail: payload.mail,
            Service: { connectOrCreate: { where: { nom_service: payload.service }, create: { nom_service: payload.service } } },
            mot_de_passe: hash_mdp,
            status_utilisateur: payload.status_utilisateur,
            photo_url: payload.photo_url || null,
        },
        select: publicSelect,
    });
    if (utilisateur.status_utilisateur === 'inactif') notificationEvents.emit('workflow', {
        role: 'VALIDATEUR', type: 'notification:new', data: accountNotification(utilisateur, new Date()),
    });
    return withServiceName(utilisateur);
}

export async function listerUtilisateurs() {
    const utilisateurs = await prisma.utilisateur.findMany({
        select: publicSelect,
        orderBy: { nom_complet: "asc" },
    });
    return utilisateurs.map(withServiceName);
}

export async function obtenirUtilisateur(id_utilisateur_im) {
    return withServiceName(await prisma.utilisateur.findUnique({
        where: { id_utilisateur_im },
        select: publicSelect,
    }));
}

export async function modifierUtilisateur(id_utilisateur_im, payload) {
    const data = { ...payload };

    if (data.service) {
        data.Service = { connectOrCreate: { where: { nom_service: data.service }, create: { nom_service: data.service } } };
        delete data.service;
    }

    if (data.mot_de_passe) {
        data.mot_de_passe = await bcrypt.hash(data.mot_de_passe, 12);
    }

    const utilisateur = await prisma.utilisateur.update({
        where: { id_utilisateur_im },
        data,
        select: publicSelect,
    });
    if (utilisateur.status_utilisateur !== 'inactif') notificationEvents.emit('workflow', {
        role: 'VALIDATEUR', type: 'notification:remove', data: { id: `compte-${id_utilisateur_im}` },
    });
    return withServiceName(utilisateur);
}

export async function supprimerUtilisateur(id_utilisateur_im) {
    const utilisateur = await prisma.utilisateur.delete({
        where: { id_utilisateur_im },
        select: publicSelect,
    });
    notificationEvents.emit('workflow', { role: 'VALIDATEUR', type: 'notification:remove', data: { id: `compte-${id_utilisateur_im}` } });
    return utilisateur;
}


// id_utilisateur_im   Int @id
//   role    Role
//   nom_complet   String
//   mail    String?
//   service   String
//   mot_de_passe    String
//   status_utilisateur    String
