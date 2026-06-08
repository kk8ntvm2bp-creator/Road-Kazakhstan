from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
import io
from app.database import get_db
from app.auth import get_current_user
from app.models.user import User
from app.models.detection import Detection
from app.services.export import generate_pdf_report, generate_csv_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/pdf/{detection_id}")
def download_pdf(
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

    pdf_bytes = generate_pdf_report(detection)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{detection_id}.pdf"'},
    )


@router.get("/csv")
def download_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detections = (
        db.query(Detection)
        .filter(Detection.user_id == current_user.id)
        .order_by(Detection.created_at.desc())
        .all()
    )
    csv_content = generate_csv_report(detections)
    return Response(
        content=csv_content.encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="roadscan_report.csv"'},
    )
