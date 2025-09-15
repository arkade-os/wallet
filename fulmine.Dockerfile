# Build the web interface
FROM node:22 AS web-builder

RUN git clone https://github.com/ArkLabsHQ/fulmine.git /app && cd /app
WORKDIR /app/internal/interface/web
RUN rm -rf .parcel-cache && yarn && yarn build

# Build the Go application
FROM golang:1.24.6 AS go-builder

ARG VERSION=dev
ARG COMMIT=none
ARG DATE=unknown
ARG TARGETOS=linux
ARG TARGETARCH=amd64
ARG SENTRY_DSN=""

WORKDIR /app
# Clone the repository to get the Go files
RUN git clone https://github.com/ArkLabsHQ/fulmine.git .
# Copy the built web assets from web-builder
COPY --from=web-builder /app/internal/interface/web/static ./internal/interface/web/static

# Set default values and build
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -ldflags "-X main.version=${VERSION} -X main.commit=${COMMIT} -X main.date=${DATE} -X main.sentryDsn=${SENTRY_DSN}" \
    -o bin/fulmine ./cmd/fulmine

# Final image
FROM alpine:3.20

WORKDIR /app

COPY --from=go-builder /app/bin/* /app

ENV PATH="/app:${PATH}"
ENV FULMINE_DATADIR=/app/data

# Expose volume containing all 'arkd' data
VOLUME /app/data

ENTRYPOINT [ "fulmine" ]

