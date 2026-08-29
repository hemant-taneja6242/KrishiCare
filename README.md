# 🌾 KrishiCare (कृषि केयर) — Project Documentation & Setup Guide

Welcome to **KrishiCare**, an AI-powered smart agricultural diagnostics and crop health monitoring platform designed to empower farmers with immediate plant disease detection, localized alert hotspots, and actionable remedies.

> **Role Focus (P5 — Integration + Demo)**:
> This repository infrastructure, sample dataset, database seeding system, shared CSS design tokens (`Outfit` typography & agricultural design system), and API end-to-end testing suite are maintained by **P5**.

---

## 📁 Folder Structure

```text
KrishiCare/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules for node, python, & build files
├── package.json              # Project scripts & dependencies
├── README.md                 # Project documentation & setup instructions
├── public/                   # Static assets & public web preview
│   ├── index.html            # UI Design Tokens & Component Preview Page
│   └── images/
│       └── sample_leaves/    # 6 PlantVillage sample images for demo
│           ├── rice_blast.jpg
│           ├── tomato_early_blight.jpg
│           ├── tomato_late_blight.jpg
│           ├── powdery_mildew.jpg
│           ├── healthy_rice.jpg
│           └── healthy_tomato.jpg
└── src/
    ├── css/                  # Shared CSS Design System
    │   ├── tokens.css        # Colors, Outfit typography, spacing, elevation
    │   ├── base.css          # CSS reset, typography base, layout utilities
    │   ├── components.css    # Cards, buttons, badges, diagnostic panels
    │   └── krishi-theme.css  # Combined theme stylesheet import
    ├── db/                   # Database & Seeding Infrastructure
    │   ├── seed.js           # Node.js Database Seeder
    │   ├── seed.py           # Python Database Seeder
    │   └── data/
    │       ├── farmers.json         # 3 Farmer Profiles
    │       ├── diagnoses.json       # 10 Past Crop Disease Diagnoses
    │       └── alert_hotspots.json  # 8 Regional Disease Hotspots
    └── docs/                 # Team Integration & Debugging Docs
        ├── api_testing_guide.md     # E2E API test plans for P1 & P2
        ├── bug_report_template.md  # Standard bug logging format
        └── bug_log.md              # Live tracking bug log
```

---

## ⚡ Quick Setup Instructions

### 1. Environment Configuration
Copy `.env.example` to create your local `.env` configuration file:
```bash
cp .env.example .env
```

### 2. Run Database Seeding
To populate sample farmer profiles, historical diagnoses, and alert hotspots:

#### Option A: Using Node.js
```bash
npm run seed
# or
node src/db/seed.js
```

#### Option B: Using Python
```bash
npm run seed:python
# or
python3 src/db/seed.py
```

---

## 🎨 Shared CSS Design System

The shared design system uses the **Outfit** Google Font and a rich agricultural visual palette.

To include the CSS system in any HTML / React component:
```html
<link rel="stylesheet" href="src/css/krishi-theme.css">
```

### Key Tokens:
- **Font**: `'Outfit', sans-serif`
- **Primary Palette**: Emerald Green (`--color-primary-500: #16a34a`), Forest Green (`--color-primary-900: #064e3b`)
- **Accent Palette**: Amber Gold (`--color-accent-amber: #d97706`), Harvest Sun (`--color-accent-yellow: #eab308`)
- **Status Colors**: Danger Red (`#dc2626`), Warning Orange (`#f97316`), Success Green (`#16a34a`)

---

## 🍃 Sample PlantVillage Dataset Images

Sample leaf images for demo testing are located under `public/images/sample_leaves/`:
1. `rice_blast.jpg` — Rice Blast lesion sample
2. `tomato_early_blight.jpg` — Concentric ring target lesions
3. `tomato_late_blight.jpg` — Water-soaked dark lesions
4. `powdery_mildew.jpg` — White fungal powder patches
5. `healthy_rice.jpg` — Vibrant healthy rice leaf
6. `healthy_tomato.jpg` — Clear healthy tomato leaf

---

## 🧪 API End-to-End Testing & Team Debugging

- **P1 (ML API)** & **P2 (Backend/Weather API)** testing plans: See [api_testing_guide.md](file:///Users/nehul/Desktop/Krishi%20Care/src/docs/api_testing_guide.md).
- **Bug Reporting & Setup Help**: Use [bug_report_template.md](file:///Users/nehul/Desktop/Krishi%20Care/src/docs/bug_report_template.md) and log issues in `src/docs/bug_log.md`.
