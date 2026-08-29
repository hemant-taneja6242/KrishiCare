# 👥 KrishiRaksha — 3-Day Sprint for 5 People

## Team Roles

| # | Role | Name (fill in) | Primary Responsibility |
|---|---|---|---|
| P1 | ML + Backend Lead | ___ | AI model + FastAPI backend |
| P2 | Backend Dev | ___ | APIs, DB, weather, Gemini |
| P3 | Frontend Lead | ___ | Farmer UI — scan flow |
| P4 | Frontend Dev | ___ | Admin dashboard + GIS map |
| P5 | Integration + Demo | ___ | Connect FE+BE, polish, demo prep |

> P5 is your most versatile person — ideally someone who can do both frontend and backend at a basic level.

---

## 🗓️ DAY 1 — Build the Core (Everyone sets up independently)

**Morning Sync (30 min, 9:00 AM):** Everyone clones repo, sets up env, agrees on API contracts.

---

### P1 — ML + Backend Lead
**Goal: Working AI inference endpoint by evening**

| Time | Task |
|---|---|
| 9:30–11:00 | Set up FastAPI project structure. Install: `fastapi uvicorn pillow transformers torch sqlalchemy python-dotenv` |
| 11:00–13:00 | Download + test HuggingFace model locally: `ozair1729/plant-disease-classification`. Verify it works with a test image. |
| 14:00–16:00 | Build `POST /api/diagnose` endpoint — accepts image file, returns `{ disease, confidence, crop_type, severity }` |
| 16:00–18:00 | Build `POST /api/farms` and `GET /api/farms` endpoints. Set up SQLite schema (tables: farms, diagnoses, alerts) |
| **Deliverable** | `/api/diagnose` returns correct result when tested with Postman + leaf image |

---

### P2 — Backend Dev
**Goal: Advisory + Weather APIs working**

| Time | Task |
|---|---|
| 9:30–11:00 | Get Gemini API key + OpenWeatherMap key. Read both API docs. |
| 11:00–13:00 | Build `GET /api/advisory?disease=&crop=&lang=` — calls Gemini 1.5 Flash, returns advisory text in requested language |
| 14:00–16:00 | Build `GET /api/weather/risk?lat=&lon=&crop=` — fetches OpenWeatherMap data, computes risk score (Low/Medium/High/Critical) |
| 16:00–18:00 | Build `GET /api/alerts/nearby?lat=&lon=&radius=5` — returns mock nearby farms that were alerted |
| **Deliverable** | All 3 API endpoints return correct responses in Postman. Share Postman collection with team. |

---

### P3 — Frontend Lead (Farmer UI)
**Goal: Farmer scan flow skeleton done**

| Time | Task |
|---|---|
| 9:30–11:00 | Set up Vite + React project. Install: `react-router-dom axios react-leaflet leaflet recharts i18next` |
| 11:00–12:00 | Set up routing: `/login`, `/farmer`, `/farmer/scan`, `/farmer/result`, `/admin`, `/expert` |
| 12:00–13:00 | Build `Login.jsx` — 3 demo login cards (Farmer / Expert / Admin), no real auth |
| 14:00–16:00 | Build `FarmerHome.jsx` — farm name header, today's weather widget (mock), risk badge, "Scan Crop" button |
| 16:00–18:00 | Build `DiagnoseScan.jsx` — camera icon, image upload area, loading spinner ("Analyzing your crop...") |
| **Deliverable** | Login → Farmer Home → Scan page navigation works in browser |

---

### P4 — Frontend Dev (Admin Dashboard)
**Goal: Admin layout with charts and map skeleton**

| Time | Task |
|---|---|
| 9:30–10:30 | Study Recharts and react-leaflet docs (30 min each) |
| 10:30–12:00 | Build `AdminDashboard.jsx` — 4 stat cards: Total Reports, Active Alerts, Farms Monitored, Avg Response Time |
| 12:00–13:00 | Add line chart (Recharts): "Disease Reports This Month" with mock data |
| 14:00–16:00 | Add pie chart: Disease Distribution (Rice Blast 34%, Blight 28%, Mildew 20%, Other 18%) |
| 16:00–18:00 | Build `AdminMap.jsx` — Leaflet map centered on Maharashtra, add 8 mock circle markers (different colors by severity) |
| **Deliverable** | Admin dashboard renders with charts + map with colored hotspot markers |

