FROM node:20-alpine AS base
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN corepack enable pnpm
RUN apk add --no-cache python3 py3-pip py3-setuptools make g++

COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @apps/web...

COPY apps/web ./apps/web

WORKDIR /app/apps/web
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
RUN corepack enable pnpm
RUN apk add --no-cache python3 py3-pip py3-setuptools openssl

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/apps/web ./apps/web

COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=base /app/apps/web/.next ./apps/web/.next

EXPOSE 3000
ENV NODE_ENV=production
WORKDIR /app/apps/web
CMD ["pnpm", "start"]
