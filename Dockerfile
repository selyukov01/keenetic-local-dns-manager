FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production

RUN npm run build


FROM node:24-alpine

WORKDIR /app

COPY --from=builder --chown=node:node /app/.next/standalone ./

COPY --from=builder --chown=node:node /app/.next/static ./.next/static

COPY --from=builder --chown=node:node /app/public ./public

RUN chown -R node:node /app

ENV NODE_ENV=production

USER node

EXPOSE 3000

CMD ["node", "server.js"]
