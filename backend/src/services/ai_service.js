import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export async function callAI(path, method = 'GET') {
  if (!process.env.AI_SERVICE_TOKEN) throw new AppError('Service IA non configuré : AI_SERVICE_TOKEN manquant.', 503);
  let response;
  try {
    response = await fetch(new URL(path, process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001'), {
      method, headers: { 'X-AI-Token': process.env.AI_SERVICE_TOKEN }, signal: AbortSignal.timeout(method === 'POST' ? 120000 : 30000),
    });
  } catch { throw new AppError('Service IA indisponible ou délai dépassé. Vérifiez son démarrage.', 503); }
  const data = await response.json();
  if (!response.ok) throw new AppError(typeof data.detail === 'string' ? data.detail : 'Erreur du service IA', response.status);
  return data;
}

export async function forecast(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) throw new AppError('Mois invalide (AAAA-MM).', 400);
  const result = await callAI(`/predict?month=${encodeURIComponent(month)}`);
  const catalogues = await prisma.catalogue.findMany({ include: { Unite: true, Stock: true } });
  const estimates = new Map(result.articles.map(row => [row.id_catalogue, row]));
  return { ...result, articles: catalogues.map(article => {
    const prediction = estimates.get(article.id_catalogue);
    const stock = article.Stock.reduce((sum, item) => sum + item.quantite_stock, 0);
    return { id_catalogue: article.id_catalogue, designation: article.designation, unite: article.Unite?.unite || '—',
      quantity: prediction?.quantity ?? null, method: prediction?.method || 'historique_insuffisant',
      historyMonths: prediction?.historyMonths || 0, stock,
      shortage: prediction ? Math.max(0, prediction.quantity - stock) : null };
  }) };
}
