"""RL Engine API routes."""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId
import random

from app.db.mongodb import get_database
from app.ml.reinforcement.q_agent import get_rl_agent

router = APIRouter()


@router.get("/decisions")
async def get_pending_decisions(
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Get pending AI pricing decisions awaiting approval."""
    decisions = await db.rl_decisions.find(
        {"approved": False},
        sort=[("created_at", -1)],
        limit=limit,
    ).to_list(length=limit)

    return [
        {
            "id": str(d["_id"]),
            "product_id": d.get("product_id"),
            "product_name": d.get("product_name"),
            "sku": d.get("sku", "N/A"),
            "current_price": d.get("current_price"),
            "recommended_price": d.get("recommended_price"),
            "action": d.get("action"),
            "price_change_pct": d.get("price_change_pct"),
            "expected_profit_impact": d.get("expected_profit_impact"),
            "expected_revenue_impact": d.get("expected_revenue_impact"),
            "reasoning": d.get("reasoning"),
            "confidence": d.get("confidence"),
            "created_at": d.get("created_at", datetime.utcnow()).isoformat(),
        }
        for d in decisions
    ]


@router.post("/approve/{decision_id}")
async def approve_decision(
    decision_id: str,
    body: dict = {},
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Approve an AI pricing decision and apply it."""
    try:
        oid = ObjectId(decision_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid decision ID")

    decision = await db.rl_decisions.find_one({"_id": oid})
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    new_price = body.get("override_price") or decision.get("recommended_price")

    # Apply price to product
    try:
        await db.products.update_one(
            {"_id": ObjectId(decision["product_id"])},
            {"$set": {"current_price": new_price, "last_updated": datetime.utcnow()}}
        )
    except Exception:
        pass

    # Mark decision as approved
    await db.rl_decisions.update_one(
        {"_id": oid},
        {"$set": {"approved": True, "approved_at": datetime.utcnow(), "applied_price": new_price}}
    )

    # Log to price history
    await db.price_history.insert_one({
        "product_id": decision["product_id"],
        "price": new_price,
        "ai_price": decision.get("recommended_price"),
        "action": decision.get("action"),
        "reason": decision.get("reasoning"),
        "manual_override": False,
        "timestamp": datetime.utcnow(),
    })

    return {"success": True, "applied_price": new_price, "decision_id": decision_id}


@router.post("/simulate")
async def simulate_pricing(
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Interactive Q-Learning sandbox simulation."""
    product_id = body.get("product_id")
    competitor_price = body.get("competitor_price", 100)
    inventory_level = body.get("inventory_level", 50)
    demand_multiplier = body.get("demand_multiplier", 1.0)

    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    agent = get_rl_agent()

    # Normalize inputs
    max_stock = product.get("stock_quantity", 100) or 100
    inv_normalized = min(1.0, inventory_level / max_stock)
    demand_normalized = min(1.0, demand_multiplier / 5.0)

    result = agent.get_price_recommendation(
        current_price=product["current_price"],
        cost_price=product["cost_price"],
        inventory_level=inv_normalized,
        demand_score=demand_normalized,
        competitor_price=competitor_price,
        sales_velocity=random.uniform(3, 18),
        min_price=product["min_price"],
        max_price=product["max_price"],
    )

    return {
        "product_name": product.get("name"),
        "current_price": product["current_price"],
        **result,
    }


@router.post("/generate/{product_id}")
async def generate_decision(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Generate a fresh RL decision for a specific product."""
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Get latest competitor price
    latest_comp = await db.competitor_prices.find_one(
        {"product_id": product_id},
        sort=[("scraped_at", -1)],
    )
    competitor_price = latest_comp["competitor_price"] if latest_comp else product["current_price"]

    agent = get_rl_agent()
    max_stock = product.get("stock_quantity", 100) or 100
    stock = product.get("stock_quantity", 50)

    result = agent.get_price_recommendation(
        current_price=product["current_price"],
        cost_price=product["cost_price"],
        inventory_level=min(1.0, stock / max_stock),
        demand_score=random.uniform(0.4, 0.8),
        competitor_price=competitor_price,
        sales_velocity=random.uniform(2, 20),
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

    inserted = await db.rl_decisions.insert_one(doc)
    doc["id"] = str(inserted.inserted_id)
    doc.pop("_id", None)

    return doc