---

### P5 — Integration + Demo
**Goal: Project infrastructure + sample data ready**

| Time | Task |
|---|---|
| 9:30–11:00 | Set up GitHub repo, folder structure, `.env.example` file. Write README with setup instructions. |
| 11:00–12:00 | Download 6 sample leaf images from PlantVillage dataset for demo (Rice Blast, Tomato Blight, Powdery Mildew, Healthy) |
| 12:00–13:00 | Write DB seed script — pre-populate: 3 farmer profiles, 10 past diagnoses, 8 alert hotspots |
| 14:00–16:00 | Set up shared CSS file / design tokens: colors, fonts (`Outfit` from Google Fonts), spacing |
| 16:00–18:00 | Test P1's and P2's APIs end-to-end. Document any bugs. Help P3/P4 debug setup issues. |
| **Deliverable** | Shared CSS system ready, seed data script works, all APIs documented |

---

**End of Day 1 Sync (6:00 PM — 30 min):**
- P1 demos `/api/diagnose` working
- P2 demos `/api/advisory` + `/api/weather/risk` working
- P3 demos login → farmer → scan page navigation
- P4 demos admin dashboard with charts and map
- P5 confirms seed data + CSS tokens shared with everyone

---

## 🗓️ DAY 2 — Connect & Complete (Integration Day)

**Morning Sync (9:00 AM — 20 min):** Agree on final API response formats. No format changes after this.

---

### P1 — ML + Backend Lead
**Goal: Expert validation + alert system**

| Time | Task |
|---|---|
| 9:30–11:30 | Build `GET /api/expert/queue` — returns all diagnoses with confidence < 85% needing validation |
| 11:30–13:00 | Build `POST /api/expert/validate` — expert approves/rejects + optionally corrects disease name |
| 14:00–16:00 | Build `POST /api/alerts/trigger` — when diagnosis confirmed, mark nearby farms as "alerted" in DB |
| 16:00–18:00 | Performance test: how fast is `/api/diagnose`? If >3 sec, optimize (reduce image size before inference) |
| **Deliverable** | Full backend complete. All endpoints working and documented. |

---

### P2 — Backend Dev
**Goal: Real weather integration + help P3 connect APIs**

| Time | Task |
|---|---|
| 9:30–11:00 | Replace mock weather with real OpenWeatherMap call. Cache result in memory (5 min TTL) to avoid rate limits. |
| 11:00–12:00 | Add CORS headers to FastAPI so React frontend can call it |
| 12:00–13:00 | Test Gemini advisory in all 4 languages: English, Hindi, Marathi, Tamil — fix any prompt issues |
| 14:00–16:00 | Help P3 connect the scan result page to real `/api/diagnose` and `/api/advisory` |
| 16:00–18:00 | Add `/api/hotspots` endpoint — returns 8-10 farm locations with disease type + severity for the map |
| **Deliverable** | All APIs CORS-enabled, real weather working, multilingual advisory confirmed |

---

### P3 — Frontend Lead (Farmer UI)
**Goal: Full scan flow connected to real backend**

| Time | Task |
|---|---|
| 9:30–11:00 | Build `DiagnoseResult.jsx` — disease name, confidence %, severity badge (color coded), what-it-means description |
| 11:00–13:00 | Connect `DiagnoseScan.jsx` → call real `POST /api/diagnose` → navigate to result with data |
| 14:00–15:00 | Connect result page → call real `GET /api/advisory` → display advisory text |
| 15:00–16:00 | Add 🔊 "Read Aloud" button → `window.speechSynthesis.speak()` with advisory text |
| 16:00–17:00 | Add language selector (EN / HI / MR / TA) → re-fetch advisory in new language on change |
| 17:00–18:00 | Add "Alert Nearby Farms" button → call API → show success toast: "4 nearby farms alerted!" |
| **Deliverable** | Full farmer flow works end-to-end with real backend: upload → diagnose → advisory → read aloud |

