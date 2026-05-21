FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm install

FROM deps AS build
ENV DATABASE_URL="postgresql://pubo:pubo@localhost:5432/pubo?schema=public"
COPY apps/api apps/api
COPY packages/database packages/database
RUN npx prisma generate --schema packages/database/prisma/schema.prisma
RUN npm --workspace @pub-o/database run build
RUN npm --workspace @pub-o/api run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/packages/database/package.json packages/database/package.json
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/database/dist packages/database/dist
COPY --from=build /app/packages/database/prisma packages/database/prisma
EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
