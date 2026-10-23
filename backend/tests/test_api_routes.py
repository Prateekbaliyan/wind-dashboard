"""
API Integration tests for FastAPI endpoints.
"""

from fastapi.testclient import TestClient
import pytest
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "UK Wind Forecast Accuracy" in data["name"]
    assert data["target_period"] == "January 2026"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "January 2026" in data["supported_period"]


def test_export_csv_headers():
    response = client.get("/api/export.csv?start_date=2026-01-01&end_date=2026-01-01&cutoff_policy=day_ahead_1100")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in response.headers.get("content-disposition", "")
    content = response.text
    assert "# UK Wind Forecast Accuracy Export" in content
    assert "startTime_utc" in content
    assert "actual_generation_mw" in content
