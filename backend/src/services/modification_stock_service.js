import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export function correctStock(id_stock, { quantite_avant, quantite_apres, motif }) {
  return prisma.$transaction(async tx => {
    const stock = await tx.stock.findUnique({ where: { id_stock } });
    if (!stock) throw new AppError('Stock introuvable', 404);
    if (stock.quantite_stock !== quantite_avant) throw new AppError('Le stock a changé. Actualisez le catalogue avant de corriger.', 409);
    if (quantite_avant === quantite_apres) throw new AppError('La nouvelle quantité est identique à la quantité actuelle.', 400);
    const updated = await tx.stock.updateMany({ where: { id_stock, quantite_stock: quantite_avant }, data: { quantite_stock: quantite_apres } });
    if (updated.count !== 1) throw new AppError('Le stock a changé. Actualisez puis réessayez.', 409);
    return tx.modification_stock.create({ data: { id_stock, quantite_avant: stock.quantite_stock, quantite_apres, motif } });
  }, { isolationLevel: 'Serializable' });
}
