import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { correctStock } from '../services/modification_stock_service.js';
import { prisma } from '../config/prisma.js';

export const modificationStockRoute = Router();
const params = z.object({ id: z.coerce.number().int().positive().max(2147483647) });
const quantity = z.number().int().min(0).max(2147483647);
modificationStockRoute.post('/stocks/:id/correction', authenticate, authorize('DEPOSITAIRE', 'VALIDATEUR'), validate(z.object({ params, body: z.object({ quantite_avant: quantity, quantite_apres: quantity, motif: z.string().trim().min(1).max(1000) }) })), async (req, res) => {
  res.status(201).json({ success: true, data: await correctStock(Number(req.params.id), req.body) });
});
modificationStockRoute.get('/stocks/:id/modifications', authenticate, authorize('DEPOSITAIRE', 'VALIDATEUR'), validate(z.object({ params })), async (req, res) => {
  res.json({ success: true, data: await prisma.modification_stock.findMany({ where: { id_stock: Number(req.params.id) }, orderBy: { id_modification_stock: 'desc' } }) });
});
