"""
Seed script: Populates MongoDB with realistic product and sales data.
Run: python -m app.db.seed
"""

import asyncio
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from faker import Faker

fake = Faker()

MONGODB_URL = "mongodb://admin:dpe_secret_2024@localhost:27017/dynamic_pricing?authSource=admin"

PRODUCTS = [
    {"sku": "DYVAC-V15", "name": "Dyson V15 Detect Absolute", "category": "appliances", "brand": "Dyson",
     "current_price": 52999, "cost_price": 38000, "min_price": 44000, "max_price": 62000, "stock_quantity": 87},
    {"sku": "SONY-WH1000", "name": "Sony WH-1000XM5 Headphones", "category": "electronics", "brand": "Sony",
     "current_price": 26999, "cost_price": 18000, "min_price": 20000, "max_price": 32000, "stock_quantity": 214},
    {"sku": "APPLE-AW9", "name": "Apple Watch Series 9 GPS", "category": "electronics", "brand": "Apple",
     "current_price": 41900, "cost_price": 30000, "min_price": 35000, "max_price": 50000, "stock_quantity": 53},
    {"sku": "SAM-QN65", "name": "Samsung 65\" QLED 4K TV", "category": "electronics", "brand": "Samsung",
     "current_price": 89990, "cost_price": 64000, "min_price": 72000, "max_price": 105000, "stock_quantity": 28},
    {"sku": "LG-WFEX", "name": "LG 8kg Front Load Washer", "category": "appliances", "brand": "LG",
     "current_price": 34999, "cost_price": 24000, "min_price": 28000, "max_price": 42000, "stock_quantity": 41},
    {"sku": "NIKE-AIR-270", "name": "Nike Air Max 270", "category": "clothing", "brand": "Nike",
     "current_price": 10995, "cost_price": 5500, "min_price": 7500, "max_price": 13000, "stock_quantity": 312},
    {"sku": "INST-APC", "name": "Instant Pot Duo 7-in-1", "category": "appliances", "brand": "Instant Brands",
     "current_price": 7999, "cost_price": 4500, "min_price": 5500, "max_price": 9500, "stock_quantity": 156},
    {"sku": "BOAT-AIRDOPES-141", "name": "boAt Airdopes 141 TWS", "category": "electronics", "brand": "boAt",
     "current_price": 999, "cost_price": 450, "min_price": 699, "max_price": 1499, "stock_quantity": 892},
    {"sku": "PHIL-AIR6K", "name": "Philips Air Fryer 4.1L HD9200", "category": "appliances", "brand": "Philips",
     "current_price": 6999, "cost_price": 4200, "min_price": 5200, "max_price": 8500, "stock_quantity": 9},  # critical stock
    {"sku": "AMAZ-ECHO4", "name": "Amazon Echo (4th Gen)", "category": "electronics", "brand": "Amazon",
     "current_price": 6999, "cost_price": 4500, "min_price": 5000, "max_price": 8500, "stock_quantity": 478},
    {"sku": "DELL-XPS13", "name": "Dell XPS 13 Plus (i7, 16GB)", "category": "electronics", "brand": "Dell",
     "current_price": 119990, "cost_price": 88000, "min_price": 99000, "max_price": 135000, "stock_quantity": 17},
    {"sku": "WHIRL-SEMI850", "name": "Whirlpool 185L Single Door Refrigerator", "category": "appliances", "brand": "Whirlpool",
     "current_price": 14490, "cost_price": 9800, "min_price": 11500, "max_price": 17000, "stock_quantity": 64},
]

COMPETITORS = ["amazon", "flipkart", "croma", "reliance_digital", "snapdeal"]


