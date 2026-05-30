"""
Price Elasticity Engine: Log-log regression to measure demand sensitivity.
Classifies products as Elastic / Inelastic / Unitary for pricing strategy.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from loguru import logger


class ElasticityEngine:
    """
    Computes price elasticity of demand using log-log OLS regression.
    
    log(Q) = α + β * log(P) + ε
    Where β = price elasticity coefficient.
    
    β < -1  → Elastic   (consumers are price-sensitive)
    -1 < β < 0 → Inelastic (consumers are price-insensitive)
    β ≈ -1  → Unitary
    """

    def __init__(self):
        self.model = LinearRegression()
        self.scaler = StandardScaler()
        self.is_fitted = False

    def compute_elasticity(
        self, price_demand_pairs: List[Dict]
    ) -> Tuple[float, float, str]:
        """
        Fit log-log model and return (elasticity_coeff, r_squared, classification).
        
        price_demand_pairs: [{"price": float, "units_sold": int, "date": str}]
        """
        if len(price_demand_pairs) < 7:
            logger.warning("Insufficient price-demand pairs for elasticity. Using prior.")
            return self._default_elasticity()

        try:
            df = pd.DataFrame(price_demand_pairs)
            df = df[df["units_sold"] > 0].dropna()
            df = df[df["price"] > 0]

            if len(df) < 5:
                return self._default_elasticity()

            # Log transformation
            log_price = np.log(df["price"].values).reshape(-1, 1)
            log_demand = np.log(df["units_sold"].values)

            self.model.fit(log_price, log_demand)
            r_squared = self.model.score(log_price, log_demand)
            elasticity = float(self.model.coef_[0])

            # Classify
            if elasticity < -1.1:
                classification = "elastic"
            elif elasticity > -0.9:
                classification = "inelastic"
            else:
                classification = "unitary"

            self.is_fitted = True
            logger.info(f"Elasticity computed: β={elasticity:.3f}, R²={r_squared:.3f}")
            return round(elasticity, 4), round(r_squared, 4), classification

        except Exception as e:
            logger.error(f"Elasticity computation error: {e}")
            return self._default_elasticity()

    def _default_elasticity(self) -> Tuple[float, float, str]:
        """Conservative default for new products."""
        return -1.2, 0.60, "elastic"

    def get_optimal_price_range(
        self,
        current_price: float,
        elasticity: float,
        cost_price: float,
        min_price: float,
        max_price: float,
    ) -> Dict[str, float]:
        """
        Use elasticity to compute revenue-maximizing price range.
        Revenue max where MR = 0 → P_opt = P * (1 + 1/elasticity)
        """
        if elasticity < -0.01:
            # Dorfman-Steiner optimal markup
            markup = -1 / elasticity
            optimal_price = cost_price * (1 + markup)
            optimal_price = max(min_price, min(max_price, optimal_price))
        else:
            optimal_price = current_price

        # Safe range: ±15% around optimal
        return {
            "optimal": round(optimal_price, 2),
            "lower_bound": round(max(min_price, optimal_price * 0.85), 2),
            "upper_bound": round(min(max_price, optimal_price * 1.15), 2),
        }

    def generate_scatter_data(
        self,
        price_demand_pairs: List[Dict],
        elasticity: float,
        current_price: float,
    ) -> List[Dict]:
        """Generate scatter data for the elasticity curve visualization."""
        if not price_demand_pairs:
            # Synthetic curve
            prices = np.linspace(current_price * 0.7, current_price * 1.3, 20)
            base_demand = 50
            return [
                {
                    "price": round(float(p), 2),
                    "demand": round(float(base_demand * (p / current_price) ** elasticity), 2),
                }
                for p in prices
            ]

        return [
            {
                "price": round(float(row["price"]), 2),
                "demand": round(float(row["units_sold"]), 2),
            }
            for row in price_demand_pairs[-30:]  # last 30 data points
        ]

    def compute_revenue_impact(
        self,
        current_price: float,
        target_price: float,
        current_demand: float,
        elasticity: float,
    ) -> float:
        """Estimate revenue impact of price change."""
        price_change_pct = (target_price - current_price) / current_price
        demand_change_pct = elasticity * price_change_pct
        new_demand = current_demand * (1 + demand_change_pct)

        current_revenue = current_price * current_demand
        new_revenue = target_price * new_demand

        return round((new_revenue - current_revenue) / current_revenue * 100, 2)

    def get_sensitivity_label(self, elasticity: float) -> str:
        """Human-readable sensitivity label."""
        abs_e = abs(elasticity)
        if abs_e > 2.0:
            return "Very High"
        elif abs_e > 1.5:
            return "High"
        elif abs_e > 1.0:
            return "Moderate"
        elif abs_e > 0.5:
            return "Low"
        else:
            return "Very Low"
