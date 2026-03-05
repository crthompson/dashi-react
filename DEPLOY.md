# Dashi Deployment Guide

This document outlines how to deploy the Dashi React app to Fly.io.

## Files Created/Modified

### 1. Dockerfile (Project Root)
- Uses Python 3.11-slim base image
- Installs Node.js for building the frontend
- Builds frontend with `npm install && npm run build`
- Copies backend and installs Python dependencies
- Serves static files from `/app/static`
- Exposes port 8000

### 2. fly.toml (Project Root)
- App name: `dashi`
- Primary region: `iad`
- Internal port: 8000
- Volume mount: `dashi_data` at `/app/data`
- Auto-stop/start machines enabled
- 512MB memory, 1 shared CPU

### 3. backend/main.py
- Updated static file serving configuration
- SPA catch-all route at the bottom
- Mounts `/assets` directory for Vite-built assets
- Falls back to `index.html` for client-side routing

### 4. frontend/.env.production
- `VITE_API_URL=''` (empty = same origin)
- `VITE_API_KEY=${DASHI_API_KEY}` (injected at build time)

### 5. backend/.env.example
- `DASHI_API_KEY=your-secret-key`
- `DATABASE_URL=sqlite:///data/dashi.db`
- `MOONSHOT_API_KEY=optional`
- `ANTHROPIC_API_KEY=optional`

## Deploy Steps

1. **Create the Fly.io app** (if not already created):
   ```bash
   fly apps create dashi
   # OR use: fly launch
   ```

2. **Create the volume for persistent SQLite data**:
   ```bash
   fly volumes create dashi_data --region iad --size 1
   ```

3. **Set secrets**:
   ```bash
   fly secrets set DASHI_API_KEY=your-secret-key-here
   fly secrets set MOONSHOT_API_KEY=your-moonshot-key  # optional
   fly secrets set ANTHROPIC_API_KEY=your-anthropic-key  # optional
   ```

4. **Deploy**:
   ```bash
   fly deploy
   ```

5. **Verify deployment**:
   ```bash
   fly status
   fly logs
   ```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   User Browser  │────▶│  Fly.io (dashi)  │
└─────────────────┘     └──────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌──────────┐        ┌──────────┐        ┌──────────┐
    │  Static  │        │ FastAPI  │        │ SQLite   │
    │  Files   │        │   API    │        │  (vol)   │
    │ (React)  │        │          │        │          │
    └──────────┘        └──────────┘        └──────────┘
```

## Notes

- The SQLite database is stored on a Fly.io volume at `/app/data/dashi.db`
- The frontend is built into the Docker image at `/app/static`
- API and frontend share the same domain in production (no CORS issues)
- Machines auto-stop when idle to save costs