async def seed(db=None):
    close_client = False
    if db is None:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client["dynamic_pricing"]
        close_client = True

    print("Clearing existing data...")
    await db.products.delete_many({})
    await db.sales_history.delete_many({})
    await db.competitor_prices.delete_many({})
    await db.rl_decisions.delete_many({})
    await db.price_history.delete_many({})

    print("Inserting products...")
    for p in PRODUCTS:
        p["status"] = "active"
        p["tags"] = [p["category"], p["brand"].lower()]
        p["created_at"] = datetime.utcnow()
        p["last_updated"] = datetime.utcnow()

    result = await db.products.insert_many(PRODUCTS)
    product_ids = result.inserted_ids
    print(f"  Inserted {len(product_ids)} products.")

    # Generate 90-day sales history
    print("Generating sales history...")
    sales_docs = []
    for pid, product in zip(product_ids, PRODUCTS):
        base_demand = product["stock_quantity"] / 30
        for day in range(90):
            date = datetime.utcnow() - timedelta(days=90 - day)
            dow = date.weekday()
            weekend_boost = 1.3 if dow >= 5 else 1.0
            seasonal = 1 + 0.2 * abs(day - 45) / 45
            units = max(0, int(base_demand * weekend_boost * seasonal * random.uniform(0.7, 1.3)))

            sales_docs.append({
                "product_id": str(pid),
                "date": date.strftime("%Y-%m-%d"),
                "units_sold": units,
                "price": product["current_price"] * random.uniform(0.95, 1.05),
                "revenue": units * product["current_price"],
            })

    await db.sales_history.insert_many(sales_docs)
    print(f"  Inserted {len(sales_docs)} sales records.")

    # Generate competitor prices
    print("Generating competitor prices...")
    comp_docs = []
    for pid, product in zip(product_ids, PRODUCTS):
        for comp in COMPETITORS:
            for day in range(14):
                dt = datetime.utcnow() - timedelta(days=14 - day, hours=random.randint(0, 4))
                markup = random.uniform(0.88, 1.12)
                comp_price = round(product["current_price"] * markup, 2)
                delta = comp_price - product["current_price"]
                comp_docs.append({
                    "product_id": str(pid),
                    "competitor_name": comp,
                    "competitor_price": comp_price,
                    "our_price": product["current_price"],
                    "price_delta": round(delta, 2),
                    "price_delta_pct": round(delta / product["current_price"] * 100, 2),
                    "in_stock": random.random() > 0.1,
                    "scraped_at": dt,
                })

    await db.competitor_prices.insert_many(comp_docs)
    print(f"  Inserted {len(comp_docs)} competitor price records.")

    # Generate RL decisions
    print("Generating RL decisions...")
    actions = ["increase", "decrease", "maintain"]
    reasons = [
        "Competitor stockout detected — premium capture opportunity.",
        "Overstock alert — price reduction to accelerate sell-through.",
        "High demand forecast — margin expansion possible.",
        "Competitor undercut by 8% — defensive pricing triggered.",
        "Seasonal demand peak — aggressive pricing recommended.",
        "Sales velocity declining — demand stimulus pricing applied.",
    ]
    rl_docs = []
    for pid, product in zip(product_ids, PRODUCTS):
        for i in range(random.randint(3, 8)):
            action = random.choice(actions)
            change_pct = {"increase": random.uniform(2, 10), "decrease": random.uniform(-10, -2), "maintain": 0}[action]
            rec_price = round(product["current_price"] * (1 + change_pct / 100), 2)
            rl_docs.append({
                "product_id": str(pid),
                "product_name": product["name"],
                "sku": product["sku"],
                "current_price": product["current_price"],
                "recommended_price": rec_price,
                "action": action,
                "price_change_pct": round(change_pct, 2),
                "expected_profit_impact": round(random.uniform(1, 8), 2),
                "expected_revenue_impact": round(random.uniform(-3, 12), 2),
                "reasoning": random.choice(reasons),
                "confidence": round(random.uniform(0.72, 0.96), 3),
                "approved": random.random() > 0.4,
                "created_at": datetime.utcnow() - timedelta(hours=random.randint(0, 48)),
            })

    await db.rl_decisions.insert_many(rl_docs)
    print(f"  Inserted {len(rl_docs)} RL decisions.")

    if close_client:
        client.close()
    print("\n[OK] Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
