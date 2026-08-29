"""
ml_inference.py — loads the pretrained plant-disease classifier ONCE at
startup and exposes a simple predict() function.

Model: linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification
       (MobileNetV2 fine-tuned on the Kaggle/PlantVillage dataset, 38 classes)
Fallback: wambugu71/crop_leaf_diseases_vit

IMPORTANT: we do NOT use transformers' `pipeline()` or `AutoImageProcessor`
here. The linkanjarad repo is a few years old and its preprocessor_config.json
predates newer transformers' auto-detection requirements, which throws
`Unrecognized image processor` when you try to auto-load it. Rather than
depend on that repo's config being perfectly formed, we load the model
weights directly and do the standard ImageNet preprocessing ourselves
(MobileNetV2's base weights were pretrained on ImageNet before this repo
fine-tuned them on PlantVillage, so ImageNet normalization is correct here).
This is more code but far more robust — it can't break due to some other
repo's config quirks.

Design notes for the hackathon:
- We load the model lazily (first request) OR eagerly at startup via
  `warm_up()` called from main.py's startup event, so the FIRST demo
  request isn't slow (cold model load can take 5-15s).
- We wrap everything in try/except and fall back gracefully so a bad/
  non-leaf image never crashes the API.
"""
import io
import logging
from typing import Optional

from PIL import Image

logger = logging.getLogger("krishicare.ml")

PRIMARY_MODEL = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
FALLBACK_MODEL = "wambugu71/crop_leaf_diseases_vit"

# Standard ImageNet normalization — correct for MobileNetV2/ViT backbones
# pretrained on ImageNet before being fine-tuned on PlantVillage.
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
IMAGE_SIZE = 224

_model = None
_id2label: Optional[dict] = None
_active_model_name: Optional[str] = None
_transform = None


def _build_transform():
    import torchvision.transforms as T
    return T.Compose([
        T.Resize(256),
        T.CenterCrop(IMAGE_SIZE),
        T.ToTensor(),
        T.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def _load_model(model_name: str):
    from transformers import AutoModelForImageClassification
    model = AutoModelForImageClassification.from_pretrained(model_name)
    model.eval()
    return model


def warm_up():
    """Call this once at app startup so the demo's first request is fast."""
    global _model, _id2label, _active_model_name, _transform

    if _model is not None:
        return

    _transform = _build_transform()

    try:
        logger.info("Loading primary model: %s", PRIMARY_MODEL)
        _model = _load_model(PRIMARY_MODEL)
        _id2label = _model.config.id2label
        _active_model_name = PRIMARY_MODEL
    except Exception as e:
        logger.warning("Primary model failed to load (%s). Trying fallback.", e)
        try:
            _model = _load_model(FALLBACK_MODEL)
            _id2label = _model.config.id2label
            _active_model_name = FALLBACK_MODEL
        except Exception as e2:
            logger.error("Fallback model also failed to load: %s", e2)
            _model = None
            _id2label = None
            _active_model_name = None


def _preprocess(image_bytes: bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return _transform(img).unsqueeze(0)  # add batch dimension


def _parse_label(raw_label: str):
    """
    Splits a raw model label into (crop, disease).

    linkanjarad's model uses human-readable labels like:
      "Tomato with Target Spot", "Apple with Apple Scab", "Tomato healthy"
    Some other PlantVillage-style repos instead use underscore labels like:
      "Tomato___Target_Spot", "Rice___Blast"
    We handle both formats here so swapping PRIMARY_MODEL/FALLBACK_MODEL
    later doesn't silently break crop/disease parsing again.
    """
    label = raw_label.strip()

    # Format 1: "<Crop> with <Disease>" (this model's actual format)
    if " with " in label.lower():
        idx = label.lower().index(" with ")
        crop = label[:idx].strip()
        disease = label[idx + len(" with "):].strip()
        return crop, disease

    # Format 2: "<Crop> healthy" / "<Crop> Healthy" / "<Crop>___healthy" (no "with")
    if label.lower().endswith("healthy"):
        crop = label[: -len("healthy")].strip().strip("_").strip()
        return (crop or None), "Healthy"

    # Format 3: underscore-separated PlantVillage style, e.g. "Tomato___Late_blight"
    if "_" in label:
        normalized = label.replace("__", "_")
        parts = [p for p in normalized.split("_") if p]
        if len(parts) >= 2:
            crop = parts[0]
            disease = " ".join(parts[1:]).replace("healthy", "Healthy").strip()
            if disease.lower() in ("", "healthy"):
                disease = "Healthy"
            return crop, disease

    # Fallback: couldn't confidently split crop from disease
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


def predict(image_bytes: bytes) -> dict:
    """
    Returns dict: {disease, crop, confidence, severity, model_used, raw_label}
    Raises ValueError for unreadable images (caller should return HTTP 400).
    """
    if _model is None:
        warm_up()
    if _model is None:
        # Model truly unavailable — degrade gracefully instead of 500ing
        # so the demo doesn't die if HF is unreachable at the venue.
        return {
            "disease": "Unknown",
            "crop": None,
            "confidence": 0.0,
            "severity": "Unknown",
            "model_used": None,
            "raw_label": None,
            "error": "model_unavailable",
        }

    try:
        input_tensor = _preprocess(image_bytes)
    except Exception as e:
        raise ValueError(f"Could not read image: {e}")

    import torch
    with torch.no_grad():
        outputs = _model(input_tensor)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
        top_idx = int(torch.argmax(probs).item())
        confidence = float(probs[top_idx].item())

    raw_label = _id2label.get(top_idx, _id2label.get(str(top_idx), f"class_{top_idx}"))
    crop, disease = _parse_label(raw_label)

    return {
        "disease": disease,
        "crop": crop,
        "confidence": round(confidence, 4),
        "severity": severity_from_confidence(confidence, disease),
        "model_used": _active_model_name,
        "raw_label": raw_label,
    }