FROM node:22-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8002
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build:admin

EXPOSE 3000

WORKDIR /app/apps/admin-console

CMD ["sh", "-c", "/app/node_modules/.bin/next start --hostname 0.0.0.0 --port ${PORT:-3000}"]
