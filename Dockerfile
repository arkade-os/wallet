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

# Remove default nginx configs
RUN rm -rf /etc/nginx/conf.d/* && \
    rm -f /etc/nginx/nginx.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Make sure nginx can access the files
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 