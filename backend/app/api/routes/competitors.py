"""Competitor monitoring API routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from bson import ObjectId
from loguru import logger
from typing import Optional
import random
from pydantic import BaseModel, Field

from app.db.mongodb import get_database

router = APIRouter()


@router.get("/matrix")
async def get_competitor_matrix(
    product_id: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Get competitor price comparison matrix."""
    query = {}
    if product_id:
        try:
            query["product_id"] = product_id
        except Exception:
            pass

    # Get latest price per competitor per product
    pipeline = [
        {"$sort": {"scraped_at": -1}},
        {
            "$group": {
                "_id": {"product_id": "$product_id", "competitor_name": "$competitor_name"},
                "latest": {"$first": "$$ROOT"},
            }
        },
        {"$replaceRoot": {"newRoot": "$latest"}},
        {"$limit": 100},
    ]

    prices = await db.competitor_prices.aggregate(pipeline).to_list(length=None)

    return {
        "count": len(prices),
        "competitors": list(set(p.get("competitor_name") for p in prices)),
        "data": [
            {
                "id": str(p.get("_id", "")),
                "product_id": str(p.get("product_id", "")),
                "competitor_name": p.get("competitor_name"),
                "competitor_price": p.get("competitor_price"),
                "our_price": p.get("our_price"),
                "price_delta": p.get("price_delta"),
                "price_delta_pct": p.get("price_delta_pct"),
                "in_stock": p.get("in_stock", True),
                "scraped_at": p.get("scraped_at", datetime.utcnow()).isoformat(),
            }
            for p in prices
        ],
    }


@router.get("/summary")
async def get_competitor_summary(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Aggregated summary by competitor."""
    pipeline = [
        {"$sort": {"scraped_at": -1}},
        {
            "$group": {
                "_id": "$competitor_name",
                "avg_price": {"$avg": "$competitor_price"},
                "min_price": {"$min": "$competitor_price"},
                "max_price": {"$max": "$competitor_price"},
                "products_tracked": {"$sum": 1},
                "last_scraped": {"$first": "$scraped_at"},
                "avg_delta_pct": {"$avg": "$price_delta_pct"},
            }
        },
    ]

    summaries = await db.competitor_prices.aggregate(pipeline).to_list(length=None)

    return [
        {
            "competitor_name": s["_id"],
            "avg_price": round(s.get("avg_price", 0), 2),
            "min_price": round(s.get("min_price", 0), 2),
            "max_price": round(s.get("max_price", 0), 2),
            "products_tracked": s.get("products_tracked", 0),
            "last_scraped": s.get("last_scraped", datetime.utcnow()).isoformat(),
            "avg_delta_pct": round(s.get("avg_delta_pct", 0), 2),
        }
        for s in summaries
    ]


@router.get("/history/{product_id}")
async def get_competitor_history(
    product_id: str,
    days: int = 7,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Historical competitor price trend for a product."""
    since = datetime.utcnow() - timedelta(days=days)
    prices = await db.competitor_prices.find(
        {"product_id": product_id, "scraped_at": {"$gte": since}},
        sort=[("scraped_at", 1)],
    ).to_list(length=None)

    return {
        "product_id": product_id,
        "days": days,
        "data": [
            {
                "competitor_name": p.get("competitor_name"),
                "price": p.get("competitor_price"),
                "our_price": p.get("our_price"),
                "timestamp": p.get("scraped_at", datetime.utcnow()).isoformat(),
            }
            for p in prices
        ],
    }


class ManualCompetitorPrice(BaseModel):
    product_id: str
    competitor_name: str
    competitor_price: float = Field(gt=0)
    in_stock: bool = True


@router.post("/scrape")
async def trigger_scrape(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Manually trigger competitor scraping cycle."""
    from app.scrapers.competitor_scraper import run_scrape_cycle
    from app.services.pricing_service import generate_all_rl_decisions
    
    # 1. Run competitor scraping
    total_scraped = await run_scrape_cycle(db)
    
    # 2. Run RL decisions to update recommendations based on new competitor prices
    decisions_count = await generate_all_rl_decisions(db)
    
    return {
        "success": True, 
        "prices_scraped": total_scraped,
        "decisions_generated": decisions_count,
        "message": f"Scraped {total_scraped} prices and updated {decisions_count} AI recommendations."
    }


@router.post("/add")
async def add_competitor_price(
    body: ManualCompetitorPrice,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Manually insert a competitor price point and trigger an immediate RL update."""
    try:
        product_oid = ObjectId(body.product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    product = await db.products.find_one({"_id": product_oid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    our_price = product.get("current_price", 100)
    delta = body.competitor_price - our_price
    delta_pct = (delta / our_price) * 100

    doc = {
        "product_id": body.product_id,
        "competitor_name": body.competitor_name,
        "competitor_price": round(body.competitor_price, 2),
        "our_price": our_price,
        "price_delta": round(delta, 2),
        "price_delta_pct": round(delta_pct, 2),
        "in_stock": body.in_stock,
        "scraped_at": datetime.utcnow(),
        "url": f"https://www.{body.competitor_name}.com/search?q={product.get('sku')}",
        "note": "manually_added",
    }

    # Insert competitor price
    inserted = await db.competitor_prices.insert_one(doc)

    # Trigger immediate RL update for this product so it reflects instantly in the queue!
    from app.ml.reinforcement.q_agent import get_rl_agent
    
    latest_comp = await db.competitor_prices.find_one(
        {"product_id": body.product_id},
        sort=[("scraped_at", -1)],
    )
    competitor_price = latest_comp["competitor_price"] if latest_comp else our_price
    max_stock = max(product.get("stock_quantity", 1), 1)

    agent = get_rl_agent()
    result = agent.get_price_recommendation(
        current_price=our_price,
        cost_price=product["cost_price"],
        inventory_level=min(1.0, product.get("stock_quantity", 50) / max_stock),
        demand_score=random.uniform(0.4, 0.8),
        competitor_price=competitor_price,
        sales_velocity=random.uniform(2, 20),
        min_price=product["min_price"],
        max_price=product["max_price"],
    )

    rl_doc = {
        "product_id": body.product_id,
        "product_name": product.get("name"),
        "sku": product.get("sku"),
        **result,
        "approved": False,
        "created_at": datetime.utcnow(),
    }

    await db.rl_decisions.insert_one(rl_doc)

    return {
        "success": True,
        "price_id": str(inserted.inserted_id),
        "pricing_recommendation": result
    }



