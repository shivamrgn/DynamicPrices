"""Pricing service: generates RL decisions for all active products."""

import random
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from loguru import logger

from app.ml.reinforcement.q_agent import get_rl_agent


async def generate_all_rl_decisions(db: AsyncIOMotorDatabase) -> int:
    """Generate RL pricing decisions for all active products."""
    products = await db.products.find({"status": "active"}).to_list(length=None)
    agent = get_rl_agent()
    count = 0

    for product in products:
        try:
            product_id = str(product["_id"])

            # Get latest competitor price
            latest_comp = await db.competitor_prices.find_one(
                {"product_id": product_id},
                sort=[("scraped_at", -1)],
            )
            competitor_price = latest_comp["competitor_price"] if latest_comp else product["current_price"]
            max_stock = max(product.get("stock_quantity", 1), 1)

            result = agent.get_price_recommendation(
                current_price=product["current_price"],
                cost_price=product["cost_price"],
                inventory_level=min(1.0, product.get("stock_quantity", 50) / max_stock),
                demand_score=random.uniform(0.3, 0.8),
                competitor_price=competitor_price,
                sales_velocity=random.uniform(1, 20),
                min_price=product["min_price"],
                max_price=product["max_price"],
            )

            doc = {
                "product_id": product_id,
                "product_name": product.get("name"),
                "sku": product.get("sku"),
                **result,
                "approved": False,
                "created_at": datetime.utcnow(),
            }

            await db.rl_decisions.insert_one(doc)
            count += 1

        except Exception as e:
            logger.error(f"RL decision error for {product.get('sku')}: {e}")

    return count


async def refresh_all_forecasts(db: AsyncIOMotorDatabase) -> int:
    """Refresh demand forecasts for all products."""
    from app.ml.forecasting.prophet_xgb import EnsembleForecaster

    products = await db.products.find({"status": "active"}).to_list(length=None)
    count = 0

    for product in products:
        try:
            product_id = str(product["_id"])
            sales = await db.sales_history.find(
                {"product_id": product_id}
            ).to_list(length=365)

            forecaster = EnsembleForecaster()
            forecaster.fit(sales)
            points, accuracy, model = forecaster.predict(
                category=product.get("category", "default")
            )

            await db.forecasts.insert_one({
                "product_id": product_id,
                "product_name": product.get("name"),
                "model_used": model,
                "accuracy_score": accuracy,
                "forecast_points": points,
                "created_at": datetime.utcnow(),
            })
            count += 1

        except Exception as e:
            logger.error(f"Forecast error for {product.get('sku')}: {e}")

    return count
