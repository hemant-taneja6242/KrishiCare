#!/usr/bin/env python3
"""
KrishiCare Database Seed Script (Python)
Pre-populates: 3 Farmer Profiles, 10 Past Diagnoses, 8 Alert Hotspots
"""

import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
FARMERS_PATH = os.path.join(DATA_DIR, "farmers.json")
DIAGNOSES_PATH = os.path.join(DATA_DIR, "diagnoses.json")
HOTSPOTS_PATH = os.path.join(DATA_DIR, "alert_hotspots.json")
IMAGES_DIR = os.path.abspath(os.path.join(BASE_DIR, "../../public/images/sample_leaves"))

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading {filepath}: {e}")
        sys.exit(1)

def run_seed():
    print("====================================================")
    print("🌾 KrishiCare DB Seed Script (Python) — Initializing Data...")
    print("====================================================\n")

    farmers = load_json(FARMERS_PATH)
    diagnoses = load_json(DIAGNOSES_PATH)
    hotspots = load_json(HOTSPOTS_PATH)

    print(f"✅ Loaded {len(farmers)} Farmer Profiles (Expected: 3)")
    for f in farmers:
        crops = ", ".join(f.get("primaryCrops", []))
        print(f"   - [ID: {f['id']}] {f['name']} | Location: {f['village']}, {f['state']} | Crops: {crops}")

    print(f"\n✅ Loaded {len(diagnoses)} Past Diagnoses (Expected: 10)")
    for d in diagnoses:
        conf = round(d['confidence'] * 100, 1)
        print(f"   - [ID: {d['id']}] Farmer: {d['farmerName']} | Crop: {d['crop']} | Disease: {d['diseaseDetected']} ({conf}%) | Severity: {d['severity']}")

    print(f"\n✅ Loaded {len(hotspots)} Disease Alert Hotspots (Expected: 8)")
    for h in hotspots:
        print(f"   - [ID: {h['id']}] Region: {h['regionName']} ({h['state']}) | Outbreak: {h['diseaseType']} | Radius: {h['affectedRadiusKm']} km | Severity: {h['severity']}")

    print("\n🍃 Verifying sample leaf image paths:")
    sample_images = [
        'rice_blast.jpg',
        'tomato_early_blight.jpg',
        'tomato_late_blight.jpg',
        'powdery_mildew.jpg',
        'healthy_rice.jpg',
        'healthy_tomato.jpg'
    ]

    for img in sample_images:
        img_path = os.path.join(IMAGES_DIR, img)
        if os.path.exists(img_path):
            print(f"   - [EXISTS] {img}")
        else:
            print(f"   - [WARNING] Missing image: {img} at {img_path}")

    print("\n====================================================")
    print("🎉 Python DB Seeding completed successfully!")
    print("====================================================\n")

if __name__ == "__main__":
    run_seed()
