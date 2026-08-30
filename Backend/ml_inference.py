"""
ml_inference.py — loads pretrained plant-disease & agricultural-pest classifiers
at startup and exposes a unified predict() function for both diseases and insect pests.

Models:
- Disease: linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification (MobileNetV2, 38 classes)
  Fallback: wambugu71/crop_leaf_diseases_vit
- Pest: dima806/farm_insects_image_detection (Vision Transformer ViT, 15 agricultural pest classes, ~91% acc)
"""
import io
import logging
import os
from typing import Optional

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

from PIL import Image

logger = logging.getLogger("krishicare.ml")

PRIMARY_DISEASE_MODEL = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
FALLBACK_DISEASE_MODEL = "wambugu71/crop_leaf_diseases_vit"
PRIMARY_PEST_MODEL = "dima806/farm_insects_image_detection"

# Standard ImageNet normalization for MobileNetV2
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
IMAGE_SIZE = 224

# Disease Model Globals
_disease_model = None
_disease_id2label: Optional[dict] = None
_active_disease_model_name: Optional[str] = None
_disease_transform = None

# Pest Model Globals
_pest_model = None
_pest_processor = None
_pest_id2label: Optional[dict] = None

# Agricultural Insect Pest Categories
PEST_CLASSES = {
    "Aphids",
    "Fall Armyworms",
    "Armyworms",
    "Thrips",
    "Spider Mites",
    "Fruit Flies",
    "Tomato Hornworms",
    "Corn Borers",
    "Corn Earworms",
    "Cabbage Loopers",
    "Colorado Potato Beetles",
    "Western Corn Rootworms",
    "Brown Marmorated Stink Bugs",
    "Africanized Honey Bees (Killer Bees)",
}

PEST_SEVERITY_MAP = {
    "Aphids": "High",
    "Fall Armyworms": "Critical",
    "Armyworms": "Critical",
    "Thrips": "Medium",
    "Spider Mites": "High",
    "Fruit Flies": "High",
    "Tomato Hornworms": "High",
    "Corn Borers": "Critical",
    "Corn Earworms": "High",
    "Cabbage Loopers": "Medium",
    "Colorado Potato Beetles": "High",
    "Western Corn Rootworms": "High",
    "Brown Marmorated Stink Bugs": "Medium",
    "Africanized Honey Bees (Killer Bees)": "Medium",
}

PEST_CROP_MAP = {
    "Aphids": "Vegetables & Cotton",
    "Fall Armyworms": "Maize & Cereals",
    "Armyworms": "Paddy & Wheat",
    "Thrips": "Chilli & Onion",
    "Spider Mites": "Tomato & Polyhouse Crops",
    "Fruit Flies": "Fruit Orchards & Mango",
    "Tomato Hornworms": "Tomato & Solanaceous",
    "Corn Borers": "Maize & Sorghum",
    "Corn Earworms": "Maize & Pulses",
    "Cabbage Loopers": "Cabbage & Cauliflower",
    "Colorado Potato Beetles": "Potato & Eggplant",
    "Western Corn Rootworms": "Corn",
    "Brown Marmorated Stink Bugs": "Soybean & Legumes",
    "Africanized Honey Bees (Killer Bees)": "Pollinator / Orchard",
}


