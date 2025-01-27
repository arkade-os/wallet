FROM node:18-alpine AS builder

# Ensure we use yarn v1
RUN yarn set version 1.22.22

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# NODE_ENV=production is for runtime optimization
# --production=false to install devDependencies needed for build
ENV NODE_ENV=production
ENV DISABLE_ESLINT_PLUGIN=true
RUN yarn install --frozen-lockfile --production=false --network-timeout 100000

# Copy source code
COPY . .

# Create git commit file from current branch HEAD
RUN if [ -d ".git" ]; then \
      echo "export const gitCommit = '$(cat .git/HEAD | cut -d '/' -f 3- | xargs -I {} cat .git/refs/heads/{} | cut -c 1-8)';" > src/_gitCommit.ts; \
    else \
      echo "export const gitCommit = 'dev';" > src/_gitCommit.ts; \
    fi

# Build the app
RUN yarn craco build

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
COPY --from=builder /app/build /usr/share/nginx/html

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