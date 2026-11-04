import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    id_utilisateur_im: z.coerce
      .number({ error: "L'identifiant doit être un nombre" })
      .int("L'identifiant doit être un entier")
      .positive("L'identifiant doit être positif"),
    mot_de_passe: z
      .string({ error: "Le mot de passe est obligatoire" })
      .min(1, "Le mot de passe est obligatoire"),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    id_utilisateur_im: z.coerce.number().int().positive(),
    role: z.enum(["CLIENT", "DEPOSITAIRE"]),
    nom_complet: z.string().trim().min(2).max(150),
    mail: z.email(),
    service: z.string().trim().min(1).max(150),
    mot_de_passe: z.string().min(8).max(255),
    photo_profil: z.string().max(3_000_000).optional(),
  }),
});

export const photoSchema = z.object({
  body: z.object({ photo_profil: z.string().max(3_000_000) }),
});

export const profileSchema = z.object({
  body: z.object({
    nom_complet: z.string().trim().min(2).max(150),
    mail: z.email(),
    service: z.string().trim().min(1).max(150),
  }),
});

export const passwordSchema = z.object({
  body: z.object({
    mot_de_passe_actuel: z.string().min(1),
    nouveau_mot_de_passe: z.string().min(8).max(255),
  }),
});
