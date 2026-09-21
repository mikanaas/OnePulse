FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json .npmrc ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts
COPY attached_assets ./attached_assets

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=8080
ENV BASE_PATH=/

RUN pnpm --filter @workspace/oneco run build
RUN pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/public

COPY --from=build /workspace/artifacts/api-server/dist /app/server
COPY --from=build /workspace/artifacts/oneco/dist/public /app/public

EXPOSE 8080

CMD ["node", "--enable-source-maps", "/app/server/index.mjs"]
