import { z } from "zod";

const int = z.coerce.number().int();
const positiveInt = int.positive();
const nonNegativeInt = int.nonnegative();
const requiredString = z.string().trim().min(1);

function schemas(bodySchema, immutableFields = {}) {
  const params = z.object({ id: positiveInt });
  return {
    create: z.object({ body: bodySchema }),
    update: z.object({
      params,
      body: bodySchema.omit(immutableFields).partial().refine(
        (body) => Object.keys(body).length > 0,
        "Aucune donnée à modifier",
      ),
    }),
    id: z.object({ params }),
  };
}

export const catalogueSchemas = schemas(z.object({
  pourcentage_demande_max: z.coerce.number().int().min(0).max(100).optional(),
  designation: requiredString.max(255),
  emplacement: z.string().trim().max(255).nullable().optional(),
  stock_min: nonNegativeInt,
  id_compte: positiveInt,
  id_unite: positiveInt,
}));

export const stockSchemas = schemas(z.object({
  quantite_stock: nonNegativeInt,
  id_catalogue: positiveInt,
}));

export const listeEntreSchemas = schemas(z.object({
  id_catalogue: positiveInt,
  id_justification_entre: positiveInt,
  quantite: positiveInt,
}));

export const listeEntreMultipleSchema = z.object({
  body: z.object({
    id_justification_entre: positiveInt,
    produits: z.array(z.object({
      id_catalogue: positiveInt,
      quantite: positiveInt,
    })).min(1, "Ajoutez au moins un produit").max(100),
  }),
});

export const justificationEntreSchemas = schemas(z.object({
  id_justification_entre: positiveInt,
  date_piece: z.coerce.date().optional(),
  marche_concerne: requiredString.max(255),
  fournisseur: requiredString.max(255),
  id_utilisateur_im: positiveInt,
}), { id_justification_entre: true });

export const entreeCompleteSchema = z.object({
  body: justificationEntreSchemas.create.shape.body.omit({ id_utilisateur_im: true }).extend({
    produits: listeEntreMultipleSchema.shape.body.shape.produits,
    images: z.array(z.string().max(2800000)).max(10).default([]),
  }),
});

export const compteSchemas = schemas(z.object({
  id_compte: positiveInt,
  categorie: z.string().trim().max(255).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
}), { id_compte: true });

export const uniteSchemas = schemas(z.object({
  unite: requiredString.max(100),
  description: z.string().trim().max(1000).nullable().optional(),
}));

export const serviceSchemas = schemas(z.object({
  nom_service: requiredString.max(150),
}));

export const demandeClientSchemas = schemas(z.object({
  date_demande: z.coerce.date().optional(),
  date_livraison: z.coerce.date().nullable().optional(),
  status_demande: z.enum(["ENVOYER", "REFUSER", "VALIDER", "BON_IMPRIME"]),
  Urgence: requiredString.max(100),
  id_utilisateur_im: positiveInt,
}));

export const listeDemandeSchemas = schemas(z.object({
  id_catalogue: positiveInt,
  quantite_liste_demande: positiveInt,
  motif_demande: requiredString.max(500),
  quantite_accordee: nonNegativeInt.nullable().optional(),
  pourcentage_accorde: z.coerce.number().int().min(0).max(100).nullable().optional(),
  status_liste_demande: z.enum(["EN_ATTENTE", "REJETER", "VALIDER", "MODIFIER"]),
  id_demande_client: positiveInt,
}));

export const listeDemandeMultipleSchema = z.object({
  body: z.object({
    id_demande_client: positiveInt,
    produits: z.array(z.object({
      id_catalogue: positiveInt,
      quantite_liste_demande: positiveInt,
      motif_demande: requiredString.max(500),
      status_liste_demande: z.enum(["EN_ATTENTE", "REJETER", "VALIDER", "MODIFIER"]),
    })).min(1, "Ajoutez au moins un produit").max(100),
  }),
});

export const demandeCompleteSchema = z.object({ body: z.object({
  Urgence: z.enum(['NORMALE', 'PRIORITAIRE', 'URGENTE']),
  produits: listeDemandeMultipleSchema.shape.body.shape.produits,
}) });

export const motifRejetSchemas = schemas(z.object({
  motif: requiredString.max(1000),
  date_rejet: z.coerce.date().optional(),
  id_liste_demande: positiveInt,
}));

export const confirmerDemandeSchema = z.object({
  params: z.object({ id: positiveInt }),
  body: z.object({
    decisions: z.array(z.object({
      id_liste_demande: positiveInt,
      status: z.enum(["VALIDER", "MODIFIER", "REJETER"]),
      quantite_accordee: nonNegativeInt,
      pourcentage_accorde: z.coerce.number().int().min(0).max(100).optional(),
      motif_rejet: z.string().trim().max(1000).optional(),
    }).superRefine((decision, context) => {
      if (decision.status === "REJETER" && !decision.motif_rejet) {
        context.addIssue({ code: "custom", path: ["motif_rejet"], message: "Le motif de rejet est obligatoire" });
      }
    })).min(1),
  }),
});

export const dispatchInterneSchema = z.object({
  body: z.object({
    id_division: positiveInt,
    id_stock_service: positiveInt,
    nombre: positiveInt,
  }),
});

export const utilisationStockSchema = z.object({
  body: z.object({
    id_stock_service: positiveInt,
    quantite: positiveInt,
    motif: requiredString.max(500),
  }),
});

export const divisionSchema = z.object({ body: z.object({ nom_division: requiredString.max(255) }) });

export const receptionSchema = z.object({
  body: z.object({
    decisions: z.array(z.object({
      id_liste_demande: positiveInt,
      status_reception: z.enum(['RECU', 'NON_RECU']),
    })).min(1),
  }),
});

export const conversationSchemas = schemas(z.object({
  id_utilisateur_im: positiveInt,
  id_utilisateur_im2: positiveInt,
  date_conversation: z.coerce.date().optional(),
}));

export const messageSchemas = schemas(z.object({
  id_conversation: positiveInt,
  id_utilisateur_im: positiveInt,
  contenu: requiredString.max(5000),
  status_message: requiredString.max(100),
  date_message: z.coerce.date().optional(),
}));

export const historiqueSchemas = schemas(z.object({}));
