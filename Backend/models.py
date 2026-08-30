"""
SQLAlchemy models for KrishiCare.
Tables: farms, diagnoses, alerts
"""
import os
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime,
    ForeignKey, Boolean, Text
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./krishicare.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    farmer_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    village = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    primary_crop = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    diagnoses = relationship("Diagnosis", back_populates="farm")


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True)
    crop = Column(String, nullable=True)
    disease_label = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    diagnosis_type = Column(String, default="disease")  # disease / pest
    severity = Column(String, default="Unknown")  # Low/Medium/High/Critical
    image_path = Column(String, nullable=True)
    advisory_text = Column(Text, nullable=True)
    advisory_lang = Column(String, default="en")
    expert_status = Column(String, default="pending")  # pending/approved/rejected
    expert_note = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="diagnoses")

    @property
    def type(self):
        return getattr(self, "diagnosis_type", "disease") or "disease"

    @property
    def name(self):
        return self.disease_label


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    diagnosis_id = Column(Integer, ForeignKey("diagnoses.id"), nullable=True)
    source_farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True)
    target_farm_id = Column(Integer, ForeignKey("farms.id"), nullable=True)
    message = Column(String, nullable=False)
    radius_km = Column(Float, default=5.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdvisoryCache(Base):
    """Cache Gemini advisory responses by disease+crop+lang to survive rate limits."""
    __tablename__ = "advisory_cache"

    id = Column(Integer, primary_key=True, index=True)
    disease_label = Column(String, index=True, nullable=False)
    crop = Column(String, index=True, nullable=True)
    lang = Column(String, index=True, default="en")
    advisory_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE diagnoses ADD COLUMN diagnosis_type VARCHAR DEFAULT 'disease'"))
            conn.commit()
        except Exception:
            pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()