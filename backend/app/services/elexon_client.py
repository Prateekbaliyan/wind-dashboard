"""
Elexon BMRS API Client for FUELHH and WINDFOR Datasets.

Fetches:
- Actual national wind generation from FUELHH (fuelType == 'WIND')
- Forecast national wind generation from WINDFOR (startTime, publishTime, generation)
"""

import asyncio
from datetime import datetime, date, timedelta, timezone
from typing import Any
import httpx
from backend.app.core.config import settings

UTC_TZ = timezone.utc


class ElexonClient:
    def __init__(self):
        self.base_url = settings.ELEXON_BASE_URL
        self.fuelhh_url = settings.FUELHH_ENDPOINT
        self.windfor_url = settings.WINDFOR_ENDPOINT
        self.timeout = settings.API_TIMEOUT_SECONDS
        self.max_retries = settings.MAX_RETRIES

    async def _fetch_with_retry(self, client: httpx.AsyncClient, url: str, params: dict[str, str]) -> list[dict[str, Any]]:
        """Execute HTTP GET request with retries and exponential backoff."""
        headers = {
            "Accept": "application/json",
            "User-Agent": "UKWindForecastAccuracyDashboard/1.0"
        }
        for attempt in range(1, self.max_retries + 1):
            try:
                response = await client.get(url, params=params, headers=headers, timeout=self.timeout)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        return data
                    if isinstance(data, dict) and "data" in data:
                        return data["data"]
                    return []
                elif response.status_code == 429:
                    # Rate limited: wait before retry
                    await asyncio.sleep(2.0 * attempt)
                else:
                    response.raise_for_status()
            except (httpx.RequestError, httpx.HTTPStatusError) as exc:
                if attempt == self.max_retries:
                    raise exc
                await asyncio.sleep(1.0 * attempt)
        return []

    async def fetch_fuelhh_actuals(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        """
        Fetch FUELHH actual generation for settlement dates [start_date, end_date].
        Filters strictly for fuelType == 'WIND'.
        """
        params = {
            "settlementDateFrom": start_date,
            "settlementDateTo": end_date
        }
        async with httpx.AsyncClient() as client:
            records = await self._fetch_with_retry(client, self.fuelhh_url, params)
        
        # Filter for national wind generation only
        wind_records = []
        for r in records:
            if r.get("fuelType") == "WIND":
                wind_records.append({
                    "dataset": "FUELHH",
                    "startTime": r.get("startTime"),
                    "publishTime": r.get("publishTime"),
                    "settlementDate": r.get("settlementDate"),
                    "settlementPeriod": r.get("settlementPeriod"),
                    "fuelType": "WIND",
                    "generation": r.get("generation", 0)
                })
        return wind_records

    async def fetch_windfor_forecasts(self, start_date: str, end_date: str) -> list[dict[str, Any]]:
        """
        Fetch WINDFOR wind forecasts published for delivery in [start_date, end_date].
        
        Because day-ahead and multi-day forecasts for a delivery date are published
        in advance (e.g. up to 3 days prior) as well as up to the delivery hour,
        we query publishDateTimeFrom = start_date - 3 days to end_date + 1 day.
        Queries are performed in 7-day chunks to prevent payload timeouts.
        """
        start_dt = datetime.fromisoformat(start_date).replace(tzinfo=UTC_TZ)
        end_dt = datetime.fromisoformat(end_date).replace(tzinfo=UTC_TZ) + timedelta(days=1)

        # Broaden publication search window to capture all prior day-ahead forecast runs
        query_start = start_dt - timedelta(days=4)
        query_end = end_dt + timedelta(hours=6)

        chunk_size = timedelta(days=7)
        chunks = []
        curr = query_start
        while curr < query_end:
            nxt = min(curr + chunk_size, query_end)
            chunks.append((curr.strftime("%Y-%m-%dT%H:%M:%SZ"), nxt.strftime("%Y-%m-%dT%H:%M:%SZ")))
            curr = nxt

        all_forecasts: list[dict[str, Any]] = []
        async with httpx.AsyncClient() as client:
            for pub_from, pub_to in chunks:
                params = {
                    "publishDateTimeFrom": pub_from,
                    "publishDateTimeTo": pub_to
                }
                records = await self._fetch_with_retry(client, self.windfor_url, params)
                for r in records:
                    st = r.get("startTime")
                    # Retain forecasts targeting delivery in our target delivery window
                    if st:
                        st_date = st[:10]
                        if start_date <= st_date <= end_date:
                            all_forecasts.append({
                                "dataset": "WINDFOR",
                                "startTime": r.get("startTime"),
                                "publishTime": r.get("publishTime"),
                                "generation": r.get("generation", 0)
                            })
        return all_forecasts


elexon_client = ElexonClient()
