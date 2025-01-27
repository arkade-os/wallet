FROM node:18-alpine AS builder

# Ensure we use yarn v1
RUN yarn set version 1.22.22

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
ENV NODE_ENV=production
ENV DISABLE_ESLINT_PLUGIN=true
RUN yarn install --frozen-lockfile --production=false --network-timeout 100000

# Copy source code
COPY . .

# Create git commit file directly (skip the script approach)
RUN mkdir -p src && \
    echo "export const gitCommit = 'docker';" > src/_gitCommit.ts

# Build the app with ESLint disabled
RUN DISABLE_ESLINT_PLUGIN=true CI=true yarn craco build

# Production stage
FROM nginx:alpine

# Remove default nginx configs and create new structure
RUN rm -rf /etc/nginx/conf.d/* && \
    rm -f /etc/nginx/nginx.conf && \
    rm -f /etc/nginx/mime.types

# Create necessary directories with correct permissions
RUN mkdir -p /tmp/nginx && \
    mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp && \
    mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R nginx:nginx /tmp/nginx && \
    chown -R nginx:nginx /tmp/client_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Set permissions for nginx directories and ensure WASM files have correct permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /etc/nginx/nginx.conf && \
    chmod -R 755 /etc/nginx && \
    find /usr/share/nginx/html -name "*.wasm" -exec chmod 644 {} \;

# Expose port 3000
EXPOSE 3000

# Switch to non-root user
USER nginx

CMD ["nginx", "-g", "daemon off;"] 