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

# Create nginx user if it doesn't exist
RUN adduser -D -H -u 101 -s /sbin/nologin nginx || true

# Remove default nginx configs
RUN rm -rf /etc/nginx/conf.d/* && \
    rm -f /etc/nginx/nginx.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Create necessary directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /var/run && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

# Expose port 80
EXPOSE 80

# Switch to non-root user
USER nginx

CMD ["nginx", "-g", "daemon off;"] 