# First image used to build the sources
FROM golang:1.23.1 AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

RUN git clone https://github.com/ark-network/ark.git

# ENV GOPROXY=https://goproxy.io,direct
RUN cd ark/server && CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -ldflags="-X 'main.Version=${VERSION}'" -o ../../bin/arkd ./cmd/arkd
RUN cd ark/client && CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -ldflags="-X 'main.Version=${VERSION}'" -o ../../bin/ark .

# Second image, running the arkd executable
FROM alpine:3.20

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
