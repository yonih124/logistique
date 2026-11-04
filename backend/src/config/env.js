import 'dotenv/config';
const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) if (!process.env[key]) throw new Error(`Variable ${key} manquante`);
const nodeEnv = process.env.NODE_ENV || 'development';
const flag = (value, fallback) => value === undefined || value === '' ? fallback : value === 'true';
export const env = { port: Number(process.env.PORT || 3000), 
jwtSecret: process.env.JWT_SECRET, 
jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h', 
clientUrl: process.env.CLIENT_URL || 'http://localhost:5173', 
nodeEnv,
// Derrière Nginx/Caddy : nombre de proxys de confiance (IP réelle pour la limitation de débit).
trustProxy: Number(process.env.TRUST_PROXY || 0),
// Mettre COOKIE_SECURE=false uniquement si le site est servi en HTTP (sans certificat).
cookieSecure: flag(process.env.COOKIE_SECURE, nodeEnv === 'production'),
cookieSameSite: process.env.COOKIE_SAMESITE || 'lax' };
