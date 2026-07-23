FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/boot.js"]
