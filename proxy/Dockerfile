# Dockerfile pour le proxy WebSocket XAI Voice (standalone)
# Production-ready, optimisé pour Railway

FROM node:20-alpine AS builder

WORKDIR /app

# Copier package.json et installer les dépendances
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Installer les dépendances
COPY package.json package-lock.json* ./
RUN npm ci --production=false && npm cache clean --force

# Copier le code source
COPY src/ ./src/

# Créer un utilisateur non-root pour sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Changer propriétaire des fichiers
RUN chown -R nodejs:nodejs /app

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port (Railway assigne automatiquement via $PORT)
EXPOSE 3001

# Variable d'environnement
ENV NODE_ENV=production

# Commande de démarrage
CMD ["tsx", "src/server.ts"]
