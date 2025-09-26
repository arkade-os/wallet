# First image used to build the sources
FROM golang:1.24.6 AS builder

ARG TARGETOS
ARG TARGETARCH
ARG VERSION=v8
ARG BRANCH=v8

WORKDIR /app

RUN git clone https://github.com/arkade-os/arkd.git && \
    cd arkd && git checkout ${BRANCH}

RUN mkdir -p bin && cd arkd && \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-X 'main.Version=${VERSION}'" -o /app/bin/arkd ./cmd/arkd

RUN mkdir -p bin && cd arkd/pkg/ark-cli && \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-X 'main.Version=${VERSION}'" -o /app/bin/ark main.go

# Second image, running the arkd executable
FROM alpine:3.20

RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=builder /app/bin/* /app/

ENV PATH="/app:${PATH}"
ENV ARK_DATADIR=/app/data
ENV ARK_WALLET_DATADIR=/app/wallet-data

# Expose volume containing all 'arkd' data
VOLUME /app/data
VOLUME /app/wallet-data

ENTRYPOINT [ "arkd" ]
