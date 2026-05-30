# Self-hosted GitHub Actions deployment (Docker Compose)

This repo is designed to run via `docker-compose.yml` on a machine that has:
- Docker Engine + Docker Compose v2
- A MongoDB + Redis network accessible from Docker (provided by compose)
- A GitHub Actions **self-hosted runner** registered for the repo

## 1) Create secrets in GitHub
In your repo on GitHub → **Settings → Secrets and variables → Actions** → **New repository secret**.

Required secrets:
- `MONGODB_URL` (example): `mongodb://admin:dpe_secret_2024@mongodb:27017/dynamic_pricing?authSource=admin`
- `REDIS_URL` (example): `redis://redis:6379`
- `SECRET_KEY` (example): `dpe_super_secret_key_change_in_production`
- `ENVIRONMENT` (example): `production`
- `NEXT_PUBLIC_API_URL` (example): `http://YOUR_BACKEND_HOST:8000`

Optional secrets:
- `REPO_DIR` (path on the runner where the repo should be deployed; default uses `github.workspace`)
- `DATABASE_NAME` (defaults to `dynamic_pricing` in the workflow)

## 2) Register a self-hosted runner
See GitHub docs for your OS.

The workflow runs on labels: `self-hosted` and `linux`.
Make sure your runner has those labels.

## 3) Update CORS / API URL
Backend currently allows CORS origins:
- `http://localhost:3000`
- `http://frontend:3000`

For a production domain, update `backend/app/main.py` CORS `allow_origins` to include your frontend origin.

## 4) Push to main
On every push to `main`, the workflow builds images and runs `docker compose up -d --build`.

Check:
- Frontend: `http://<runner-host>:3000`
- Backend docs: `http://<runner-host>:8000/api/docs`
- Health: `http://<runner-host>:8000/api/health`

