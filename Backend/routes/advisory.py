"""
routes/advisory.py — GET /api/advisory?disease=&crop=&lang=

Owner: P2

Calls Gemini 1.5 Flash to turn a disease label into a farmer-readable
advisory (causes, prevention, treatment) in the requested language.

Day 1: basic Gemini call, returns advisory text.
Day 2: results are cached in the `AdvisoryCache` table P1 already added
       to models.py (same disease+crop+lang combo hits Gemini once, then
       serves from DB — saves API quota and speeds up repeat demo runs).
       Tested against all 4 languages: en / hi / mr / ta.
Day 3: if Gemini is unreachable or the key is missing/rate-limited, we
       fall back to a small set of pre-written advisories (see
       FALLBACK_ADVISORY below) instead of a 500 — so a flaky API or a
       dead venue wifi never kills the farmer flow on demo day.

Env var required: GEMINI_API_KEY (put it in Backend/.env)
"""
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import AdvisoryCache, get_db

logger = logging.getLogger("krishicare.advisory")
router = APIRouter(prefix="/api", tags=["advisory"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = "gemini-1.5-flash"

# How long a cached advisory is considered fresh before we try Gemini again.
# Advisory content for a given disease doesn't really go stale, so this is
# generous — it mainly exists so a corrected/regenerated advisory can
# eventually refresh instead of being cached forever.
CACHE_FRESHNESS = timedelta(days=7)

SUPPORTED_LANGS = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
}

_gemini_model = None  # lazy-initialized so import never fails without a key


class AdvisoryResponse(BaseModel):
    disease: str
    crop: Optional[str] = None
    lang: str
    advisory_text: str
    source: str  # "cache" | "gemini" | "fallback"


def _get_gemini_model():
    """Lazily configure and cache the Gemini client. Returns None if the
    key is missing or the SDK fails to init, so callers can fall back
    instead of crashing the endpoint."""
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — advisory endpoint will use fallback text only.")
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        return _gemini_model
    except Exception:
        logger.exception("Failed to initialize Gemini client")
        return None


def _build_prompt(disease: str, crop: Optional[str], lang_name: str) -> str:
    crop_part = f" affecting {crop}" if crop else ""
    return (
        f"You are an agricultural extension officer advising a smallholder farmer in India. "
        f"The crop has been diagnosed with: {disease}{crop_part}.\n\n"
        f"Write a short, practical advisory in {lang_name} (plain text, no markdown, no headings) "
        f"covering, in this order: (1) a one-line explanation of the disease, (2) 2-3 concrete "
        f"prevention steps, (3) 2-3 concrete treatment steps (mention both an organic/low-cost "
        f"option and a chemical option where relevant). Keep it under 130 words. Use simple, "
        f"direct language a farmer with no technical background can act on immediately."
    )


def _get_cached(db: Session, disease: str, crop: Optional[str], lang: str) -> Optional[AdvisoryCache]:
    row = (
        db.query(AdvisoryCache)
        .filter(
            AdvisoryCache.disease_label == disease,
            AdvisoryCache.crop == crop,
            AdvisoryCache.lang == lang,
        )
        .order_by(AdvisoryCache.created_at.desc())
        .first()
    )
    if row and (datetime.utcnow() - row.created_at) <= CACHE_FRESHNESS:
        return row
    return None


# ---------------------------------------------------------------------
# Day 3 fallback content — used only if Gemini is unavailable/erroring.
# Keyed by a normalized disease name; feel free to extend this list with
# whatever diseases show up in your 6 demo images.
# NOTE: hi/mr/ta text below is a best-effort machine-quality translation
# for demo purposes — have a native speaker on the team glance at it
# before judges see it, if you have time.
# ---------------------------------------------------------------------
FALLBACK_ADVISORY = {
    "rice blast": {
        "en": "Rice Blast: Apply a recommended fungicide (e.g. Tricyclazole) as soon as lesions appear. Avoid excess nitrogen fertilizer. Ensure proper field drainage and use resistant varieties next season.",
        "hi": "धान झुलसा रोग (Rice Blast): लक्षण दिखते ही अनुशंसित फफूंदनाशक (जैसे ट्राइसाइक्लाज़ोल) का छिड़काव करें। अधिक नाइट्रोजन उर्वरक से बचें। खेत की उचित जल निकासी सुनिश्चित करें और अगले सीजन में प्रतिरोधी किस्मों का उपयोग करें।",
        "mr": "भात करपा रोग (Rice Blast): लक्षणे दिसताच शिफारस केलेली बुरशीनाशक (उदा. ट्रायसायक्लाझोल) फवारणी करा. जास्त नत्र खताचा वापर टाळा. शेतातील पाण्याचा योग्य निचरा सुनिश्चित करा आणि पुढील हंगामात प्रतिकारक जाती वापरा.",
        "ta": "நெல் அசுவினி நோய் (Rice Blast): அறிகுறிகள் தோன்றியவுடன் பரிந்துரைக்கப்பட்ட பூஞ்சைக்கொல்லியை (எ.கா. ட்ரைசைக்ளசோல்) தெளிக்கவும். அதிக நைட்ரஜன் உரத்தை தவிர்க்கவும். வயலில் சரியான வடிகால் வசதி இருப்பதை உறுதி செய்யவும்.",
    },
    "late blight": {
        "en": "Tomato Late Blight: Remove and destroy infected leaves immediately. Apply a copper-based or systemic fungicide. Avoid overhead irrigation and improve air circulation between plants.",
        "hi": "टमाटर पछेती झुलसा (Late Blight): संक्रमित पत्तियों को तुरंत हटाकर नष्ट करें। कॉपर आधारित या सिस्टमिक फफूंदनाशक का छिड़काव करें। ऊपर से सिंचाई से बचें और पौधों के बीच हवा का संचार बेहतर बनाएं।",
        "mr": "टोमॅटो उशिरा येणारा करपा (Late Blight): संक्रमित पाने त्वरित काढून नष्ट करा. कॉपरयुक्त किंवा सिस्टेमिक बुरशीनाशक फवारा. वरून पाणी देणे टाळा आणि झाडांमध्ये हवा खेळती राहील याची काळजी घ्या.",
        "ta": "தக்காளி பிற்பட்ட நோய் (Late Blight): பாதிக்கப்பட்ட இலைகளை உடனடியாக அகற்றி அழிக்கவும். காப்பர் அடிப்படையிலான பூஞ்சைக்கொல்லியை தெளிக்கவும். மேலிருந்து நீர்ப்பாசனத்தை தவிர்க்கவும்.",
    },
    "powdery mildew": {
        "en": "Powdery Mildew: Spray with a sulfur-based fungicide or neem oil. Avoid excess nitrogen and ensure good spacing/airflow between plants. Remove heavily infected leaves.",
        "hi": "चूर्णी फफूंदी (Powdery Mildew): सल्फर आधारित फफूंदनाशक या नीम के तेल का छिड़काव करें। अधिक नाइट्रोजन से बचें और पौधों के बीच उचित दूरी व हवा का संचार सुनिश्चित करें।",
        "mr": "भुरी रोग (Powdery Mildew): सल्फरयुक्त बुरशीनाशक किंवा कडुनिंब तेल फवारा. जास्त नत्र टाळा आणि झाडांमध्ये योग्य अंतर व हवा खेळती ठेवा.",
        "ta": "பொடி பூஞ்சை நோய் (Powdery Mildew): சல்பர் அடிப்படையிலான பூஞ்சைக்கொல்லி அல்லது வேப்ப எண்ணெயை தெளிக்கவும். அதிக நைட்ரஜனை தவிர்க்கவும், செடிகளுக்கு இடையே காற்றோட்டத்தை உறுதி செய்யவும்.",
    },
    "healthy": {
        "en": "Your crop looks healthy! Continue regular monitoring, balanced fertilization, and timely irrigation.",
        "hi": "आपकी फसल स्वस्थ दिख रही है! नियमित निगरानी, संतुलित उर्वरक और समय पर सिंचाई जारी रखें।",
        "mr": "तुमचे पीक निरोगी दिसत आहे! नियमित तपासणी, संतुलित खत व्यवस्थापन आणि वेळेवर सिंचन सुरू ठेवा.",
        "ta": "உங்கள் பயிர் ஆரோக்கியமாக உள்ளது! தொடர்ந்து கண்காணிப்பு, சமச்சீர் உரமிடுதல் மற்றும் சரியான நேரத்தில் நீர்ப்பாசனம் செய்யவும்.",
    },
    "_generic": {
        "en": "We couldn't reach our AI advisor right now. Please monitor the affected leaves, remove severely infected parts, and consult your local Krishi Vigyan Kendra or agricultural officer for treatment guidance.",
        "hi": "हम अभी अपने AI सलाहकार से संपर्क नहीं कर पाए। कृपया प्रभावित पत्तियों पर नज़र रखें, गंभीर रूप से संक्रमित हिस्सों को हटाएं, और अपने नज़दीकी कृषि विज्ञान केंद्र से संपर्क करें।",
        "mr": "आम्ही सध्या आमच्या AI सल्लागाराशी संपर्क साधू शकलो नाही. कृपया प्रभावित पानांवर लक्ष ठेवा आणि तुमच्या जवळच्या कृषी विज्ञान केंद्राशी संपर्क साधा.",
        "ta": "எங்கள் AI ஆலோசகரை இப்போது தொடர்பு கொள்ள முடியவில்லை. பாதிக்கப்பட்ட இலைகளை கவனிக்கவும், அருகிலுள்ள வேளாண் அறிவியல் மையத்தை அணுகவும்.",
    },
}


def _fallback_text(disease: str, lang: str) -> str:
    key = disease.strip().lower()
    entry = FALLBACK_ADVISORY.get(key, FALLBACK_ADVISORY["_generic"])
    return entry.get(lang, entry.get("en"))


@router.get("/advisory", response_model=AdvisoryResponse)
def get_advisory(
    disease: str = Query(..., min_length=1),
    crop: Optional[str] = Query(None),
    lang: str = Query("en"),
    db: Session = Depends(get_db),
):
    lang = lang.lower().strip()
    if lang not in SUPPORTED_LANGS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported lang '{lang}'. Supported: {', '.join(SUPPORTED_LANGS)}",
        )
    disease = disease.strip()
    crop = crop.strip() if crop else None

    # 1. Serve from cache if we have a fresh one — saves Gemini quota.
    cached = _get_cached(db, disease, crop, lang)
    if cached:
        return AdvisoryResponse(disease=disease, crop=crop, lang=lang, advisory_text=cached.advisory_text, source="cache")

    # 2. Try Gemini.
    model = _get_gemini_model()
    if model is not None:
        try:
            prompt = _build_prompt(disease, crop, SUPPORTED_LANGS[lang])
            response = model.generate_content(prompt)
            text = (response.text or "").strip()
            if text:
                db.add(AdvisoryCache(disease_label=disease, crop=crop, lang=lang, advisory_text=text))
                db.commit()
                return AdvisoryResponse(disease=disease, crop=crop, lang=lang, advisory_text=text, source="gemini")
        except Exception:
            logger.exception("Gemini advisory call failed for disease=%s lang=%s", disease, lang)

    # 3. Fallback — never let this endpoint 500 during a demo.
    return AdvisoryResponse(
        disease=disease, crop=crop, lang=lang,
        advisory_text=_fallback_text(disease, lang),
        source="fallback",
    )
