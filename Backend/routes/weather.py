"""
routes/weather.py — GET /api/weather/risk, GET /api/alerts/nearby, GET /api/hotspots

Owner: P2

Three endpoints live here because they're all "location in, farm-relevant
data out" — feel free to split into separate files later if the team
prefers, the router objects don't care.

GET /api/weather/risk?lat=&lon=&crop=
    Day 1: mock-able risk score from OpenWeatherMap current + forecast data.
    Day 2: real OpenWeatherMap call, in-memory 5-min TTL cache so a judge
           mashing refresh doesn't burn API quota or hit rate limits.
    Day 3: if OpenWeatherMap is down/unauthorized/rate-limited, falls back
           to realistic mock weather so the risk card never breaks.

GET /api/alerts/nearby?lat=&lon=&radius=
    Day 1 deliverable — "returns mock nearby farms that were alerted".
    Queries the real Alert/Farm tables P1 built; if there's no seed data
    yet (e.g. you're testing before P5's seed script has run), it returns
    a small clearly-labeled mock payload instead of an empty list, so the
    farmer UI's "X nearby farms alerted" toast has something to show.

GET /api/hotspots
    Day 2 deliverable for the admin map (P4 consumes this directly).
    One marker per farm (its most recent non-healthy diagnosis). Falls
    back to 8 mock Maharashtra points if the DB has no diagnoses yet.

Env var used: OPENWEATHER_API_KEY (put it in Backend/.env)
"""
import logging
import os
import time
from math import asin, cos, radians, sin, sqrt
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models import Alert, Diagnosis, Farm, get_db

logger = logging.getLogger("krishicare.weather")
router = APIRouter(prefix="/api", tags=["weather"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5"
EARTH_RADIUS_KM = 6371.0

# ---- Day 2: simple in-memory cache, 5 minute TTL, keyed by rounded lat/lon ----
_weather_cache: dict[tuple, dict] = {}
CACHE_TTL_SECONDS = 5 * 60


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))


def _cache_key(lat: float, lon: float) -> tuple:
    return (round(lat, 2), round(lon, 2))


def _mock_weather() -> dict:
    """Day 3 fallback: realistic-looking weather so the risk endpoint
    never breaks if OpenWeatherMap is unreachable at the venue."""
    return {
        "current": {"main": {"temp": 27.5, "humidity": 78}, "weather": [{"main": "Clouds", "description": "scattered clouds"}]},
        "forecast": {"list": [{"pop": 0.4, "main": {"temp": 26.0, "humidity": 80}} for _ in range(8)]},
    }


async def _fetch_weather(lat: float, lon: float) -> tuple[dict, bool, bool]:
    """Returns (weather_data, from_cache, used_mock)."""
    key = _cache_key(lat, lon)
    now = time.time()
    cached = _weather_cache.get(key)
    if cached and (now - cached["ts"]) < CACHE_TTL_SECONDS:
        return cached["data"], True, cached["used_mock"]

    if not OPENWEATHER_API_KEY:
        logger.warning("OPENWEATHER_API_KEY not set — serving mock weather.")
        data = _mock_weather()
        _weather_cache[key] = {"ts": now, "data": data, "used_mock": True}
        return data, False, True

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            current_resp = await client.get(
                f"{OPENWEATHER_BASE}/weather",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric"},
            )
            current_resp.raise_for_status()
            forecast_resp = await client.get(
                f"{OPENWEATHER_BASE}/forecast",
                params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "metric", "cnt": 8},
            )
            forecast_resp.raise_for_status()
        data = {"current": current_resp.json(), "forecast": forecast_resp.json()}
        _weather_cache[key] = {"ts": now, "data": data, "used_mock": False}
        return data, False, False
    except Exception:
        logger.exception("OpenWeatherMap call failed for lat=%s lon=%s — falling back to mock", lat, lon)
        data = _mock_weather()
        _weather_cache[key] = {"ts": now, "data": data, "used_mock": True}
        return data, False, True


def _compute_risk(weather_data: dict, crop: Optional[str]) -> tuple[str, list[str], dict]:
    current = weather_data["current"]
    humidity = current["main"]["humidity"]
    temp = current["main"]["temp"]
    forecast_list = weather_data.get("forecast", {}).get("list", [])
    avg_rain_prob = (sum(item.get("pop", 0) for item in forecast_list) / len(forecast_list)) if forecast_list else 0.0

    score = 0
    reasons = []

    if humidity >= 85:
        score += 3
        reasons.append(f"Very high humidity ({humidity}%) strongly favors fungal disease spread")
    elif humidity >= 70:
        score += 2
        reasons.append(f"High humidity ({humidity}%) increases disease risk")
    elif humidity >= 50:
        score += 1

    if 20 <= temp <= 30:
        score += 2
        reasons.append(f"Current temperature ({temp}°C) is in the range many crop pathogens thrive in")
    elif 15 <= temp < 35:
        score += 1

    if avg_rain_prob >= 0.6:
        score += 3
        reasons.append(f"High chance of rain in the next ~24h ({round(avg_rain_prob * 100)}%) raises spread risk")
    elif avg_rain_prob >= 0.3:
        score += 1
        reasons.append(f"Moderate rain chance in the next ~24h ({round(avg_rain_prob * 100)}%)")

    if crop:
        reasons.append(f"Risk calculated for {crop}")

    if score >= 7:
        level = "Critical"
    elif score >= 5:
        level = "High"
    elif score >= 3:
        level = "Medium"
    else:
        level = "Low"

    breakdown = {
        "temperature_c": temp,
        "humidity_pct": humidity,
        "rain_probability_pct": round(avg_rain_prob * 100, 1),
    }
    return level, reasons, breakdown


