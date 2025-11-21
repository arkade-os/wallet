# build stage
FROM golang:1.25.3-alpine AS builder

# Install nak
RUN go install github.com/fiatjaf/nak@latest

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
