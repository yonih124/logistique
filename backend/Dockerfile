# syntax=docker/dockerfile:1
# API Node.js (Express + Prisma 7). Node 24 exécute directement le client Prisma généré en TypeScript.
FROM node:24-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# Prisma CLI (devDependency) est conservé : il applique les migrations au démarrage.
RUN npm ci --include=dev && npm cache clean --force

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

COPY src ./src
RUN mkdir -p uploads/profiles uploads/photos_justification && chown -R node:node /app/uploads

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && exec node src/server.js"]
