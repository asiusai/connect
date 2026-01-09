# Stage 1: Build MKV
FROM golang:1.22-alpine AS mkv-builder
WORKDIR /build
COPY minikeyvalue/go.mod minikeyvalue/go.sum ./
COPY minikeyvalue/src/ ./src/
RUN cd src && go build -o mkv

# Stage 2: Final image
FROM oven/bun:latest

# Install nginx (volume servers), curl (debugging), ffmpeg (sprite generation)
RUN apt-get update && apt-get install -y --no-install-recommends nginx curl ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy pre-built MKV binary
COPY --from=mkv-builder /build/src/mkv ./minikeyvalue/src/mkv
COPY minikeyvalue/volume ./minikeyvalue/volume

# Copy API and connect
COPY api/ ./api/
COPY connect/ ./connect/
COPY package.json bun.lock* ./

# Install deps (modify package.json to remove missing workspaces)
RUN sed -i 's/"infra",//g; s/"site"//g' package.json && bun install --no-save

# Entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 80 2222
CMD ["./docker-entrypoint.sh"]
