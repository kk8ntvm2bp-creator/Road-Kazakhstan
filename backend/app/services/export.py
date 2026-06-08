"""PDF and CSV export service."""
import io
import csv
from typing import List
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_pdf_report(detection) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"],
                                 fontSize=18, textColor=colors.HexColor("#1a3a5c"),
                                 alignment=TA_CENTER, spaceAfter=6)
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"],
                                    fontSize=11, textColor=colors.grey,
                                    alignment=TA_CENTER, spaceAfter=20)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"],
                                   fontSize=13, textColor=colors.HexColor("#1a3a5c"),
                                   spaceBefore=14, spaceAfter=6)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, spaceAfter=4)

    story = []

    # Header
    story.append(Paragraph("RoadScan Kazakhstan", title_style))
    story.append(Paragraph("Жол жамылғысының күйі туралы есеп", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a3a5c")))
    story.append(Spacer(1, 12))

    # Detection info
    story.append(Paragraph("Анализ туралы ақпарат", section_style))
    info_data = [
        ["Жасалған уақыты:", detection.created_at.strftime("%Y-%m-%d %H:%M")],
        ["Орналасуы:", f"{detection.location_name}, {detection.region}"],
        ["Координаттар:", f"{detection.latitude:.4f}, {detection.longitude:.4f}"],
        ["Файл:", detection.original_filename or detection.filename],
    ]
    info_table = Table(info_data, colWidths=[5*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#1a3a5c")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 12))

    # PCI section
    story.append(Paragraph("PCI Бағасы (Жол сапасының индексі)", section_style))

    pci_color = colors.HexColor(
        "#27ae60" if detection.pci_score >= 70 else
        "#f39c12" if detection.pci_score >= 40 else "#e74c3c"
    )
    pci_data = [
        ["PCI Балл", "Санат", "Зақымдалған аудан", "Ауырлық дәрежесі"],
        [
            f"{detection.pci_score:.1f} / 100",
            detection.pci_category,
            f"{detection.damaged_area_pct:.1f}%",
            detection.severity,
        ]
    ]
    pci_table = Table(pci_data, colWidths=[4.5*cm, 4.5*cm, 4.5*cm, 3.5*cm])
    pci_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a3a5c")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f0f4f8"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(pci_table)
    story.append(Spacer(1, 12))

    # Defects table
    if detection.defects:
        story.append(Paragraph(f"Анықталған ақаулар ({detection.defect_count} дана)", section_style))
        defect_data = [["#", "Ақау түрі", "Сенімділік", "Ауырлық", "Аудан %"]]
        for i, d in enumerate(detection.defects, 1):
            defect_data.append([
                str(i),
                d.get("label", d.get("type", "Unknown")),
                f"{d.get('confidence', 0):.0%}",
                d.get("severity", "Low"),
                f"{d.get('area_pct', 0):.2f}%",
            ])
        defect_table = Table(defect_data, colWidths=[1*cm, 6.5*cm, 3.5*cm, 3.5*cm, 3*cm])
        defect_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a3a5c")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f9fafb"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(defect_table)

    # Footer
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    story.append(Paragraph(
        "RoadScan Kazakhstan | Диплом жобасы 2026 | КазНТЗУ",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.grey, alignment=TA_CENTER, spaceBefore=8)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


def generate_csv_report(detections: List) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Date", "Location", "Region", "Country",
        "Latitude", "Longitude", "PCI Score", "PCI Category",
        "Defect Count", "Damaged Area %", "Severity", "Filename"
    ])
    for d in detections:
        writer.writerow([
            d.id,
            d.created_at.strftime("%Y-%m-%d %H:%M"),
            d.location_name,
            d.region,
            d.country,
            d.latitude,
            d.longitude,
            d.pci_score,
            d.pci_category,
            d.defect_count,
            d.damaged_area_pct,
            d.severity,
            d.original_filename or d.filename,
        ])
    return output.getvalue()
