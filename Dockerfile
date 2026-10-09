# ==============================================================================
# CIVICCLEAN · PRODUCTION CONTAINER FOR AWS APP RUNNER / ECS FARGATE
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

# Set non-interactive debian environment
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install system dependencies (FFmpeg, OpenCV runtime, Node.js 20)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install Node frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy project source code
COPY backend/ ./backend/
COPY models/ ./models/
COPY frontend/ ./frontend/
COPY entrypoint.sh ./entrypoint.sh

# Create runtime directories
RUN mkdir -p data/uploads evidence outputs

# Ensure entrypoint is executable
RUN chmod +x entrypoint.sh

# Expose public port for AWS App Runner
EXPOSE 8000

# Health check against API health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start dual service cluster
ENTRYPOINT ["/app/entrypoint.sh"]