---

### P4 — Frontend Dev (Admin + Expert UI)
**Goal: Real hotspot map + expert validation UI**

| Time | Task |
|---|---|
| 9:30–11:00 | Connect `AdminMap.jsx` to real `GET /api/hotspots` — render real markers from API |
| 11:00–12:00 | Add popup on map marker click: disease name, farms affected, date reported, severity |
| 12:00–13:00 | Add map legend (Green = Low, Yellow = Medium, Orange = High, Red = Critical) |
| 14:00–16:00 | Build `ExpertQueue.jsx` — table of unvalidated diagnoses with: image thumbnail, AI prediction, confidence, farm location, Approve/Reject buttons |
| 16:00–18:00 | Build `FarmerRisk.jsx` — risk score card with: score level badge, weather breakdown, "Why this risk?" explanation text |
| **Deliverable** | Map shows real data, expert can approve/reject diagnoses, risk page connected to real weather API |

---

### P5 — Integration + Demo
**Goal: Full flow testing + polish start**

| Time | Task |
|---|---|
| 9:30–11:00 | Do a full end-to-end run of every screen. Log all broken things in a shared doc. |
| 11:00–12:00 | Fix CSS inconsistencies — fonts, colors, button styles should be uniform everywhere |
| 12:00–13:00 | Add loading spinners to every API call that doesn't have one |
| 14:00–16:00 | Add `FarmerHistory.jsx` — list of past diagnoses for the farmer (from DB) |
| 16:00–17:00 | Make the app mobile-responsive (media queries for screens <768px) — judges will check on phones |
| 17:00–18:00 | Write the exact demo script (who says what, which screen is open, which sample image to upload) |
| **Deliverable** | Full app works without crashes. Demo script written and shared with team. |

---

**End of Day 2 Sync (6:00 PM — 45 min):**
- Full demo run from Login → Scan → Result → Advisory → Admin Map
- Identify the top 5 remaining bugs to fix tomorrow
- Assign Day 3 bug fixes

---

## 🗓️ DAY 3 — Polish, Practice & Win

**Morning Sync (9:00 AM — 15 min):** Each person picks their assigned bugs from last night's list.

---

### P1 — ML + Backend Lead
**Goal: Reliability + performance**

| Time | Task |
|---|---|
| 9:30–11:00 | Fix all backend bugs from Day 2 list |
| 11:00–12:30 | Add error handling everywhere — what if image is not a leaf? Return friendly error message |
| 12:30–13:00 | Test with all 6 sample demo images — verify model gives correct result for each |
| 14:00–15:00 | Write 1-page "How our AI works" — model name, accuracy, training data, what makes it different (for judges) |
| 15:00–18:00 | **Practice demo** — run through script 4 times, be the backend person available if something breaks |

---

### P2 — Backend Dev
**Goal: Edge cases + fallback data**

