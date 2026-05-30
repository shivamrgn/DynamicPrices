from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from app.db.mongodb import get_database

router = APIRouter()


@router.get("/alerts")
async def get_inventory_alerts(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get stock level alerts with AI pricing recommendations."""
    products = await db.products.find({"status": "active"}).to_list(length=None)

    critical, warning, healthy = [], [], []

    for p in products:
        stock = p.get("stock_quantity", 0)
        price = p.get("current_price", 0)
        cost = p.get("cost_price", 0)

        # Estimate daily sales (simplified)
        daily_sales = max(1, price / 10)
        days_of_stock = stock / daily_sales if daily_sales > 0 else 999
        reorder_point = int(daily_sales * 14)  # 14-day lead time

        # Alert classification
        if days_of_stock < 7 or stock < 10:
            level = "critical"
            action = "Urgent restock required. Consider price increase to slow depletion."
            ai_price = round(price * 1.08, 2)
        elif days_of_stock < 21:
            level = "warning"
            action = "Stock running low. Monitor closely."
            ai_price = round(price * 1.03, 2)
        elif stock > 500:
            level = "warning"
            action = "Overstock detected. Price reduction recommended to clear inventory."
            ai_price = round(max(p.get("min_price", cost * 1.1), price * 0.92), 2)
        else:
            level = "ok"
            action = "Stock levels are healthy."
            ai_price = None

        item = {
            "product_id": str(p["_id"]),
            "product_name": p.get("name"),
            "sku": p.get("sku"),
            "current_stock": stock,
            "reorder_point": reorder_point,
            "days_of_stock": round(days_of_stock, 1),
            "alert_level": level,
            "recommended_action": action,
            "ai_price_recommendation": ai_price,
            "current_price": price,
        }

        if level == "critical":
            critical.append(item)
        elif level == "warning":
            warning.append(item)
        else:
            healthy.append(item)

    all_alerts = critical + warning + healthy

    return {
        "total_products": len(products),
        "critical_alerts": len(critical),
        "warning_alerts": len(warning),
        "healthy_stock": len(healthy),
        "alerts": all_alerts,
    }


@router.get("/summary")
async def get_inventory_summary(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Aggregate inventory metrics."""
    pipeline = [
        {"$match": {"status": "active"}},
        {
            "$group": {
                "_id": "$category",
                "total_units": {"$sum": "$stock_quantity"},
                "avg_stock": {"$avg": "$stock_quantity"},
                "product_count": {"$sum": 1},
                "total_value": {
                    "$sum": {"$multiply": ["$stock_quantity", "$cost_price"]}
                },
            }
        },
        {"$sort": {"total_value": -1}},
    ]

    categories = await db.products.aggregate(pipeline).to_list(length=None)

    return {
        "by_category": [
            {
                "category": c["_id"],
                "total_units": c.get("total_units", 0),
                "avg_stock": round(c.get("avg_stock", 0), 1),
                "product_count": c.get("product_count", 0),
                "total_value_usd": round(c.get("total_value", 0), 2),
            }
            for c in categories
        ]
    }
