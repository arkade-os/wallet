FROM node:22-alpine AS builder

ARG GIT_COMMIT=unknown
ARG VITE_ARK_SERVER=__VITE_ARK_SERVER__
ARG VITE_BOLTZ_URL=__VITE_BOLTZ_URL__
ARG VITE_SENTRY_DSN=__VITE_SENTRY_DSN__
ARG VITE_NOSTR_RELAY_URL=__VITE_NOSTR_RELAY_URL__
ARG VITE_CHATWOOT_WEBSITE_TOKEN=__VITE_CHATWOOT_WEBSITE_TOKEN__
ARG VITE_CHATWOOT_BASE_URL=__VITE_CHATWOOT_BASE_URL__
ARG VITE_LENDASAT_IFRAME_URL=__VITE_LENDASAT_IFRAME_URL__
ARG VITE_LENDASWAP_IFRAME_URL=__VITE_LENDASWAP_IFRAME_URL__
ARG VITE_VERIFIED_ASSETS_URL=__VITE_VERIFIED_ASSETS_URL__
ARG VITE_APP_VERSION=__VITE_APP_VERSION__

ENV VITE_ARK_SERVER=$VITE_ARK_SERVER \
    VITE_BOLTZ_URL=$VITE_BOLTZ_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_NOSTR_RELAY_URL=$VITE_NOSTR_RELAY_URL \
    VITE_CHATWOOT_WEBSITE_TOKEN=$VITE_CHATWOOT_WEBSITE_TOKEN \
    VITE_CHATWOOT_BASE_URL=$VITE_CHATWOOT_BASE_URL \
    VITE_LENDASAT_IFRAME_URL=$VITE_LENDASAT_IFRAME_URL \
    VITE_LENDASWAP_IFRAME_URL=$VITE_LENDASWAP_IFRAME_URL \
    VITE_VERIFIED_ASSETS_URL=$VITE_VERIFIED_ASSETS_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN echo "export const gitCommit = '${GIT_COMMIT}'" > src/_gitCommit.ts && \
    pnpm build:worker && npx vite build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
COPY --from=builder /app/dist /usr/share/nginx/html

# Run as non-root user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

USER nginx
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
