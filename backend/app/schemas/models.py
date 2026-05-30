from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ─── Enums ───────────────────────────────────────────────────────────────────

class ProductStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DISCONTINUED = "discontinued"

class PriceAction(str, Enum):
    INCREASE = "increase"
    DECREASE = "decrease"
    MAINTAIN = "maintain"

class ElasticityType(str, Enum):
    ELASTIC = "elastic"
    INELASTIC = "inelastic"
    UNITARY = "unitary"


# ─── Product Schemas ──────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    sku: str
    name: str
    category: str
    brand: str
    current_price: float
    cost_price: float
    min_price: float
    max_price: float
    stock_quantity: int
    status: ProductStatus = ProductStatus.ACTIVE
    tags: List[str] = []

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    current_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    status: Optional[ProductStatus] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None

class ProductResponse(ProductBase):
    id: str
    revenue_uplift: Optional[float] = None
    margin_pct: Optional[float] = None
    elasticity_type: Optional[ElasticityType] = None
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Price Schemas ────────────────────────────────────────────────────────────

class PriceHistoryEntry(BaseModel):
    product_id: str
    price: float
    ai_price: Optional[float] = None
    manual_override: bool = False
    action: Optional[PriceAction] = None
    reason: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: datetime

class PriceUpdateRequest(BaseModel):
    product_id: str
    new_price: float
    reason: Optional[str] = "Manual override"
    manual_override: bool = True


# ─── Competitor Schemas ───────────────────────────────────────────────────────

class CompetitorPrice(BaseModel):
    product_id: str
    competitor_name: str
    competitor_price: float
    our_price: float
    price_delta: float
    price_delta_pct: float
    in_stock: bool = True
    scraped_at: datetime
    url: Optional[str] = None

class CompetitorPriceResponse(CompetitorPrice):
    id: str

class CompetitorSummary(BaseModel):
    competitor_name: str
    avg_price: float
    min_price: float
    max_price: float
    products_tracked: int
    last_scraped: datetime


# ─── Forecasting Schemas ──────────────────────────────────────────────────────

class ForecastPoint(BaseModel):
    date: str
    predicted_demand: float
    lower_bound: float
    upper_bound: float
    confidence: float

class ForecastResponse(BaseModel):
    model_config = {
        "protected_namespaces": ()
    }
    
    product_id: str
    product_name: str
    model_used: str
    accuracy_score: float
    forecast_horizon_days: int
    forecasts: List[ForecastPoint]
    seasonal_factors: Dict[str, float]
    created_at: datetime


# ─── Elasticity Schemas ───────────────────────────────────────────────────────

class ElasticityAnalysis(BaseModel):
    product_id: str
    product_name: str
    elasticity_coefficient: float
    elasticity_type: ElasticityType
    price_sensitivity: str  # "High", "Medium", "Low"
    optimal_price_range: Dict[str, float]
    revenue_impact_pct: float
    confidence: float
    scatter_data: List[Dict[str, float]]
    created_at: datetime


# ─── RL Engine Schemas ────────────────────────────────────────────────────────

class RLState(BaseModel):
    inventory_level: float  # 0-1 normalized
    demand_score: float     # 0-1 normalized
    competitor_price_ratio: float  # our_price / competitor_price
    sales_velocity: float   # units/day

class RLDecision(BaseModel):
    product_id: str
    product_name: str
    current_price: float
    recommended_price: float
    action: PriceAction
    price_change_pct: float
    expected_profit_impact: float
    expected_revenue_impact: float
    reasoning: str
    confidence: float
    state: RLState
    approved: bool = False
    created_at: datetime

class RLApprovalRequest(BaseModel):
    decision_id: str
    approved: bool
    override_price: Optional[float] = None


# ─── Inventory Schemas ────────────────────────────────────────────────────────

class InventoryAlert(BaseModel):
    product_id: str
    product_name: str
    sku: str
    current_stock: int
    reorder_point: int
    days_of_stock: float
    alert_level: str  # "critical", "warning", "ok"
    recommended_action: str
    ai_price_recommendation: Optional[float] = None

class InventoryResponse(BaseModel):
    total_products: int
    critical_alerts: int
    warning_alerts: int
    healthy_stock: int
    alerts: List[InventoryAlert]


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class KPIMetrics(BaseModel):
    revenue_uplift_pct: float
    forecast_accuracy_pct: float
    avg_margin_pct: float
    active_competitors: int
    total_products: int
    ai_decisions_today: int
    storage_savings_usd: float

class RevenueDataPoint(BaseModel):
    date: str
    baseline_revenue: float
    ai_revenue: float
    uplift: float

class LiveDecision(BaseModel):
    timestamp: str
    product_name: str
    action: PriceAction
    change_pct: float
    reason: str
    new_price: float

class DashboardResponse(BaseModel):
    kpis: KPIMetrics
    revenue_chart: List[RevenueDataPoint]
    live_decisions: List[LiveDecision]
    top_performers: List[Dict[str, Any]]
    system_status: Dict[str, str]


# ─── Simulator Schemas ────────────────────────────────────────────────────────

class SimulatorInput(BaseModel):
    product_id: str
    competitor_price: float
    inventory_level: int
    demand_multiplier: float = Field(1.0, ge=0.1, le=5.0)

class SimulatorResult(BaseModel):
    recommended_price: float
    expected_margin: float
    expected_revenue_impact: float
    action: PriceAction
    reasoning: str
    confidence: float
