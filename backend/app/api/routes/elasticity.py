from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from bson import ObjectId

from app.db.mongodb import get_database
from app.ml.elasticity.engine import ElasticityEngine

router = APIRouter()


@router.get("/product/{product_id}")
async def get_product_elasticity(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch price-demand pairs
    sales_data = await db.sales_history.find(
        {"product_id": product_id},
        sort=[("date", -1)],
        limit=90,
    ).to_list(length=90)

    engine = ElasticityEngine()
    pairs = [
        {"price": s.get("price", product.get("current_price")), "units_sold": s.get("units_sold", 0)}
        for s in sales_data
        if s.get("units_sold", 0) > 0
    ]

    elasticity, r_squared, classification = engine.compute_elasticity(pairs)

    optimal_range = engine.get_optimal_price_range(
        current_price=product["current_price"],
        elasticity=elasticity,
        cost_price=product["cost_price"],
        min_price=product["min_price"],
        max_price=product["max_price"],
    )

    scatter_data = engine.generate_scatter_data(pairs, elasticity, product["current_price"])

    revenue_impact = engine.compute_revenue_impact(
        current_price=product["current_price"],
        target_price=optimal_range["optimal"],
        current_demand=10.0,
        elasticity=elasticity,
    )

    return {
        "product_id": product_id,
        "product_name": product.get("name"),
        "elasticity_coefficient": elasticity,
        "r_squared": r_squared,
        "elasticity_type": classification,
        "price_sensitivity": engine.get_sensitivity_label(elasticity),
        "optimal_price_range": optimal_range,
        "revenue_impact_pct": revenue_impact,
        "confidence": round(min(0.95, r_squared + 0.15), 3),
        "scatter_data": scatter_data,
        "data_points": len(pairs),
        "created_at": datetime.utcnow().isoformat(),
    }


@router.get("/all")
async def get_all_elasticity(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get elasticity summary for all products."""
    products = await db.products.find({"status": "active"}, limit=20).to_list(length=20)

    results = []
    for p in products:
        product_id = str(p["_id"])
        sales_data = await db.sales_history.find(
            {"product_id": product_id}, limit=60
        ).to_list(length=60)

        engine = ElasticityEngine()
        pairs = [
            {"price": s.get("price", p.get("current_price")), "units_sold": s.get("units_sold", 0)}
            for s in sales_data if s.get("units_sold", 0) > 0
        ]

        elasticity, r_sq, classification = engine.compute_elasticity(pairs)

        results.append({
            "product_id": product_id,
            "product_name": p.get("name"),
            "category": p.get("category"),
            "elasticity_coefficient": elasticity,
            "elasticity_type": classification,
            "price_sensitivity": engine.get_sensitivity_label(elasticity),
            "current_price": p.get("current_price"),
        })

    return results
