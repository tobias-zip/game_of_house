# Production image, built by Dokploy: serves the built client with nginx.
FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS client-build
RUN pnpm --filter @overhouse/client build

FROM nginx:1.29-alpine AS client
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=client-build /app/client/dist /usr/share/nginx/html
