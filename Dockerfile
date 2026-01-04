# Dockerfile multi-stage pour le proxy WebSocket XAI Voice
# Production-ready, optimisé pour Railway
# Contexte de build : racine du projet

# Stage 1: Builder - Installer les dépendances
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de configuration pour installer les dépendances
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Installer toutes les dépendances (y compris devDependencies pour tsx)
RUN npm ci --production=false

# Stage 2: Runner - Image finale minimale
FROM node:20-alpine AS runner

WORKDIR /app

# Copier package.json pour installer tsx (nécessaire pour exécuter TS)
COPY package.json package-lock.json* ./

# Installer tsx et dépendances de production
# Note: tsx est dans devDependencies mais nécessaire pour runtime
RUN npm ci --production=false && \
    npm cache clean --force

# Copier les fichiers nécessaires au runtime
# - Code du proxy (tous les fichiers .ts)
COPY server/xai-voice-proxy/ ./server/xai-voice-proxy/
# - Logger partagé (utilisé par le proxy) et ses dépendances
COPY src/utils/logger.ts ./src/utils/logger.ts
# - Configuration TypeScript (pour path aliases @/*)
COPY tsconfig.json ./

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
CMD ["tsx", "server/xai-voice-proxy/server.ts"]

