FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev --registry=https://registry.npmjs.org
COPY . .
RUN npm run build
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/boot.js"]
