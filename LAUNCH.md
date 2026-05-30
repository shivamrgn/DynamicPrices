# 🚀 Launching the Enterprise Dynamic Pricing Engine (DPE)

This guide provides step-by-step instructions on how to properly set up, configure, and launch the **Enterprise Dynamic Pricing Engine (DPE)** on Windows.

---

## 📋 Prerequisites
Before you start, make sure you have the following installed on your system:
* **Docker Desktop** (v24+ or later, with Linux Containers enabled via WSL2) — *Highly Recommended*
* **Python** (v3.10 or v3.11) — *For local development*
* **Node.js** (v18+ or v20+) and **npm** — *For local development*
* **Git** (optional, for version control)

---

## 🐳 Option A: Using Docker Compose (Recommended)
Docker Compose is the easiest and most reliable way to spin up the entire stack. It automatically configures and runs all 4 required services: **MongoDB**, **Redis**, the **FastAPI Backend**, and the **Next.js Frontend**.

### Step 1: Open Terminal in the Project Root
Open PowerShell, CMD, or your Git Bash terminal at the root of the project:
```powershell
cd c:/Users/ramch/Downloads/dynamic-pricing-engine
```

### Step 2: Spin Up the Containers
Run the following command to build and start the services in the background:
```bash
docker compose up -d --build
```
> [!NOTE]
> The initial build might take a few minutes as it downloads base images for MongoDB/Redis and installs packages/dependencies for the backend and frontend.

### Step 3: Seed the Database
Once all containers show a status of `Running` or `Healthy`, populate the MongoDB database with dynamic pricing seed data:
```bash
docker exec dpe_backend python -m app.db.seed
```

### Step 4: Verify the Launch
Open your web browser and access the following URLs:
* 🌐 **Frontend Application**: [http://localhost:3000](http://localhost:3000) (Next.js Dashboard)
* 📖 **Backend Swagger Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs) (Interactive API Docs)
* 🏥 **Backend Health Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health) (Should return `{"status": "healthy"}`)

To stop the application at any time, run:
```bash
docker compose down
```

---

## 💻 Option B: Local Development Setup
If you need to debug the backend or frontend directly with hot-reloading outside of Docker, follow this local setup:

### Step 1: Start MongoDB and Redis (via Docker)
To avoid manual installations, run lightweight database containers in Docker:
```bash
# Start MongoDB 7.0
docker run -d --name dpe_mongo -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=dpe_secret_2024 -e MONGO_INITDB_DATABASE=dynamic_pricing -p 27017:27017 mongo:7.0

# Start Redis 7.2
docker run -d --name dpe_redis -p 6379:6379 redis:7.2-alpine
```

### Step 2: Launch the Backend (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   # Create environment
   python -m venv venv
   
   # Activate on Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   
   # Activate on Windows CMD:
   .\venv\Scripts\activate.bat
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify environment configuration:
   Make sure you have configured [backend/.env](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/backend/.env) (defaults are configured for local development).
5. Seed the database locally:
   ```bash
   python -m app.db.seed
   ```
6. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend will be running at [http://localhost:8000](http://localhost:8000).

### Step 3: Launch the Frontend (Next.js)
1. Open a new terminal window/tab and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Verify environment configuration:
   Check the [frontend/.env.local](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/frontend/.env.local) file. It must point to the local backend URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
   The frontend will be running at [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Troubleshooting & Common Issues

### 1. Ports Already in Use (e.g. `3000`, `8000`, `27017`, `6379`)
* **Error**: `port is already allocated` or `bind: address already in use`.
* **Fix**: Check if you have existing services (like a local MongoDB service or another Node server) running on these ports. You can find and kill processes running on Windows using PowerShell:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
  ```

### 2. WSL2/Docker Integration Errors on Windows
* **Error**: Docker Desktop cannot connect to the Docker daemon.
* **Fix**: Open Docker Desktop settings, go to **General**, and verify that **Use the WSL 2 based engine** is checked. If it is checked, restart Docker Desktop or run `wsl --shutdown` in PowerShell, then open Docker Desktop again.

### 3. Database Connection Failure
* **Error**: Backend logs report connection timeout or auth failure when connecting to MongoDB.
* **Fix**: Ensure your environment variables in [backend/.env](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/backend/.env) match the credentials used in [docker-compose.yml](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/docker-compose.yml).
  * Inside Docker network: Use `mongodb` as host (`mongodb://admin:dpe_secret_2024@mongodb:27017/...`).
  * Running locally: Use `localhost` as host (`mongodb://admin:dpe_secret_2024@localhost:27017/...`).

---

## 📂 Key File References
* 🐋 Docker Compose Configuration: [docker-compose.yml](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/docker-compose.yml)
* 🐍 Backend Service Directory: [backend](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/backend)
* ⚛️ Frontend Service Directory: [frontend](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/frontend)
* 🌱 Database Seed Script: [seed.py](file:///c:/Users/ramch/Downloads/dynamic-pricing-engine/backend/app/db/seed.py)
