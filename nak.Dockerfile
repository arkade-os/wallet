# build stage
FROM golang:1.25.5-alpine AS builder

# Install build dependencies for CGO (required by nak's lmdb dependency)
RUN apk add --no-cache gcc musl-dev

# Install nak. Retried because proxy.golang.org drops HTTP/2 streams mid-download (INTERNAL_ERROR);
# modules fetched before a failure stay in the cache, so each attempt only resumes what is missing.
RUN for attempt in 1 2 3 4 5; do \
      go install github.com/fiatjaf/nak@v0.18.7 && exit 0; \
      echo "go install failed (attempt $attempt of 5)"; \
      if [ "$attempt" -lt 5 ]; then sleep "$((attempt * 10))"; fi; \
    done; exit 1

# runtime stage
FROM alpine:latest

# install ca-certificates for https requests (needed for relay connections)
RUN apk --no-cache add ca-certificates

# create a non-root user
RUN adduser -D -s /bin/sh nakuser

# set working directory
WORKDIR /home/nakuser

# copy the binary from builder stage
COPY --from=builder /go/bin/nak /usr/local/bin/nak

# make sure the binary is executable
RUN chmod +x /usr/local/bin/nak

# switch to non-root user
USER nakuser
