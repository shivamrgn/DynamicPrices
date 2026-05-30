db = db.getSiblingDB('dynamic_pricing');

db.createCollection('products');
db.createCollection('price_history');
db.createCollection('sales_history');
db.createCollection('competitor_prices');
db.createCollection('forecasts');
db.createCollection('rl_decisions');
db.createCollection('elasticity_cache');

print('MongoDB collections created.');
