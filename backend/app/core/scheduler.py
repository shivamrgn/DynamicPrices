from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger
import asyncio
from datetime import datetime

from app.core.config import settings

scheduler = AsyncIOScheduler(timezone="UTC")


async def competitor_scrape_job():
    """Runs every 2 hours: scrape competitor prices."""
    from app.scrapers.competitor_scraper import run_scrape_cycle
    from app.db.mongodb import get_database
    db = get_database()
    count = await run_scrape_cycle(db)
    logger.info(f"[Scheduler] Scrape job complete: {count} records collected.")


async def rl_decision_job():
    """Runs every 4 hours: generate RL pricing decisions for all active products."""
    from app.services.pricing_service import generate_all_rl_decisions
    from app.db.mongodb import get_database
    db = get_database()
    count = await generate_all_rl_decisions(db)
    logger.info(f"[Scheduler] RL decision job: {count} decisions generated.")


async def forecast_refresh_job():
    """Runs daily: refresh demand forecasts."""
    from app.services.forecasting_service import refresh_all_forecasts
    from app.db.mongodb import get_database
    db = get_database()
    count = await refresh_all_forecasts(db)
    logger.info(f"[Scheduler] Forecast refresh: {count} products updated.")


def start_scheduler():
    """Register all scheduled jobs and start the scheduler."""
    # Competitor price scraping - every 2 hours
    scheduler.add_job(
        competitor_scrape_job,
        trigger=IntervalTrigger(hours=settings.SCRAPER_INTERVAL_HOURS),
        id="competitor_scraper",
        name="Competitor Price Scraper",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # RL decisions - every 4 hours
    scheduler.add_job(
        rl_decision_job,
        trigger=IntervalTrigger(hours=4),
        id="rl_decisions",
        name="RL Pricing Decisions",
        replace_existing=True,
        misfire_grace_time=600,
    )

    # Forecast refresh - daily
    scheduler.add_job(
        forecast_refresh_job,
        trigger=IntervalTrigger(hours=24),
        id="forecast_refresh",
        name="Demand Forecast Refresh",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    scheduler.start()
    logger.info(f"Scheduler started with {len(scheduler.get_jobs())} jobs.")


def shutdown_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
