# ---- 1. Compilation Vite ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# false = utilise le vrai backend (true = mode démo sans backend)
ENV VITE_DEMO_MODE=false
RUN npm run build

# ---- 2. Serveur Nginx ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
