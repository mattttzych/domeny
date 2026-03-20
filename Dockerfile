# Używamy lekkiego obrazu Node.js
FROM node:20-slim

# Ustawiamy katalog roboczy
WORKDIR /app

# Kopiujemy pliki zależności
COPY package*.json ./

# Instalujemy zależności (tylko produkcyjne)
RUN npm install --production

# Kopiujemy resztę plików aplikacji
COPY . .

# Informujemy, na jakim porcie działa aplikacja
EXPOSE 3456

# Uruchamiamy serwer
CMD ["node", "server.js"]
