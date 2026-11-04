import express from 'express'; 
import { modificationStockRoute } from './routes/modification_stock_route.js';
import { aiRoute } from './routes/ai_route.js';
import cors from 'cors'; 
import helmet from 'helmet'; 
import morgan from 'morgan';

import {utilisateurRoute} from './routes/utilisateur_route.js'; 
import { authRoute } from './routes/auth_route.js';
import { crudRoute } from './routes/crud_route.js';
import { chatRoute } from './routes/chat_route.js';
import { env } from './config/env.js'; 

import { notFound, errorHandler } from './middlewares/error.middleware.js';
import cookieParser from "cookie-parser";
import path from "node:path";

export const app=express(); 
app.disable('x-powered-by'); 
if (env.trustProxy) app.set('trust proxy', env.trustProxy);

app.use(helmet()); 
app.use(cookieParser());
app.use(cors({origin:env.clientUrl,credentials:true})); 
app.use('/api/entrees-stock', express.json({limit:'28mb'}));
app.use(express.json({limit:'3mb'}));
app.use((_req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = body => sendJson(JSON.parse(JSON.stringify(body), (_key, value) => {
    if (value && typeof value === 'object' && value.Service?.nom_service && value.service === undefined) {
      return { ...value, service: value.Service.nom_service };
    }
    return value;
  }));
  next();
});
app.use('/uploads', express.static(path.resolve('uploads'), {
  setHeaders: res => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));
app.use(morgan(env.nodeEnv==='production'?'combined':'dev'));

app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api',utilisateurRoute); 
app.use('/api', authRoute)
app.use('/api', crudRoute);
app.use('/api', modificationStockRoute);
app.use('/api', chatRoute);
app.use('/api', aiRoute);
app.use(notFound);
app.use(errorHandler);
