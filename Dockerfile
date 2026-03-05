FROM python:3.11-slim

WORKDIR /app

# Install Node.js for building frontend
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Accept build arg for API key
ARG DASHI_API_KEY
ENV DASHI_API_KEY=${DASHI_API_KEY}

# Copy frontend and build it
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install && npm run build

# Back to app root
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/main.py .

# Copy built frontend to static directory
RUN mkdir -p /app/static
RUN cp -r frontend/dist/* /app/static/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Environment
ENV DATABASE_URL=sqlite:///data/dashi.db
ENV PYTHONUNBUFFERED=1
ENV STATIC_DIR=/app/static

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]