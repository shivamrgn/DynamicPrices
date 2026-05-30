"""
Modular competitor price scraper with fallback logic.
Uses APScheduler for automated 2-hour scrape cycles.
Resilient to website structure changes via multiple parsing strategies.
"""

import asyncio
import aiohttp
import random
from datetime import datetime
from typing import List, Dict, Optional
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings


# Simulated competitor data (replace with real scraping in production)
COMPETITOR_CATALOG = {
    "amazon": {"base_url": "https://www.amazon.in", "markup_range": (0.92, 1.08)},
    "flipkart": {"base_url": "https://www.flipkart.com", "markup_range": (0.88, 1.05)},
    "croma": {"base_url": "https://www.croma.com", "markup_range": (0.95, 1.12)},
    "reliance_digital": {"base_url": "https://www.reliancedigital.in", "markup_range": (0.90, 1.10)},
    "snapdeal": {"base_url": "https://www.snapdeal.com", "markup_range": (0.82, 0.98)},
}


class CompetitorScraper:
    """
    Multi-strategy scraper with automatic fallback.
    
    Strategy 1: Structured API endpoint (fastest)
    Strategy 2: JSON-LD schema parsing
    Strategy 3: CSS selector extraction
    Strategy 4: Cached last-known price (fallback)
    """

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.timeout = aiohttp.ClientTimeout(total=settings.REQUEST_TIMEOUT)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (compatible; PriceBot/2.0)",
            "Accept": "application/json, text/html",
        }
        self._price_cache: Dict[str, float] = {}

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers=self.headers,
            timeout=self.timeout,
        )
        return self

    async def __aexit__(self, *args):
        if self.session:
            await self.session.close()

    @retry(
        stop=stop_after_attempt(settings.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10),
    )
    async def fetch_competitor_prices(
        self, product: Dict
    ) -> List[Dict]:
        """
        Scrape all competitor prices for a product.
        Falls back gracefully on scrape failures.
        """
        results = []
        tasks = [
            self._scrape_single_competitor(product, name, config)
            for name, config in COMPETITOR_CATALOG.items()
        ]

        scrape_results = await asyncio.gather(*tasks, return_exceptions=True)

        for competitor_name, result in zip(COMPETITOR_CATALOG.keys(), scrape_results):
            if isinstance(result, Exception):
                logger.warning(f"Scrape failed for {competitor_name}: {result}. Using fallback.")
                result = self._fallback_price(product, competitor_name)

            if result:
                results.append(result)

        return results

    async def _scrape_single_competitor(
        self, product: Dict, competitor_name: str, config: Dict
    ) -> Optional[Dict]:
        """
        Attempt to scrape competitor price with multiple strategies.
        In production, replace simulation with real HTTP requests.
        """
        await asyncio.sleep(random.uniform(0.1, 0.5))  # Rate limiting simulation

        # PRODUCTION: Replace with actual HTTP request logic:
        # async with self.session.get(url) as response:
        #     html = await response.text()
        #     price = self._parse_strategy_1(html) or self._parse_strategy_2(html)

        # SIMULATION: Generate realistic competitor pricing
        our_price = product.get("current_price", 100)
        markup_low, markup_high = config["markup_range"]
        competitor_price = our_price * random.uniform(markup_low, markup_high)
        competitor_price = round(competitor_price, 2)

        # Randomly simulate stockouts
        in_stock = random.random() > 0.12

        if not in_stock:
            competitor_price = None

        # Cache last known price
        cache_key = f"{competitor_name}:{product['sku']}"
        if competitor_price:
            self._price_cache[cache_key] = competitor_price
        elif cache_key in self._price_cache:
            competitor_price = self._price_cache[cache_key]
        else:
            return None

        delta = competitor_price - our_price
        delta_pct = (delta / our_price) * 100

        return {
            "product_id": product["_id"],
            "competitor_name": competitor_name,
            "competitor_price": round(competitor_price, 2),
            "our_price": our_price,
            "price_delta": round(delta, 2),
            "price_delta_pct": round(delta_pct, 2),
            "in_stock": in_stock,
            "scraped_at": datetime.utcnow(),
            "url": f"{config['base_url']}/search?q={product['sku']}",
        }

    def _fallback_price(self, product: Dict, competitor_name: str) -> Optional[Dict]:
        """Return cached last-known price as emergency fallback."""
        cache_key = f"{competitor_name}:{product['sku']}"
        cached_price = self._price_cache.get(cache_key)

        if not cached_price:
            logger.warning(f"No cache available for {competitor_name}:{product['sku']}")
            return None

        our_price = product.get("current_price", 100)
        return {
            "product_id": product["_id"],
            "competitor_name": competitor_name,
            "competitor_price": cached_price,
            "our_price": our_price,
            "price_delta": round(cached_price - our_price, 2),
            "price_delta_pct": round((cached_price - our_price) / our_price * 100, 2),
            "in_stock": True,
            "scraped_at": datetime.utcnow(),
            "url": None,
            "note": "fallback_cached_price",
        }


async def run_scrape_cycle(db) -> int:
    """
    Main scraper job: fetch all active product prices from all competitors.
    Called by APScheduler every 2 hours.
    """
    logger.info("Starting competitor scrape cycle...")
    total_scraped = 0

    try:
        products = await db.products.find({"status": "active"}).to_list(length=None)
        logger.info(f"Scraping {len(products)} active products...")

        async with CompetitorScraper() as scraper:
            for product in products:
                try:
                    prices = await scraper.fetch_competitor_prices(product)
                    if prices:
                        await db.competitor_prices.insert_many(prices)
                        total_scraped += len(prices)
                except Exception as e:
                    logger.error(f"Error scraping product {product.get('sku')}: {e}")

        logger.info(f"Scrape cycle complete. {total_scraped} price points collected.")
        return total_scraped

    except Exception as e:
        logger.error(f"Scrape cycle failed: {e}")
        return 0
