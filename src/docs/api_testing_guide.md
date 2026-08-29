# 🧪 KrishiCare API End-to-End Testing Guide (P1 & P2)

This guide documents the API test suite maintained by **P5** for verifying integration between **P1 (ML Model API)** and **P2 (Backend / Weather / Hotspots API)**.

---

## 📌 P1: ML Disease Inference API Test Matrix

| Endpoint | Method | Input / Payload | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/predict` | `POST` | `multipart/form-data` with leaf image | JSON with `disease_name`, `confidence`, `remedy` | 🟡 Ready for E2E |
| `/api/v1/health` | `GET` | None | `{"status": "ok", "model_version": "v1.0"}` | 🟢 Verified |

### Sample cURL Command for P1 Predict API:
```bash
curl -X POST "http://localhost:5000/api/v1/predict" \
  -H "Authorization: Bearer krishi_ml_secret_key_2026" \
  -F "image=@public/images/sample_leaves/rice_blast.jpg" \
  -F "crop_type=Rice"
```

#### Expected JSON Response:
```json
{
  "status": "success",
  "data": {
    "disease": "Rice Blast (Magnaporthe oryzae)",
    "confidence": 0.964,
    "severity": "High",
    "treatment": "Apply Tricyclazole 75% WP at 0.6g/L of water.",
    "fertilizer_recommendation": "Reduce urea; apply potash (MOP)."
  }
}
```

---

## 📌 P2: Backend & Weather / Hotspots API Test Matrix

| Endpoint | Method | Query / Payload | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/farmers` | `GET` | None | Array of 3 farmer profiles | 🟢 Verified (Seed) |
| `/api/v1/diagnoses` | `GET` | `?farmerId=farmer_001` | Array of diagnoses for Ramesh Kumar | 🟢 Verified (Seed) |
| `/api/v1/hotspots` | `GET` | `?lat=29.68&lng=76.99` | Regional alert hotspots within radius | 🟢 Verified (Seed) |
| `/api/v1/weather` | `GET` | `?lat=19.9975&lng=73.7898` | Temperature, humidity, disease risk index | 🟡 Pending P2 deploy |

### Sample cURL Command for P2 Hotspots API:
```bash
curl -X GET "http://localhost:3000/api/v1/hotspots?lat=29.6857&lng=76.9905&radiusKm=50" \
  -H "Accept: application/json"
```

#### Expected JSON Response:
```json
{
  "status": "success",
  "count": 1,
  "data": [
    {
      "id": "hotspot_001",
      "regionName": "Karnal Rice Belt",
      "diseaseType": "Rice Blast Outbreak",
      "severity": "Critical",
      "affectedRadiusKm": 35.0
    }
  ]
}
```

---

## 🛠 Setup & Debug Checklist for P3/P4

When helping P3 (Frontend Web/Mobile) and P4 (Alerts & Geospatial UI) set up their environments:

1. **Environment Variables**: Ensure `.env` is copied from `.env.example` in root.
2. **Seed Execution**: Run `python3 src/db/seed.py` to confirm mock JSON data is accessible.
3. **CORS Headers**: Verify backend server enables `Access-Control-Allow-Origin: *` for dev port `3000`/`5173`.
4. **Static Assets**: Verify images can be fetched from `http://localhost:3000/images/sample_leaves/<image_name>.jpg`.
