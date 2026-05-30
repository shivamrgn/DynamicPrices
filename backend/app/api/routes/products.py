from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from typing import Optional, List
from loguru import logger

from app.db.mongodb import get_database
from app.schemas.models import ProductCreate, ProductUpdate

router = APIRouter()


def serialize_product(p: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    p["id"] = str(p.pop("_id"))
    p["margin_pct"] = round(
        (p.get("current_price", 0) - p.get("cost_price", 0))
        / max(p.get("current_price", 1), 1) * 100, 2
    )
    return p


@router.get("/")
async def list_products(
    category: Optional[str] = None,
    status: Optional[str] = "active",
    page: int = 1,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status

    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query).skip(skip).limit(limit).to_list(length=limit)

    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "products": [serialize_product(p) for p in products],
    }


@router.get("/{product_id}")
async def get_product(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return serialize_product(product)


@router.post("/")
async def create_product(
    product: ProductCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # Check duplicate SKU
    existing = await db.products.find_one({"sku": product.sku})
    if existing:
        raise HTTPException(status_code=409, detail=f"SKU '{product.sku}' already exists")

    doc = product.model_dump()
    doc["created_at"] = datetime.utcnow()
    doc["last_updated"] = datetime.utcnow()

    result = await db.products.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.patch("/{product_id}")
async def update_product(
    product_id: str,
    updates: ProductUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_data["last_updated"] = datetime.utcnow()

    result = await db.products.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"updated": True, "product_id": product_id}


@router.get("/categories/list")
async def get_categories(db: AsyncIOMotorDatabase = Depends(get_database)):
    categories = await db.products.distinct("category")
    return {"categories": sorted(categories)}