def _build_disease_transform():
    import torchvision.transforms as T
    return T.Compose([
        T.Resize(256),
        T.CenterCrop(IMAGE_SIZE),
        T.ToTensor(),
        T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def _load_model(model_name: str):
    from transformers import AutoModelForImageClassification
    try:
        model = AutoModelForImageClassification.from_pretrained(model_name, local_files_only=True)
    except Exception:
        model = AutoModelForImageClassification.from_pretrained(model_name)
    model.eval()
    return model


def _load_pest_processor_and_model():
    from transformers import AutoImageProcessor, AutoModelForImageClassification
    try:
        proc = AutoImageProcessor.from_pretrained(PRIMARY_PEST_MODEL, local_files_only=True)
        mod = AutoModelForImageClassification.from_pretrained(PRIMARY_PEST_MODEL, local_files_only=True)
    except Exception:
        proc = AutoImageProcessor.from_pretrained(PRIMARY_PEST_MODEL)
        mod = AutoModelForImageClassification.from_pretrained(PRIMARY_PEST_MODEL)
    mod.eval()
    return proc, mod


def warm_up():
    """Call once at app startup to warm up both disease and pest models."""
    global _disease_model, _disease_id2label, _active_disease_model_name, _disease_transform
    global _pest_model, _pest_processor, _pest_id2label

    # 1. Warm up Disease Model
    if _disease_model is None:
        _disease_transform = _build_disease_transform()
        try:
            logger.info("Loading disease model: %s", PRIMARY_DISEASE_MODEL)
            _disease_model = _load_model(PRIMARY_DISEASE_MODEL)
            _disease_id2label = _disease_model.config.id2label
            _active_disease_model_name = PRIMARY_DISEASE_MODEL
        except Exception as e:
            logger.warning("Primary disease model failed (%s). Trying fallback.", e)
            try:
                _disease_model = _load_model(FALLBACK_DISEASE_MODEL)
                _disease_id2label = _disease_model.config.id2label
                _active_disease_model_name = FALLBACK_DISEASE_MODEL
            except Exception as e2:
                logger.error("Fallback disease model also failed: %s", e2)
                _disease_model = None

    # 2. Warm up Pest Model
    if _pest_model is None:
        try:
            logger.info("Loading pest model: %s", PRIMARY_PEST_MODEL)
            _pest_processor, _pest_model = _load_pest_processor_and_model()
            _pest_id2label = _pest_model.config.id2label
        except Exception as ep:
            logger.error("Failed to load pest model (%s)", ep)
            _pest_model = None
            _pest_processor = None


def _preprocess_disease(image_bytes: bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return _disease_transform(img).unsqueeze(0)


CROP_CLASS_INDICES = {
    "apple": [0, 1, 2, 3],
    "blueberry": [4],
    "cherry": [5, 6],
    "corn": [7, 8, 9, 10],
    "maize": [7, 8, 9, 10],
    "grape": [11, 12, 13, 14],
    "orange": [15],
    "citrus": [15],
    "peach": [16, 17],
    "pepper": [18, 19],
    "bell pepper": [18, 19],
    "capsicum": [18, 19],
    "potato": [20, 21, 22],
    "raspberry": [23],
    "soybean": [24],
    "squash": [25],
    "strawberry": [26, 27],
    "tomato": [28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
}


def get_crop_indices(crop_hint: Optional[str]) -> tuple[list[int], Optional[str], bool]:
    """
    Returns (list_of_indices, canonical_crop_name, is_supported).
    If crop_hint is None or Auto, returns ([], None, True).
    If crop_hint is a recognized supported crop, returns (indices, canonical_crop, True).
    If crop_hint is not recognized in dataset classes, returns ([], canonical_crop, False).
    """
    if not crop_hint:
        return [], None, True
    c_clean = str(crop_hint).strip().lower()
    if c_clean in ("", "all", "auto", "unknown", "other", "none", "null", "undefined"):
        return [], None, True

    # 1. Direct dictionary match
    for key, indices in CROP_CLASS_INDICES.items():
        if c_clean == key or key in c_clean or c_clean in key:
            canonical = key.title()
            if key in ("corn", "maize"):
                canonical = "Corn"
            elif "pepper" in key or key == "capsicum":
                canonical = "Bell Pepper"
            return indices, canonical, True

    # 2. Dynamic substring search in loaded id2label
    if _disease_id2label:
        matches = []
        for k, name in _disease_id2label.items():
            idx = int(k) if isinstance(k, (int, str)) and str(k).isdigit() else k
            if isinstance(idx, int) and c_clean in name.lower():
                matches.append(idx)
        if matches:
            return matches, crop_hint.strip().title(), True

    # Crop specified by user, but not cataloged in our disease dataset
    return [], crop_hint.strip().title(), False


def _parse_disease_label(raw_label: str):
    label = raw_label.strip()
    if "healthy" in label.lower():
        crop = label.lower().replace("healthy", "").replace("plant", "").strip().title()
        return (crop or None), "Healthy"
    if " with " in label.lower():
        idx = label.lower().index(" with ")
        crop = label[:idx].strip()
        disease = label[idx + len(" with "):].strip()
        return crop, disease
    for c in ("Apple", "Cherry", "Corn", "Grape", "Peach", "Potato", "Tomato", "Strawberry", "Squash"):
        if label.lower().startswith(c.lower() + " "):
            disease = label[len(c) + 1:].strip()
            return c, disease
    if "_" in label:
        normalized = label.replace("__", "_")
        parts = [p for p in normalized.split("_") if p]
        if len(parts) >= 2:
            crop = parts[0]
            disease = " ".join(parts[1:]).replace("healthy", "Healthy").strip()
            if disease.lower() in ("", "healthy"):
                disease = "Healthy"
            return crop, disease
    return None, label


def severity_from_confidence(confidence: float, disease: str) -> str:
    if disease == "Healthy":
        return "None"
    if confidence >= 0.90:
        return "Critical"
    if confidence >= 0.75:
        return "High"
    if confidence >= 0.55:
        return "Medium"
    return "Low"


DISEASE_CONFIDENCE_THRESHOLD = 0.60


def _eval_disease(pil_img: Image.Image, crop_indices: list[int], canonical_crop: Optional[str]) -> tuple[str, Optional[str], float, Optional[str]]:
    """
    Evaluates the disease classifier on the image with calibrated confidence.
    Returns: (disease_name, detected_crop, confidence, raw_label)
    """
    import torch
    if _disease_model is None or _disease_transform is None:
        return "Unknown", canonical_crop, 0.0, None

    tensor = _disease_transform(pil_img).unsqueeze(0)
    with torch.no_grad():
        d_outs = _disease_model(tensor)
        logits = d_outs.logits[0]

        # Full global softmax across all 38 classes
        global_probs = torch.nn.functional.softmax(logits, dim=-1)
        global_top_idx = int(torch.argmax(global_probs).item())
        global_top_conf = float(global_probs[global_top_idx].item())

        if crop_indices:
            # Subset logits strictly for the target crop
            crop_logits = logits[crop_indices]
            crop_probs = torch.nn.functional.softmax(crop_logits, dim=-1)
            best_sub = int(torch.argmax(crop_probs).item())
            d_top_idx = crop_indices[best_sub]
            sub_conf = float(crop_probs[best_sub].item())

            # CALIBRATION:
            # Check whether the global prediction aligns with this crop family
            crop_family_mass = float(global_probs[crop_indices].sum().item())

            if global_top_idx in crop_indices:
                # High agreement: unconstrained top-1 is within this crop family
                d_confidence = float(min(0.98, max(0.68, sub_conf * 0.65 + global_top_conf * 0.35)))
            else:
                # Disagreement: model globally predicts another crop entirely
                agreement_factor = min(1.0, max(0.20, crop_family_mass * 2.5))
                d_confidence = float(round(sub_conf * agreement_factor, 4))
        else:
            d_top_idx = global_top_idx
            d_confidence = float(global_top_conf)

    d_raw = _disease_id2label.get(d_top_idx, _disease_id2label.get(str(d_top_idx), f"class_{d_top_idx}"))
    parsed_crop, d_disease = _parse_disease_label(d_raw)
    d_crop = canonical_crop or parsed_crop
    return d_disease, d_crop, round(d_confidence, 4), d_raw


def _eval_pest(pil_img: Image.Image) -> tuple[Optional[str], float, float]:
    """
    Evaluates the agricultural pest classifier on the image.
    Returns: (top_pest_label, raw_probability, calibrated_confidence)
    """
    import torch
    if _pest_model is None or _pest_processor is None:
        return None, 0.0, 0.0

    p_inputs = _pest_processor(pil_img, return_tensors="pt")
    with torch.no_grad():
        p_outs = _pest_model(**p_inputs)
        p_probs = torch.nn.functional.softmax(p_outs.logits, dim=-1)[0]
        p_top, p_idx = torch.topk(p_probs, 5)

        for p_val, idx_val in zip(p_top, p_idx):
            lbl = _pest_id2label.get(idx_val.item(), "")
            if lbl in PEST_CLASSES:
                raw_prob = float(p_val.item())
                # Calibrate pest confidence:
                # 15-class random baseline is ~0.067. A raw prob >= 0.15 is significant.
                if raw_prob >= 0.15:
                    calibrated = round(min(0.96, max(0.70, raw_prob * 3.5)), 4)
                else:
                    calibrated = round(raw_prob, 4)
                return lbl, raw_prob, calibrated

    return None, 0.0, 0.0


def predict(image_bytes: bytes, mode: str = "auto", crop_hint: Optional[str] = None) -> dict:
    """
    Tiered dual-model classifier:
    1. Runs Disease model first.
    2. If Disease model is confident (>= 0.60), accepts it and SKIPS the pest model (saving computation).
    3. If Disease model confidence is low (< 0.60) or crop is uncatalogued, triggers the Pest model fallback.
    4. Compares calibrated confidences and returns whichever is higher.
    """
    if _disease_model is None or _pest_model is None:
        warm_up()

    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Could not read image: {e}")

    # 1. Resolve crop hint filtering and taxonomy support
    crop_indices, canonical_crop, is_supported = get_crop_indices(crop_hint)
    logger.info(
        "predict() called with crop_hint=%r -> canonical=%r, indices=%s, is_supported=%s, mode=%r",
        crop_hint, canonical_crop, crop_indices, is_supported, mode,
    )

    final_crop = canonical_crop or (crop_hint.strip().title() if crop_hint else "Crops")

    # MODE OVERRIDE: Pest Only
    if mode == "pest":
        p_label, p_raw, p_conf = _eval_pest(pil_img)
        if p_label and p_raw >= 0.15:
            severity = PEST_SEVERITY_MAP.get(p_label, "High")
            return {
                "type": "pest",
                "name": p_label,
                "disease": p_label,
                "crop": final_crop,
                "confidence": p_conf,
                "severity": severity,
                "is_uncertain": p_conf < 0.60,
                "model_used": PRIMARY_PEST_MODEL,
                "raw_label": f"{p_label} ({round(p_raw, 3)})",
                "disease_candidate": None,
                "pest_model_triggered": True,
            }
        return {
            "type": "pest",
            "name": p_label or "No Pest Detected",
            "disease": p_label or "No Pest Detected",
            "crop": final_crop,
            "confidence": round(p_raw, 4),
            "severity": "Low",
            "is_uncertain": True,
            "model_used": PRIMARY_PEST_MODEL,
            "raw_label": f"{p_label} ({round(p_raw, 3)})" if p_label else "none",
            "disease_candidate": None,
            "pest_model_triggered": True,
        }

    # TIER 1: Evaluate Disease Model
    d_disease, d_crop, d_confidence, d_raw = "Unknown", canonical_crop, 0.0, None
    if is_supported or not canonical_crop:
        try:
            d_disease, d_crop, d_confidence, d_raw = _eval_disease(pil_img, crop_indices, canonical_crop)
            if d_crop:
                final_crop = d_crop
        except Exception as ed:
            logger.error("Disease model evaluation error: %s", ed)

    # MODE OVERRIDE: Disease Only
    if mode == "disease":
        return {
            "type": "disease",
            "name": d_disease,
            "disease": d_disease,
            "crop": final_crop,
            "confidence": d_confidence,
            "severity": severity_from_confidence(d_confidence, d_disease),
            "is_uncertain": d_confidence < 0.60,
            "model_used": _active_disease_model_name,
            "raw_label": d_raw,
            "pest_candidate": None,
            "pest_model_triggered": False,
        }

    # TIER 2: Fast return if Disease Model is already confident (>= 60%)
    # This avoids wasting time running the pest model on clear disease images!
    is_confident_disease = (is_supported and d_confidence >= DISEASE_CONFIDENCE_THRESHOLD and d_disease != "Healthy")
    is_confident_healthy = (is_supported and d_disease == "Healthy" and d_confidence >= 0.70)

    if is_confident_disease or is_confident_healthy:
        logger.info(
            "Disease model confident (%.2f >= %.2f) for %s - pest model SKIPPED",
            d_confidence, DISEASE_CONFIDENCE_THRESHOLD, d_disease
        )
        return {
            "type": "disease",
            "name": d_disease,
            "disease": d_disease,
            "crop": final_crop,
            "confidence": d_confidence,
            "severity": severity_from_confidence(d_confidence, d_disease),
            "is_uncertain": False,
            "model_used": _active_disease_model_name,
            "raw_label": d_raw,
            "pest_candidate": None,
            "pest_model_triggered": False,
        }

    # TIER 3: Disease confidence is LOW (< 60%) or crop is uncatalogued -> Trigger Pest Fallback!
    logger.info(
        "Disease confidence low (%.2f < %.2f) or unsupported crop - TRIGGERING PEST MODEL FALLBACK",
        d_confidence, DISEASE_CONFIDENCE_THRESHOLD
    )
    p_label, p_raw, p_conf = _eval_pest(pil_img)

    # Compare results: Return whichever model has the higher confidence
    if p_label and p_raw >= 0.15 and p_conf > d_confidence:
        logger.info(
            "Pest fallback succeeded: %s (conf=%.2f, raw=%.3f) beat disease %s (conf=%.2f)",
            p_label, p_conf, p_raw, d_disease, d_confidence
        )
        severity = PEST_SEVERITY_MAP.get(p_label, "High")
        return {
            "type": "pest",
            "name": p_label,
            "disease": p_label,
            "crop": final_crop,
            "confidence": p_conf,
            "severity": severity,
            "is_uncertain": p_conf < 0.60,
            "model_used": PRIMARY_PEST_MODEL,
            "raw_label": f"{p_label} ({round(p_raw, 3)})",
            "disease_candidate": f"{d_disease} ({round(d_confidence, 3)})" if d_disease != "Unknown" else None,
            "pest_model_triggered": True,
        }
    elif canonical_crop and not is_supported:
        return {
            "type": "disease",
            "name": f"Uncatalogued Leaf Disease ({canonical_crop})",
            "disease": f"Uncatalogued Leaf Disease ({canonical_crop})",
            "crop": final_crop,
            "confidence": 0.20,
            "severity": "Unknown",
            "is_uncertain": True,
            "model_used": _active_disease_model_name,
            "raw_label": f"uncatalogued_crop:{canonical_crop}",
            "pest_candidate": f"{p_label} ({round(p_raw, 3)})" if p_label else None,
            "pest_model_triggered": True,
        }
    else:
        logger.info(
            "Disease model retained despite low confidence (disease=%.2f, pest=%.2f)",
            d_confidence, p_conf
        )
        return {
            "type": "disease",
            "name": d_disease,
            "disease": d_disease,
            "crop": final_crop,
            "confidence": d_confidence,
            "severity": severity_from_confidence(d_confidence, d_disease),
            "is_uncertain": True,
            "model_used": _active_disease_model_name,
            "raw_label": d_raw,
            "pest_candidate": f"{p_label} ({round(p_raw, 3)})" if p_label else None,
            "pest_model_triggered": True,
        }