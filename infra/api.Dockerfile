FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

RUN corepack enable pnpm
RUN apk add --no-cache python3 py3-pip py3-setuptools make g++

COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @apps/api...

COPY apps/api ./apps/api
COPY .env.example ./

WORKDIR /app/apps/api
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable pnpm
RUN apk add --no-cache python3 py3-pip py3-setuptools openssl

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/apps/api ./apps/api

COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=base /app/apps/api/dist ./dist

EXPOSE 4000
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
