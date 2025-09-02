---
title: "Docker Optimization for Production: Lessons from the Field"
date: "2023-11-08"
tags: ["docker", "containers", "optimization", "production", "security"]
summary: "Essential Docker optimization techniques learned from years of production deployments and container orchestration."
author: "Alberto Ferrer"
slug: "docker-optimization-production"
---

# Docker Optimization for Production: Lessons from the Field

Having worked with Docker in production environments for several years at Rackspace Technology, I've learned that the difference between a basic Docker setup and a production-ready one lies in the details. This guide covers the optimization techniques that have made the most impact in real-world deployments.

## Multi-Stage Builds: The Foundation

### Before: Single-Stage Build

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Problems:**
- Final image includes dev dependencies
- Build tools remain in production image
- Larger image size = slower deployments

### After: Multi-Stage Build

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Benefits:**
- 60-80% smaller final image
- No build tools in production
- Faster container startup

## Image Size Optimization

### 1. Choose the Right Base Image

```dockerfile
# ❌ Bad: Full Ubuntu image (72MB base)
FROM ubuntu:22.04

# ✅ Better: Alpine Linux (5MB base)
FROM alpine:3.18

# ✅ Best: Distroless (2MB base, no shell)
FROM gcr.io/distroless/static:nonroot
```

### 2. Leverage .dockerignore

```dockerignore
.git
.gitignore
README.md
Dockerfile
.dockerignore
node_modules
npm-debug.log
coverage/
.env
.env.local
.vscode/
.idea/
*.md
tests/
docs/
```

### 3. Optimize Layer Caching

```dockerfile
# ❌ Bad: Dependencies reinstalled on any code change
COPY . .
RUN npm install

# ✅ Good: Dependencies cached separately
COPY package*.json ./
RUN npm ci --only=production
COPY . .
```

## Security Hardening

### 1. Non-Root User Implementation

```dockerfile
# Create user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set ownership
COPY --from=builder --chown=nextjs:nodejs /app ./

# Switch to user
USER nextjs
```

### 2. Read-Only Root Filesystem

```dockerfile
# Dockerfile
USER 1001
VOLUME ["/tmp"]

# Docker Compose
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
      - /var/cache
```

### 3. Security Scanning Integration

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build image
      run: docker build -t myapp:latest .
    - name: Scan with Trivy
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: myapp:latest
        format: sarif
        output: trivy-results.sarif
```

## Performance Optimization

### 1. Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

### 2. Resource Limits

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. Init System for Signal Handling

```dockerfile
# Using tini as init system
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

## Advanced Optimization Techniques

### 1. Custom Base Images

```dockerfile
# base-image/Dockerfile
FROM alpine:3.18
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tzdata
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser
```

### 2. Dependency Optimization

```dockerfile
# Python example: Removing build dependencies
FROM python:3.11-alpine AS builder
RUN apk add --no-cache --virtual .build-deps \
    gcc \
    musl-dev \
    postgresql-dev
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-alpine
RUN apk add --no-cache postgresql-libs
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
```

### 3. Application-Specific Optimizations

```dockerfile
# Node.js production optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_PROGRESS=false

# Python optimizations
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
```

## Production Docker Compose

### Complete Production Setup

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    restart: unless-stopped
    read_only: true
    user: "1001:1001"
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp
      - /var/cache
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    networks:
      - app-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Monitoring and Logging

### 1. Container Metrics

```yaml
# docker-compose.monitoring.yml
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: cadvisor
    restart: unless-stopped
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:rw
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    ports:
      - "8080:8080"
```

### 2. Structured Logging

```dockerfile
# Application logging setup
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json
COPY logging.conf /etc/logging.conf
```

### 3. Log Rotation

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
    compress: "true"
```

## CI/CD Integration

### 1. Build Optimization Pipeline

```yaml
# .github/workflows/docker.yml
name: Docker Build
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout
      uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
      
    - name: Cache Docker layers
      uses: actions/cache@v3
      with:
        path: /tmp/.buildx-cache
        key: ${{ runner.os }}-buildx-${{ github.sha }}
        restore-keys: |
          ${{ runner.os }}-buildx-
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: false
        tags: myapp:latest
        cache-from: type=local,src=/tmp/.buildx-cache
        cache-to: type=local,dest=/tmp/.buildx-cache-new,mode=max
```

### 2. Automated Testing

```dockerfile
# Dockerfile.test
FROM myapp:latest AS test
USER root
RUN apk add --no-cache curl
COPY tests/ ./tests/
RUN npm test
```

## Common Pitfalls and Solutions

### 1. Layer Explosion

```dockerfile
# ❌ Bad: Each RUN creates a layer
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y wget
RUN apt-get clean

# ✅ Good: Single layer
RUN apt-get update && \
    apt-get install -y curl wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 2. Secrets in Images

```dockerfile
# ❌ Bad: Secrets in build
COPY secret.key /app/

# ✅ Good: Runtime secrets
# Use Docker secrets or environment variables
```

### 3. Timezone Issues

```dockerfile
# ✅ Handle timezone properly
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

## Performance Monitoring

### Key Metrics to Monitor

```bash
# Container resource usage
docker stats --no-stream

# Image sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Layer analysis
docker history myapp:latest --no-trunc

# Disk usage
docker system df
```

### Automated Cleanup

```bash
#!/bin/bash
# cleanup.sh
docker system prune -f
docker image prune -f --filter "until=72h"
docker volume prune -f
```

## Conclusion

Docker optimization for production is an iterative process. The key principles are:

1. **Start small**: Use minimal base images
2. **Layer wisely**: Optimize for caching
3. **Secure by default**: Non-root users and read-only filesystems
4. **Monitor everything**: Resource usage, security, and performance
5. **Automate**: CI/CD, testing, and cleanup

Remember: premature optimization is the root of all evil, but informed optimization based on production metrics is essential for scalable systems.

## Tools and Resources

- **Dive**: Analyze Docker image layers
- **Trivy**: Security vulnerability scanning
- **Hadolint**: Dockerfile linting
- **Docker Bench**: Security best practices

---

*These optimizations have been battle-tested in production environments handling millions of requests. Always test thoroughly before applying to production workloads.*