@router.get("/weather/risk")
async def weather_risk(
    lat: float = Query(...),
    lon: float = Query(...),
    crop: Optional[str] = Query(None),
):
    weather_data, from_cache, used_mock = await _fetch_weather(lat, lon)
    level, reasons, breakdown = _compute_risk(weather_data, crop)
    return {
        "risk_level": level,
        "crop": crop,
        "weather": breakdown,
        "reasons": reasons,
        "from_cache": from_cache,
        "data_source": "mock" if used_mock else "openweathermap",
    }


def _mock_nearby_alerts() -> dict:
    return {
        "count": 3,
        "farms": [
            {"farm_id": None, "farmer_name": "Demo Farm A", "distance_km": 1.2, "message": "Rice Blast detected 1.2 km away — check your crop for similar symptoms."},
            {"farm_id": None, "farmer_name": "Demo Farm B", "distance_km": 2.8, "message": "Rice Blast detected 2.8 km away — check your crop for similar symptoms."},
            {"farm_id": None, "farmer_name": "Demo Farm C", "distance_km": 4.1, "message": "Rice Blast detected 4.1 km away — check your crop for similar symptoms."},
        ],
        "note": "mock data — no real alerts found in this radius yet (seed the DB or trigger a real alert)",
    }


@router.get("/alerts/nearby")
def alerts_nearby(
    lat: float = Query(...),
    lon: float = Query(...),
    radius: float = Query(5.0),
    db: Session = Depends(get_db),
):
    farms = db.query(Farm).all()
    nearby_farm_ids = {f.id for f in farms if haversine_km(lat, lon, f.latitude, f.longitude) <= radius}

    if not nearby_farm_ids:
        return _mock_nearby_alerts()

    alerts = (
        db.query(Alert)
        .filter(Alert.target_farm_id.in_(nearby_farm_ids))
        .order_by(Alert.created_at.desc())
        .limit(20)
        .all()
    )

    if not alerts:
        return _mock_nearby_alerts()

    farms_by_id = {f.id: f for f in farms}
    result = []
    for a in alerts:
        farm = farms_by_id.get(a.target_farm_id)
        dist = haversine_km(lat, lon, farm.latitude, farm.longitude) if farm else None
        result.append({
            "farm_id": a.target_farm_id,
            "farmer_name": farm.farmer_name if farm else None,
            "distance_km": round(dist, 2) if dist is not None else None,
            "message": a.message,
            "created_at": a.created_at,
        })
    return {"count": len(result), "farms": result}


def _mock_hotspots() -> list[dict]:
    """8 realistic Maharashtra points so the admin map has data to render
    before P5's seed script has run."""
    base = [
        (19.99, 73.78, "Nashik"), (18.52, 73.85, "Pune"), (21.15, 79.09, "Nagpur"),
        (19.87, 75.34, "Aurangabad"), (16.70, 74.24, "Kolhapur"), (20.93, 77.75, "Amravati"),
        (17.68, 75.90, "Solapur"), (19.29, 76.75, "Jalna"),
    ]
    diseases = ["Rice Blast", "Tomato Late Blight", "Powdery Mildew", "Bacterial Blight"]
    severities = ["Low", "Medium", "High", "Critical"]
    return [
        {
            "farm_id": None,
            "farmer_name": f"Demo Farm {i + 1}",
            "latitude": lat,
            "longitude": lon,
            "disease": diseases[i % len(diseases)],
            "crop": None,
            "severity": severities[i % len(severities)],
            "reported_at": None,
            "district": district,
        }
        for i, (lat, lon, district) in enumerate(base)
    ]


@router.get("/hotspots")
def hotspots(limit: int = 50, db: Session = Depends(get_db)):
    rows = (
        db.query(Diagnosis, Farm)
        .join(Farm, Diagnosis.farm_id == Farm.id)
        .filter(Diagnosis.disease_label != "Healthy")
        .order_by(Diagnosis.created_at.desc())
        .limit(limit)
        .all()
    )

    seen_farms = set()
    points = []
    for diag, farm in rows:
        if farm.id in seen_farms:
            continue  # one marker per farm — most recent diagnosis wins
        seen_farms.add(farm.id)
        points.append({
            "farm_id": farm.id,
            "farmer_name": farm.farmer_name,
            "latitude": diag.latitude or farm.latitude,
            "longitude": diag.longitude or farm.longitude,
            "disease": diag.disease_label,
            "type": getattr(diag, "diagnosis_type", "disease") or "disease",
            "name": diag.disease_label,
            "crop": diag.crop,
            "severity": diag.severity,
            "reported_at": diag.created_at,
            "district": farm.district,
        })

    if not points:
        points = _mock_hotspots()

    return {"count": len(points), "hotspots": points}
