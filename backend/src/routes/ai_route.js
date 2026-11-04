import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { callAI, forecast } from '../services/ai_service.js';

export const aiRoute = Router();
aiRoute.use('/ai', authenticate, authorize('DEPOSITAIRE', 'VALIDATEUR'));
aiRoute.get('/ai/status', async (_req, res) => res.json({ success: true, data: await callAI('/status') }));
aiRoute.get('/ai/forecast', async (req, res) => res.json({ success: true, data: await forecast(req.query.month) }));
aiRoute.post('/ai/train', rateLimit({ windowMs: 60000, limit: 1 }), async (_req, res) => res.json({ success: true, data: await callAI('/train', 'POST') }));
