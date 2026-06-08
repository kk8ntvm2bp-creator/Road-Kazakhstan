from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.detection import Detection
from app.services.pci import COMPARISON_DATA

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/dashboard")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = db.query(func.count(Detection.id)).filter(Detection.user_id == current_user.id).scalar() or 0
    avg_pci = db.query(func.avg(Detection.pci_score)).filter(Detection.user_id == current_user.id).scalar()
    critical = db.query(func.count(Detection.id)).filter(
        Detection.user_id == current_user.id,
        Detection.severity == "High"
    ).scalar() or 0
    total_defects = db.query(func.sum(Detection.defect_count)).filter(
        Detection.user_id == current_user.id
    ).scalar() or 0

    recent = (
        db.query(Detection)
        .filter(Detection.user_id == current_user.id)
        .order_by(Detection.created_at.desc())
        .limit(10)
        .all()
    )

    pci_distribution = {
        "Excellent": db.query(func.count(Detection.id)).filter(
            Detection.user_id == current_user.id, Detection.pci_score >= 85).scalar() or 0,
        "Good": db.query(func.count(Detection.id)).filter(
            Detection.user_id == current_user.id,
            Detection.pci_score >= 70, Detection.pci_score < 85).scalar() or 0,
        "Satisfactory": db.query(func.count(Detection.id)).filter(
            Detection.user_id == current_user.id,
            Detection.pci_score >= 55, Detection.pci_score < 70).scalar() or 0,
        "Fair": db.query(func.count(Detection.id)).filter(
            Detection.user_id == current_user.id,
            Detection.pci_score >= 40, Detection.pci_score < 55).scalar() or 0,
        "Poor": db.query(func.count(Detection.id)).filter(
            Detection.user_id == current_user.id,
            Detection.pci_score >= 25, Detection.pci_score < 40).scalar() or 0,
        "Failed": db.query(func.count(Detection.id)).filter(
            Detection.user_id == current_user.id, Detection.pci_score < 25).scalar() or 0,
    }

    return {
        "total_scans": total,
        "avg_pci": round(float(avg_pci), 1) if avg_pci else 0,
        "critical_alerts": critical,
        "total_defects": int(total_defects),
        "pci_distribution": pci_distribution,
        "recent_detections": [
            {
                "id": d.id,
                "location_name": d.location_name,
                "pci_score": d.pci_score,
                "pci_category": d.pci_category,
                "severity": d.severity,
                "defect_count": d.defect_count,
                "created_at": d.created_at.isoformat(),
                "latitude": d.latitude,
                "longitude": d.longitude,
            }
            for d in recent
        ],
    }


@router.get("/comparison")
def country_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return COMPARISON_DATA


@router.get("/trend")
def pci_trend(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detections = (
        db.query(Detection)
        .filter(Detection.user_id == current_user.id)
        .order_by(Detection.created_at.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "date": d.created_at.strftime("%d.%m"),
            "pci": d.pci_score,
            "location": d.location_name,
            "severity": d.severity,
        }
        for d in detections
    ]


@router.get("/map-data")
def map_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detections = (
        db.query(Detection)
        .filter(Detection.user_id == current_user.id)
        .all()
    )
    return [
        {
            "id": d.id,
            "latitude": d.latitude,
            "longitude": d.longitude,
            "location_name": d.location_name,
            "pci_score": d.pci_score,
            "pci_category": d.pci_category,
            "severity": d.severity,
            "defect_count": d.defect_count,
            "created_at": d.created_at.isoformat(),
        }
        for d in detections
    ]
