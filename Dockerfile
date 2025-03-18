FROM node:18-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy files
COPY . .

# NODE_ENV=production is for runtime optimization
ENV NODE_ENV=production
ENV DISABLE_ESLINT_PLUGIN=true
RUN pnpm install --prod --ignore-scripts

# Create git commit file from current branch HEAD
RUN if [ -d ".git" ]; then \
      echo "export const gitCommit = '$(cat .git/HEAD | cut -d '/' -f 3- | xargs -I {} cat .git/refs/heads/{} | cut -c 1-8)';" > src/_gitCommit.ts; \
    else \
      echo "export const gitCommit = 'dev';" > src/_gitCommit.ts; \
    fi

# Build the app
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