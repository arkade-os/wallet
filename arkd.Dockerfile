# First image used to build the sources
FROM golang:1.25.3 AS builder

ARG TARGETOS
ARG TARGETARCH
ARG VERSION

ARG BRANCH=master

WORKDIR /app

RUN git clone https://github.com/arkade-os/arkd.git && cd arkd && git checkout ${BRANCH}

RUN mkdir -p bin && cd arkd && \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-X 'main.Version=${VERSION}'" -o /app/bin/arkd ./cmd/arkd

RUN cd arkd/pkg/ark-cli && \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-X 'main.Version=${VERSION}'" -o /app/bin/ark main.go

# Second image, running the arkd executable
FROM alpine:3.22

RUN apk update && apk upgrade

WORKDIR /app

COPY --from=builder /app/bin/* /app/

ENV PATH="/app:${PATH}"
ENV ARK_DATADIR=/app/data
ENV ARK_WALLET_DATADIR=/app/wallet-data

# Expose volume containing all 'arkd' data
VOLUME /app/data
VOLUME /app/wallet-data

ENTRYPOINT [ "arkd" ]