from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from bson import ObjectId
from loguru import logger

from app.db.mongodb import get_database
from app.ml.forecasting.prophet_xgb import EnsembleForecaster

router = APIRouter()


@router.get("/product/{product_id}")
async def get_product_forecast(
    product_id: str,
    horizon_days: int = 30,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Generate demand forecast for a product."""
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch sales history
    sales_history = await db.sales_history.find(
        {"product_id": product_id},
        sort=[("date", 1)],
    ).to_list(length=365)

    # Fit ensemble model
    forecaster = EnsembleForecaster()
    fitted = forecaster.fit(sales_history)

    forecast_points, accuracy, model_used = forecaster.predict(
        horizon_days=horizon_days,
        category=product.get("category", "default"),
        current_price=product.get("current_price"),
    )

    seasonal_factors = forecaster.get_seasonal_factors()

    return {
        "product_id": product_id,
        "product_name": product.get("name"),
        "model_used": model_used,
        "accuracy_score": accuracy,
        "forecast_horizon_days": horizon_days,
        "forecasts": forecast_points,
        "seasonal_factors": seasonal_factors,
        "created_at": datetime.utcnow().isoformat(),
        "data_points_used": len(sales_history),
        "cold_start": not fitted,
    }


@router.get("/all")
async def get_all_forecasts(
    limit: int = 10,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Get latest forecasts for all products."""
    products = await db.products.find(
        {"status": "active"},
        limit=limit,
    ).to_list(length=limit)

    summaries = []
    for p in products:
        product_id = str(p["_id"])
        sales_history = await db.sales_history.find(
            {"product_id": product_id}
        ).to_list(length=90)

        forecaster = EnsembleForecaster()
        forecaster.fit(sales_history)
        points, accuracy, model = forecaster.predict(
            horizon_days=7,
            category=p.get("category", "default"),
        )

        avg_forecast = sum(pt["predicted_demand"] for pt in points) / len(points) if points else 0

        summaries.append({
            "product_id": product_id,
            "product_name": p.get("name"),
            "category": p.get("category"),
            "avg_weekly_demand": round(avg_forecast * 7, 1),
            "accuracy_score": accuracy,
            "model_used": model,
            "next_7_days": points[:7],
        })

    return summaries
