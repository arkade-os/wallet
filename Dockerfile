FROM node:22-alpine AS builder

ARG GIT_COMMIT=unknown

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN echo "export const gitCommit = '${GIT_COMMIT}'" > src/_gitCommit.ts && \
    pnpm build:worker && npx vite build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
