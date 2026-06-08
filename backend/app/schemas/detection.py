from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class DefectItem(BaseModel):
    type: str
    confidence: float
    severity: str
    bbox: List[float]
    area_pct: float


class DetectionOut(BaseModel):
    id: int
    filename: str
    original_filename: Optional[str]
    latitude: float
    longitude: float
    location_name: str
    region: str
    country: str
    defects: List[Any]
    defect_count: int
    pci_score: float
    pci_category: str
    severity: str
    damaged_area_pct: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class DetectionCreate(BaseModel):
    latitude: Optional[float] = 43.2220
    longitude: Optional[float] = 76.8512
    location_name: Optional[str] = "Алматы"
    region: Optional[str] = "Алматы"
    country: Optional[str] = "KZ"
    notes: Optional[str] = None
