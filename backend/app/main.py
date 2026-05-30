from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys

from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.core.scheduler import start_scheduler, shutdown_scheduler
from app.api.routes import (
    products, prices, competitors, forecasting,
    inventory, dashboard, elasticity, rl_engine
)


# Configure logging
logger.remove()
logger.add(sys.stderr, format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}", level="INFO")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("Starting Dynamic Pricing Engine...")
    await connect_to_mongo()
    start_scheduler()
    logger.info("All services initialized.")
    yield
    logger.info("Shutting down Dynamic Pricing Engine...")
    shutdown_scheduler()
    await close_mongo_connection()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="Enterprise Dynamic Pricing Engine",
    description="AI-powered real-time pricing optimization platform",
    version="2.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(prices.router, prefix="/api/prices", tags=["Prices"])
app.include_router(competitors.router, prefix="/api/competitors", tags=["Competitors"])
app.include_router(forecasting.router, prefix="/api/forecasting", tags=["Forecasting"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(elasticity.router, prefix="/api/elasticity", tags=["Elasticity"])
app.include_router(rl_engine.router, prefix="/api/rl", tags=["RL Engine"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "version": "2.1.0",
        "engine": "Dynamic Pricing AI v2",
        "services": {
            "database": "connected",
            "scheduler": "running",
            "ml_engine": "online"
        }
    }
