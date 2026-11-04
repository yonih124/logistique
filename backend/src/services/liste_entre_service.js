import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { saveJustificationImage, removeJustificationImage } from './justification_image_service.js';

export async function creerEntreeComplete(user, payload) {
  const { images = [], produits, ...piece } = payload;
  const urls = [];
  try {
    for (const image of images) urls.push(await saveJustificationImage(image));
    return await prisma.$transaction(async tx => {
      const justification = await tx.justification_entre.create({
        data: { ...piece, id_utilisateur_im: user.id_utilisateur_im, Photos: { create: urls.map(url_photo => ({ url_photo })) } },
        include: { Photos: true },
      });
      for (const produit of produits) {
        await tx.liste_entre.create({ data: { ...produit, id_justification_entre: piece.id_justification_entre } });
        await ajouterQuantiteAuStock(tx, produit.id_catalogue, produit.quantite);
      }
      return justification;
    });
  } catch (error) {
    await Promise.allSettled(urls.map(removeJustificationImage));
    throw error;
  }
}

async function ajouterQuantiteAuStock(tx, id_catalogue, quantite) {
  const stock = await tx.stock.findFirst({
    where: { id_catalogue },
    orderBy: { id_stock: "asc" },
  });

  if (stock) {
    return tx.stock.update({
      where: { id_stock: stock.id_stock },
      data: { quantite_stock: { increment: quantite } },
    });
  }

  return tx.stock.create({
    data: { id_catalogue, quantite_stock: quantite },
  });
}

export function creerEntree(payload) {
  return prisma.$transaction(async (tx) => {
    const ligne = await tx.liste_entre.create({ data: payload });
    const stock = await ajouterQuantiteAuStock(
      tx,
      payload.id_catalogue,
      payload.quantite,
    );

    return { ligne, stock };
  });
}

export async function creerPlusieursEntrees(id_justification_entre, produits) {
  const idsCatalogue = [...new Set(produits.map((produit) => produit.id_catalogue))];

  const [justification, catalogues] = await Promise.all([
    prisma.justification_entre.findUnique({
      where: { id_justification_entre },
      select: { id_justification_entre: true },
    }),
    prisma.catalogue.findMany({
      where: { id_catalogue: { in: idsCatalogue } },
      select: { id_catalogue: true },
    }),
  ]);

  if (!justification) {
    throw new AppError("Justification d'entrée introuvable", 404);
  }

  const idsExistants = new Set(catalogues.map((catalogue) => catalogue.id_catalogue));
  const idsManquants = idsCatalogue.filter((id) => !idsExistants.has(id));

  if (idsManquants.length > 0) {
    throw new AppError("Un ou plusieurs catalogues sont introuvables", 404, {
      id_catalogue_manquants: idsManquants,
    });
  }

  return prisma.$transaction(async (tx) => {
    const lignes = await tx.liste_entre.createManyAndReturn({
      data: produits.map((produit) => ({
        id_justification_entre,
        id_catalogue: produit.id_catalogue,
        quantite: produit.quantite,
      })),
    });

    const quantitesParCatalogue = new Map();
    for (const produit of produits) {
      const quantiteActuelle = quantitesParCatalogue.get(produit.id_catalogue) ?? 0;
      quantitesParCatalogue.set(
        produit.id_catalogue,
        quantiteActuelle + produit.quantite,
      );
    }

    const stocks = [];
    for (const [id_catalogue, quantite] of quantitesParCatalogue) {
      stocks.push(await ajouterQuantiteAuStock(tx, id_catalogue, quantite));
    }

    return { lignes, stocks };
  });
}
