from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String)
    file_path = Column(String, nullable=False)
    result_path = Column(String)

    # Location
    latitude = Column(Float, default=43.2220)
    longitude = Column(Float, default=76.8512)
    location_name = Column(String, default="Алматы")
    region = Column(String, default="Алматы")
    country = Column(String, default="KZ")

    # Detection results
    defects = Column(JSON, default=list)
    defect_count = Column(Integer, default=0)
    pci_score = Column(Float, default=100.0)
    pci_category = Column(String, default="Excellent")
    severity = Column(String, default="Low")
    road_length_m = Column(Float, default=100.0)
    damaged_area_pct = Column(Float, default=0.0)

    status = Column(String, default="completed")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="detections")
