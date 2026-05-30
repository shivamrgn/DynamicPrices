"""Price history API routes."""
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from app.db.mongodb import get_database

router = APIRouter()


@router.get("/history/{product_id}")
async def get_price_history(
    product_id: str,
    days: int = 30,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    since = datetime.utcnow() - timedelta(days=days)
    history = await db.price_history.find(
        {"product_id": product_id, "timestamp": {"$gte": since}},
        sort=[("timestamp", 1)],
    ).to_list(length=None)

    return [
        {
            "price": h.get("price"),
            "ai_price": h.get("ai_price"),
            "action": h.get("action"),
            "reason": h.get("reason"),
            "timestamp": h.get("timestamp", datetime.utcnow()).isoformat(),
        }
        for h in history
    ]


@router.post("/update")
async def update_price(
    body: dict,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    from bson import ObjectId
    product_id = body.get("product_id")
    new_price = body.get("new_price")

    if not product_id or not new_price:
        raise HTTPException(status_code=400, detail="product_id and new_price required")

    try:
        await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"current_price": new_price, "last_updated": datetime.utcnow()}}
        )
        await db.price_history.insert_one({
            "product_id": product_id,
            "price": new_price,
            "action": "manual_override",
            "reason": body.get("reason", "Manual override"),
            "manual_override": True,
            "timestamp": datetime.utcnow(),
        })
        return {"success": True, "new_price": new_price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
