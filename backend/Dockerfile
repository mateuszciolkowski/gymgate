FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Kopiuj wszystkie pliki konfiguracyjne przed npm install
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Instaluj dependencies (bez postinstall build)
RUN npm install --ignore-scripts

# Kopiuj resztę kodu
COPY . .

# Teraz uruchom build (prisma generate + tsc)
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]