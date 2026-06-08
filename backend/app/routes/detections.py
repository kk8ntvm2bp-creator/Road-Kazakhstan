import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.detection import Detection
from app.schemas.detection import DetectionOut
from app.services.detector import detect_defects
from app.services.pci import calculate_pci
from app.config import settings

router = APIRouter(prefix="/api/detections", tags=["detections"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@router.post("/upload", response_model=DetectionOut, status_code=201)
async def upload_and_detect(
    file: UploadFile = File(...),
    latitude: float = Form(43.2220),
    longitude: float = Form(76.8512),
    location_name: str = Form("Алматы"),
    region: str = Form("Алматы"),
    country: str = Form("KZ"),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not supported: {ext}")

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        detection_result = detect_defects(file_path)
    except ValueError as e:
        os.remove(file_path)
        msg = str(e)
        if msg.startswith("NOT_ROAD|"):
            parts = msg.split("|")
            reason = parts[1] if len(parts) > 1 else "Жол суреті емес"
            raise HTTPException(status_code=422, detail={"code": "NOT_ROAD", "message": reason})
        raise HTTPException(status_code=500, detail=f"Detection failed: {msg}")
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

    pci_result = calculate_pci(
        detection_result["defects"],
        detection_result["damaged_area_pct"]
    )

    detection = Detection(
        user_id=current_user.id,
        filename=unique_name,
        original_filename=file.filename,
        file_path=file_path,
        result_path=os.path.join(settings.UPLOAD_DIR, detection_result["result_filename"]),
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        region=region,
        country=country,
        defects=detection_result["defects"],
        defect_count=detection_result["defect_count"],
        damaged_area_pct=detection_result["damaged_area_pct"],
        pci_score=pci_result["pci_score"],
        pci_category=pci_result["pci_category"],
        severity=pci_result["severity"],
        notes=notes,
    )
    db.add(detection)
    db.commit()
    db.refresh(detection)
    return detection


@router.get("/", response_model=List[DetectionOut])
def list_detections(
    skip: int = 0,
    limit: int = 200,
    country: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    min_pci: Optional[float] = None,
    max_pci: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Detection).filter(Detection.user_id == current_user.id)
    if country:
        query = query.filter(Detection.country == country)
    if severity:
        query = query.filter(Detection.severity == severity)
    if search:
        from sqlalchemy import or_
        query = query.filter(or_(
            Detection.location_name.ilike(f"%{search}%"),
            Detection.region.ilike(f"%{search}%"),
            Detection.notes.ilike(f"%{search}%"),
        ))
    if min_pci is not None:
        query = query.filter(Detection.pci_score >= min_pci)
    if max_pci is not None:
        query = query.filter(Detection.pci_score <= max_pci)
    return query.order_by(Detection.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{detection_id}", response_model=DetectionOut)
def get_detection(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detection = db.query(Detection).filter(
        Detection.id == detection_id,
        Detection.user_id == current_user.id
    ).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    return detection


@router.get("/{detection_id}/image")
def get_result_image(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detection = db.query(Detection).filter(
        Detection.id == detection_id,
        Detection.user_id == current_user.id
    ).first()
    if not detection or not detection.result_path:
        raise HTTPException(status_code=404, detail="Result image not found")
    return FileResponse(detection.result_path, media_type="image/jpeg")


@router.delete("/{detection_id}", status_code=204)
def delete_detection(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detection = db.query(Detection).filter(
        Detection.id == detection_id,
        Detection.user_id == current_user.id
    ).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    for path in [detection.file_path, detection.result_path]:
        if path and os.path.exists(path):
            os.remove(path)
    db.delete(detection)
    db.commit()
