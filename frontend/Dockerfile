FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Image de production ──────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copier le serveur standalone généré par Next.js
COPY --from=builder /app/.next/standalone ./

# Copier les fichiers statiques (CSS, JS, images) dans le bon emplacement
COPY --from=builder /app/.next/static ./.next/static

# Copier le dossier public (favicon, service-worker.js, etc.)
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