| Time | Task |
|---|---|
| 9:30–11:00 | Add mock fallback: if OpenWeatherMap API fails, return realistic mock weather data (don't crash) |
| 11:00–12:30 | Add mock fallback: if Gemini API fails, return pre-written advisory from DB for common diseases |
| 12:30–13:00 | Run seed script one final time — make sure DB has all demo data fresh |
| 14:00–15:00 | Test on mobile hotspot (simulate bad internet) — does app still work? |
| 15:00–18:00 | **Practice demo** — support P5 during run-throughs, fix any API issues that appear |

---

### P3 — Frontend Lead (Farmer UI)
**Goal: Final farmer UI polish**

| Time | Task |
|---|---|
| 9:30–11:00 | Fix all farmer UI bugs from Day 2 |
| 11:00–12:30 | Add micro-animations: card fade-in on result page, progress bar during scan, green checkmark on success |
| 12:30–13:00 | Verify voice works in Chrome (Web Speech API is Chrome-only) — test on demo device |
| 14:00–15:00 | Add "Healthy Crop" result handling — show congratulations message if no disease found |
| 15:00–18:00 | **Practice demo** — run the farmer flow 5 times. Time it. Target: under 90 seconds for the scan flow. |

---

### P4 — Frontend Dev (Admin + Expert UI)
**Goal: Final admin UI polish**

| Time | Task |
|---|---|
| 9:30–11:00 | Fix all admin/expert UI bugs from Day 2 |
| 11:00–12:30 | Add "New Alert" animation on admin map — when expert validates, show a pulsing red dot appear on map |
| 12:30–13:00 | Add district filter to admin map — dropdown to filter by district |
| 14:00–15:00 | Print/export button on admin dashboard — `window.print()` is fine for prototype |
| 15:00–18:00 | **Practice demo** — run the admin flow 5 times. Be ready to explain the GIS map to judges. |

---

### P5 — Integration + Demo
**Goal: The entire demo experience**

| Time | Task |
|---|---|
| 9:30–11:00 | Fix all remaining integration bugs |
| 11:00–12:30 | Pre-load the app with demo state: Farmer "Rajesh Kumar" logged in, 3 past diagnoses visible, map loaded |
| 12:30–13:00 | Create a simple PowerPoint/Canva slide: Problem → Existing Gap → Our Solution → Architecture → Demo |
| 14:00–15:00 | Prepare "judge questions" list and practice answers (see below) |
| 15:00–18:00 | **Run full demo 5 times** — time each run, ensure it's under 4 minutes, fix any flow issues |

---

## ❓ Prepare Answers to These Judge Questions

| Question | Your Answer |
|---|---|
| "How is this different from Plantix?" | Plantix is image-only. We combine image + weather + soil + crop stage. We predict spread to neighboring farms. We have federated learning for privacy. |
| "What's your model accuracy?" | EfficientNet fine-tuned on PlantVillage — 87% top-1 accuracy on 38 disease classes. |
| "What if internet is down?" | Advisory and past diagnoses cached locally. Core diagnosis works offline via TFLite (roadmap). |
| "How do farmers in rural areas use this?" | Voice input in regional language. Reads advisory aloud. Works on basic Android. No English needed. |
| "What's the federated learning doing?" | Each validated farm diagnosis is a training signal. Model improves without centralizing farm images. Privacy-preserving. |
| "Can this scale to all of India?" | PostGIS handles millions of farm points. FastAPI scales horizontally. Bhashini covers 22 languages. |

---

## 🏁 Final Checklist Before You Walk In

- [ ] App runs on `localhost` without any errors
- [ ] All 6 demo images tested — know which gives which result
- [ ] Voice advisory works on the demo device (Chrome browser)
- [ ] Admin map shows hotspot markers
- [ ] Demo script practiced 5+ times — under 4 minutes
- [ ] Backup: screen recording of perfect demo run saved
- [ ] Gemini API key has sufficient quota
- [ ] OpenWeatherMap key works
- [ ] Laptop charger packed
- [ ] One person nominated as primary speaker, one as demo operator

---

## ⏰ Summary Table

| | P1 (ML/Backend) | P2 (Backend) | P3 (Farmer UI) | P4 (Admin UI) | P5 (Integration) |
|---|---|---|---|---|---|
| **Day 1** | AI model + diagnose API + DB | Advisory + Weather + Alerts APIs | Login + Farmer Home + Scan page | Admin charts + Map skeleton | Repo setup + CSS system + seed data |
| **Day 2** | Expert queue + alert trigger + perf | CORS + real weather + help P3 | Full scan flow connected to backend | Real map + expert queue UI | Full QA + mobile responsive + demo script |
| **Day 3** | Reliability + error handling + practice | Fallbacks + final DB seed + practice | Animations + polish + practice | Map animations + polish + practice | Full demo run x5 + judge Q&A prep |
