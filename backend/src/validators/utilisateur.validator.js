import { z } from "zod";

const roleSchema = z.enum(["VALIDATEUR", "DEPOSITAIRE", "CLIENT"]);
const idSchema = z.coerce.number().int().positive();

const utilisateurBody = z.object({
  id_utilisateur_im: idSchema,
  role: roleSchema,
  nom_complet: z.string().trim().min(2).max(150),
  mail: z.email().nullable().optional(),
  service: z.string().trim().min(1).max(150),
  mot_de_passe: z.string().min(8).max(255),
  status_utilisateur: z.enum(["actif", "inactif"]),
});

export const createUtilisateurSchema = z.object({ body: utilisateurBody });

export const updateUtilisateurSchema = z.object({
  params: z.object({ id: idSchema }),
  body: utilisateurBody
    .omit({ id_utilisateur_im: true })
    .partial()
    .refine((body) => Object.keys(body).length > 0, "Aucune donnée à modifier"),
});

export const utilisateurIdSchema = z.object({
  params: z.object({ id: idSchema }),
});
