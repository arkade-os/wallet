FROM node:23-alpine AS builder

# Install pnpm and required build dependencies
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# Set up pnpm store
ENV PNPM_HOME="/root/.local/share/pnpm"
RUN mkdir -p $PNPM_HOME/store

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install dependencies with force to handle lockfile compatibility
ENV ROLLUP_SKIP_NODE_RESOLUTION=true
RUN pnpm install

# Copy source files
COPY src ./src
COPY public ./public
COPY index.html vite.config.ts tsconfig.json .eslintrc* ./
COPY .git ./.git

# Create git commit file from current branch HEAD
RUN if [ -d ".git" ]; then \
      echo "export const gitCommit = '$(cat .git/HEAD | cut -d '/' -f 3- | xargs -I {} cat .git/refs/heads/{} | cut -c 1-8)';" > src/_gitCommit.ts; \
    else \
      echo "export const gitCommit = 'dev';" > src/_gitCommit.ts; \
    fi

# Build the app
ENV NODE_ENV=production
ENV DISABLE_ESLINT_PLUGIN=true
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Create necessary directories and set permissions
RUN mkdir -p /tmp/nginx /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R nginx:nginx /tmp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    # Remove default nginx config
    rm -rf /etc/nginx/conf.d/* && \
    rm -f /etc/nginx/nginx.conf

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Set correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /etc/nginx && \
    chmod -R 755 /etc/nginx

# Expose port 3000
EXPOSE 3000

# Switch to non-root user
USER nginx

CMD ["nginx", "-g", "daemon off;"]