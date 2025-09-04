FROM node:18-alpine

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

COPY .env .env

# Exposer le port
EXPOSE 3002

# Variables d'environnement par défaut
ENV NODE_ENV=production

# Commande de démarrage
CMD ["npm", "start"]
