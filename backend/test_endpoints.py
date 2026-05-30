import httpx
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(client, method, path, json_data=None):
    url = f"{BASE_URL}{path}"
    print(f"Testing {method} {path} ... ", end="")
    try:
        if method == "GET":
            response = client.get(url, timeout=10.0)
        elif method == "POST":
            response = client.post(url, json=json_data, timeout=10.0)
        elif method == "PATCH":
            response = client.patch(url, json=json_data, timeout=10.0)
        
        status = response.status_code
        if status in [200, 201]:
            print(f"\033[92mPASSED\033[0m ({status})")
            return response.json()
        else:
            print(f"\033[91mFAILED\033[0m ({status})")
            print(f"   Error Response: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"\033[91mCRASHED\033[0m ({type(e).__name__}: {str(e)})")
        return None

def run_tests():
    print(f"Starting API Endpoint Verification Tests on {BASE_URL}\n")
    
    with httpx.Client() as client:
        # 1. Health check
        test_endpoint(client, "GET", "/api/health")
        
        # 2. Dashboard overview
        test_endpoint(client, "GET", "/api/dashboard/overview")
        
        # 3. Dashboard live feed
        test_endpoint(client, "GET", "/api/dashboard/live-feed")
        
        # 4. Products list
        products_res = test_endpoint(client, "GET", "/api/products/")
        
        # 5. Competitor pricing matrix
        test_endpoint(client, "GET", "/api/competitors/matrix")
        
        # 6. Competitor pricing summary
        test_endpoint(client, "GET", "/api/competitors/summary")
        
        # 7. Inventory alerts
        test_endpoint(client, "GET", "/api/inventory/alerts")
        
        # 8. Inventory summary
        test_endpoint(client, "GET", "/api/inventory/summary")
        
        # 9. RL Decisions pending
        rl_res = test_endpoint(client, "GET", "/api/rl/decisions")
        
        # 10. Elasticity all
        test_endpoint(client, "GET", "/api/elasticity/all")
        
        # 11. Forecasting all
        test_endpoint(client, "GET", "/api/forecasting/all")
        
        # Test specific product endpoints
        if products_res and "products" in products_res and len(products_res["products"]) > 0:
            product = products_res["products"][0]
            pid = product["id"]
            sku = product["sku"]
            print(f"\nRunning detailed tests for Product ID: {pid} (SKU: {sku})")
            
            # 12. Single product get
            test_endpoint(client, "GET", f"/api/products/{pid}")
            
            # 13. Single product forecasting
            test_endpoint(client, "GET", f"/api/forecasting/product/{pid}")
            
            # 14. Single product elasticity
            test_endpoint(client, "GET", f"/api/elasticity/product/{pid}")
            
            # 15. Single product price history
            test_endpoint(client, "GET", f"/api/prices/history/{pid}")
            
            # 16. Single competitor history
            test_endpoint(client, "GET", f"/api/competitors/history/{pid}")
            
            # 17. Generate decision for single product
            test_endpoint(client, "POST", f"/api/rl/generate/{pid}")
            
            # 18. Simulate pricing sandbox
            sim_data = {
                "product_id": pid,
                "competitor_price": product["current_price"] * 0.98,
                "inventory_level": 15,
                "demand_multiplier": 2.5
            }
            test_endpoint(client, "POST", "/api/rl/simulate", json_data=sim_data)
        else:
            print("\033[91mWarning: No products found. Skipping product-specific tests.\033[0m")

        # Test decision approvals
        if rl_res and len(rl_res) > 0:
            decision = rl_res[0]
            did = decision["id"]
            print(f"\nTesting Decision Approval for Decision ID: {did}")
            # 19. Approve decision
            test_endpoint(client, "POST", f"/api/rl/approve/{did}", json_data={"override_price": None})
        else:
            print("\033[91mWarning: No pending RL decisions found. Skipping approval test.\033[0m")

        # Test pricing override update
        if products_res and "products" in products_res and len(products_res["products"]) > 0:
            pid = products_res["products"][0]["id"]
            print("\nTesting Price Update Post:")
            post_data = {
                "product_id": pid,
                "new_price": 54000.0,
                "reason": "Test manual override"
            }
            test_endpoint(client, "POST", "/api/prices/update", json_data=post_data)
            
            # 20. Manual Scraper Trigger
            print("\nTesting Manual Scraper Trigger Post:")
            test_endpoint(client, "POST", "/api/competitors/scrape")

            # 21. Manual Competitor Price Addition
            print("\nTesting Manual Competitor Price Addition Post:")
            add_comp_data = {
                "product_id": pid,
                "competitor_name": "amazon",
                "competitor_price": product["current_price"] * 0.95,
                "in_stock": True
            }
            test_endpoint(client, "POST", "/api/competitors/add", json_data=add_comp_data)
            
        print("\nAll tests completed!")

if __name__ == "__main__":
    run_tests()
