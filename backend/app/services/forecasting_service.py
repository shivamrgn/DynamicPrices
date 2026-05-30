"""Forecasting service wrapper."""

from app.services.pricing_service import refresh_all_forecasts

__all__ = ["refresh_all_forecasts"]
