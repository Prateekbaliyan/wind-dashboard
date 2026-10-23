"""
Data Manager and Cache Service.

Coordinates Elexon API requests, disk caching, demo fallback mode,
and resolution matching (hourly vs half-hourly).
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Any
import pandas as pd
from backend.app.core.config import settings
from backend.app.schemas.models import CutoffPolicyType, ForecastVersionItem
from backend.app.services.elexon_client import elexon_client
from backend.app.services.forecast_selector import match_forecasts_with_actuals

logger = logging.getLogger("wind_forecast.data_manager")
UTC_TZ = timezone.utc


class DataManager:
    def __init__(self):
        self.cache_dir = settings.CACHE_DIR
        self.demo_dir = settings.DEMO_DIR
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.demo_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, dataset: str, start_date: str, end_date: str) -> Path:
        return self.cache_dir / f"{dataset}_{start_date}_{end_date}.json"

    def _get_demo_path(self, dataset: str) -> Path:
        return self.demo_dir / f"{dataset}_demo.json"

    async def get_raw_actuals(self, start_date: str, end_date: str) -> tuple[pd.DataFrame, bool, str]:
        """
        Retrieve FUELHH wind actuals from cache, live API, or fallback demo.
        Returns: (DataFrame, is_fallback_demo, data_source)
        """
        cache_file = self._get_cache_path("fuelhh", start_date, end_date)
        
        # 1. Try local cache
        if settings.ENABLE_CACHE and cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return pd.DataFrame(data), False, "local_cache (Elexon BMRS FUELHH)"
            except Exception as e:
                logger.warning(f"Failed to read cache {cache_file}: {e}")

        # 2. Try live Elexon API
        try:
            records = await elexon_client.fetch_fuelhh_actuals(start_date, end_date)
            if records:
                if settings.ENABLE_CACHE:
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(records, f)
                return pd.DataFrame(records), False, "live_api (Elexon BMRS FUELHH)"
        except Exception as e:
            logger.error(f"Live FUELHH fetch failed: {e}")

        # 3. Fallback demo data
        demo_file = self._get_demo_path("fuelhh")
        if demo_file.exists():
            with open(demo_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return pd.DataFrame(data), True, "fallback_demo_mode"

        return pd.DataFrame(columns=["dataset", "startTime", "settlementDate", "settlementPeriod", "fuelType", "generation"]), True, "no_data"

    async def get_raw_forecasts(self, start_date: str, end_date: str) -> tuple[pd.DataFrame, bool, str]:
        """
        Retrieve WINDFOR forecasts from cache, live API, or fallback demo.
        Returns: (DataFrame, is_fallback_demo, data_source)
        """
        cache_file = self._get_cache_path("windfor", start_date, end_date)

        # 1. Try local cache
        if settings.ENABLE_CACHE and cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return pd.DataFrame(data), False, "local_cache (Elexon BMRS WINDFOR)"
            except Exception as e:
                logger.warning(f"Failed to read cache {cache_file}: {e}")

        # 2. Try live Elexon API
        try:
            records = await elexon_client.fetch_windfor_forecasts(start_date, end_date)
            if records:
                if settings.ENABLE_CACHE:
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(records, f)
                return pd.DataFrame(records), False, "live_api (Elexon BMRS WINDFOR)"
        except Exception as e:
            logger.error(f"Live WINDFOR fetch failed: {e}")

        # 3. Fallback demo data
        demo_file = self._get_demo_path("windfor")
        if demo_file.exists():
            with open(demo_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return pd.DataFrame(data), True, "fallback_demo_mode"

        return pd.DataFrame(columns=["dataset", "startTime", "publishTime", "generation"]), True, "no_data"

    async def get_processed_data(
        self,
        start_date: str,
        end_date: str,
        cutoff_policy: CutoffPolicyType = "day_ahead_1100",
        custom_cutoff: Optional[str] = None,
        resolution: str = "hourly"
    ) -> tuple[pd.DataFrame, list[ForecastVersionItem], bool, str]:
        """
        Retrieve raw data, match forecasts against actuals, and handle resolution.
        """
        act_df, act_is_demo, act_source = await self.get_raw_actuals(start_date, end_date)
        fc_df, fc_is_demo, fc_source = await self.get_raw_forecasts(start_date, end_date)

        is_demo = act_is_demo or fc_is_demo
        source_desc = f"{act_source} & {fc_source}"

        if resolution == "hourly" and not act_df.empty:
            # Aggregate half-hourly actuals to hourly blocks matching WINDFOR delivery slots
            # In GB trading, hourly block actual = average of settlement period 1 & 2, 3 & 4, etc.
            act_work = act_df.copy()
            act_work["start_dt"] = pd.to_datetime(act_work["startTime"], utc=True)
            act_work["hourly_start"] = act_work["start_dt"].dt.floor("1h")
            act_work["hourly_iso"] = act_work["hourly_start"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")

            grouped = act_work.groupby("hourly_iso").agg({
                "generation": "mean",
                "settlementDate": "first",
                "settlementPeriod": "first"
            }).reset_index()

            grouped.rename(columns={"hourly_iso": "startTime"}, inplace=True)
            grouped["generation"] = grouped["generation"].round(2)
            act_for_matching = grouped
        else:
            act_for_matching = act_df

        matched_df, all_versions = match_forecasts_with_actuals(
            actuals_df=act_for_matching,
            forecasts_df=fc_df,
            policy=cutoff_policy,
            custom_cutoff=custom_cutoff
        )

        return matched_df, all_versions, is_demo, source_desc


data_manager = DataManager()
