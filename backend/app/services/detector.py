"""
Road defect detection – OpenCV computer vision + ASTM D6433 PCI.
Clean rewrite: simpler pipeline, reliable false-positive rejection.
"""
import cv2
import numpy as np
import os
import uuid
from typing import List, Dict, Any
from app.config import settings

DEFECT_CLASSES = {
    "longitudinal_crack": {"label": "Бойлық жарық",   "color": (80,  120, 255)},
    "transverse_crack":   {"label": "Көлденең жарық",  "color": (80,  200, 255)},
    "alligator_crack":    {"label": "Тор жарық",        "color": (0,   60,  220)},
    "pothole":            {"label": "Шұңқыр",           "color": (160, 0,   220)},
    "rutting":            {"label": "Із қалу",           "color": (50,  160, 255)},
    "raveling":           {"label": "Тозу",              "color": (0,   180, 200)},
}
SEVERITY_COLORS = {"High": (60,60,240), "Medium": (60,160,255), "Low": (60,220,160)}


# ─────────────────────────────────────────────────────────────────────────────
# Marking mask: yellow + white lane paint only (strict thresholds)
# ─────────────────────────────────────────────────────────────────────────────
def _marking_mask(img_bgr: np.ndarray, dilation: int = 18) -> np.ndarray:
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    yellow = cv2.inRange(hsv, (15, 100, 100), (40, 255, 255))
    white  = cv2.inRange(hsv, (0,  0,   210), (180, 20,  255))
    mask   = cv2.bitwise_or(yellow, white)
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (dilation, dilation))
    return cv2.dilate(mask, k, iterations=1)


# ─────────────────────────────────────────────────────────────────────────────
# Preprocessing → binary map of candidate defect pixels
# ─────────────────────────────────────────────────────────────────────────────
def _preprocess(img_bgr: np.ndarray, marks: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # CLAHE – boost local contrast
    clahe    = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blur     = cv2.GaussianBlur(enhanced, (5, 5), 0)

    # Dark-region threshold (defects are locally darker than surroundings)
    thresh = cv2.adaptiveThreshold(
        blur, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 19, 7,
    )

    # Canny edges (find crack outlines)
    edges = cv2.Canny(blur, 25, 90)

    combined = cv2.bitwise_or(thresh, edges)

    # Remove lane markings BEFORE morphology so closing can't bridge over them
    combined = cv2.bitwise_and(combined, cv2.bitwise_not(marks))

    # Morphological cleanup
    k3 = cv2.getStructuringElement(cv2.MORPH_RECT,    (3, 3))
    k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, k3, iterations=2)
    cleaned = cv2.morphologyEx(cleaned,  cv2.MORPH_OPEN,  k3, iterations=1)
    cleaned = cv2.dilate(cleaned, k5, iterations=1)

    # Remove markings AGAIN after morphology (edges of mask can form blobs)
    cleaned = cv2.bitwise_and(cleaned, cv2.bitwise_not(marks))

    return cleaned


# ─────────────────────────────────────────────────────────────────────────────
# Detect whether image is a perspective road shot (car-level, forward-facing)
# Requires BOTH visible sky AND green vegetation in the upper region.
# Close-up pavement shots have neither.
# ─────────────────────────────────────────────────────────────────────────────
def _is_perspective(img_bgr: np.ndarray) -> bool:
    """
    Returns True if this is a forward-facing car-level road photo.
    Key signal: yellow lane markings that converge toward a vanishing point.
    Secondary signals: sky / green vegetation in the upper portion.
    Close-up pavement shots have neither sky nor converging stripes.
    """
    h, w = img_bgr.shape[:2]
    hsv  = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    # ── Signal 1: yellow lane markings (strong indicator of perspective shot) ─
    yellow = cv2.inRange(hsv, (15, 80, 80), (40, 255, 255))
    # In perspective shots the stripes run diagonally across most of the image.
    # Check if yellow pixels appear in BOTH the upper and lower halves.
    yellow_top = float(np.sum(yellow[:h//2, :] > 0))
    yellow_bot = float(np.sum(yellow[h//2:, :] > 0))
    has_stripes = yellow_top > 50 and yellow_bot > 50

    # ── Signal 2: sky / green in the upper 40 % ───────────────────────────────
    top   = img_bgr[:int(h * 0.40), :]
    hsv_t = cv2.cvtColor(top, cv2.COLOR_BGR2HSV)
    total = float(top.shape[0] * top.shape[1]) + 1
    sky   = float(np.sum(cv2.inRange(hsv_t, (90, 30, 80),  (140, 255, 255)) > 0)) / total
    green = float(np.sum(cv2.inRange(hsv_t, (33, 40, 35),  ( 88, 255, 255)) > 0)) / total

    # Perspective if: stripes in both halves AND some sky/green above
    return has_stripes and (sky > 0.03 or green > 0.04)


# ─────────────────────────────────────────────────────────────────────────────
# Classify a single contour → defect dict or None
# ─────────────────────────────────────────────────────────────────────────────
def _classify(contour, img_area: float, img_w: int, img_h: int,
              gray: np.ndarray, perspective: bool = False) -> Dict[str, Any] | None:

    area = cv2.contourArea(contour)
    if area < 120:
        return None

    x, y, w, h = cv2.boundingRect(contour)
    aspect   = w / h if h > 0 else 1.0
    area_pct = area / img_area
    if area_pct < 0.0006:
        return None

    # ── Texture check using exact contour pixels (not bounding box) ──────────
    # Real defects: dark interior → low mean  OR  mixed pixels → high std.
    # Road surface / sky: uniform medium-gray → high mean + low std → reject.
    h_g, w_g = gray.shape[:2]
    mask_cnt = np.zeros((h_g, w_g), dtype=np.uint8)
    cv2.drawContours(mask_cnt, [contour], -1, 255, cv2.FILLED)
    pixels = gray[mask_cnt > 0]

    if pixels.size > 50:
        px_mean = float(np.mean(pixels))
        px_std  = float(np.std(pixels))

        if perspective:
            # Perspective shots: CLAHE amplifies asphalt grain → std rises to ~15-22.
            # Real defects have dark + light mixed pixels → std > 28.
            if px_std < 28:
                return None
            if area_pct > 0.01 and px_mean > 95:
                return None
        else:
            # Close-up shots: reject any large UNIFORM region — whether dark
            # (smooth asphalt path) or bright (sky/concrete).
            # Real defects always have high internal variance (crack edges + asphalt mix).
            if area_pct > 0.03 and px_std < 16:
                return None

    # ── Shape metrics ────────────────────────────────────────────────────────
    hull      = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    solidity  = area / hull_area if hull_area > 0 else 0

    perim       = cv2.arcLength(contour, True)
    circularity = (4 * np.pi * area / (perim * perim)) if perim > 0 else 0

    # ── Classification ────────────────────────────────────────────────────────
    #
    # POTHOLE      – compact, roughly circular blob
    # ALLIGATOR    – large area with complex perimeter (low circularity)
    # LONG. CRACK  – very elongated horizontal
    # TRANS. CRACK – very elongated vertical
    # RUTTING      – moderate aspect, medium area
    # RAVELING     – everything else

    if area_pct > 0.015 and solidity > 0.50 and circularity > 0.10:
        dtype = "pothole"
        sev   = "High" if area_pct > 0.04 else "Medium"

    elif area_pct > 0.005 and (solidity < 0.60 or circularity < 0.10):
        dtype = "alligator_crack"
        sev   = "High" if area_pct > 0.015 else "Medium"

    elif aspect > 4.0 and area_pct > 0.0008:
        dtype = "longitudinal_crack"
        sev   = "Medium" if area_pct > 0.003 else "Low"

    elif aspect < 0.25 and area_pct > 0.0008:
        dtype = "transverse_crack"
        sev   = "Medium" if area_pct > 0.003 else "Low"

    elif area_pct > 0.003 and 0.35 < aspect < 3.5:
        dtype = "rutting"
        sev   = "Medium" if area_pct > 0.006 else "Low"

    else:
        dtype = "raveling"
        sev   = "Low"

    confidence = min(0.93, 0.55 + area_pct * 5 + (0.07 if solidity > 0.55 else 0))

    return {
        "type":       dtype,
        "label":      DEFECT_CLASSES[dtype]["label"],
        "confidence": round(confidence, 3),
        "severity":   sev,
        "bbox":       [float(x), float(y), float(x+w), float(y+h)],
        "area_pct":   round(area_pct * 100, 3),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Merge overlapping/nearby detections of the same type
# ─────────────────────────────────────────────────────────────────────────────
def _merge(defects: List[Dict], thr: float = 40.0) -> List[Dict]:
    if not defects:
        return defects
    merged = [defects[0]]
    for d in defects[1:]:
        cx = (d["bbox"][0] + d["bbox"][2]) / 2
        cy = (d["bbox"][1] + d["bbox"][3]) / 2
        dup = False
        for m in merged:
            mx = (m["bbox"][0] + m["bbox"][2]) / 2
            my = (m["bbox"][1] + m["bbox"][3]) / 2
            if abs(cx - mx) < thr and abs(cy - my) < thr:
                if d["confidence"] > m["confidence"]:
                    m.update(d)
                dup = True
                break
        if not dup:
            merged.append(d)
    return merged


# ─────────────────────────────────────────────────────────────────────────────
# Drawing
# ─────────────────────────────────────────────────────────────────────────────
def _get_font(size: int):
    from PIL import ImageFont
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                from PIL import ImageFont
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    from PIL import ImageFont
    return ImageFont.load_default()


def _draw(img_bgr: np.ndarray, defects: List[Dict]) -> np.ndarray:
    from PIL import Image, ImageDraw
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil     = Image.fromarray(img_rgb)
    draw    = ImageDraw.Draw(pil)
    h, w    = img_bgr.shape[:2]
    fsz     = max(13, min(18, w // 60))
    font    = _get_font(fsz)
    font_wm = _get_font(max(11, fsz - 3))

    for d in defects:
        x1, y1, x2, y2 = [int(v) for v in d["bbox"]]
        c_bgr  = DEFECT_CLASSES.get(d["type"], {}).get("color", (100, 100, 255))
        s_bgr  = SEVERITY_COLORS.get(d["severity"], (100, 200, 100))
        color  = (c_bgr[2], c_bgr[1], c_bgr[0])
        sev_c  = (s_bgr[2], s_bgr[1], s_bgr[0])

        draw.rectangle([x1, y1, x2, y2], outline=color, width=2)

        corner = min(14, (x2-x1)//4, (y2-y1)//4)
        for cx, cy, dx, dy in [(x1,y1,1,1),(x2,y1,-1,1),(x1,y2,1,-1),(x2,y2,-1,-1)]:
            draw.line([(cx,cy),(cx+dx*corner,cy)], fill=sev_c, width=3)
            draw.line([(cx,cy),(cx,cy+dy*corner)], fill=sev_c, width=3)

        label  = f"{d['label']}  {d['confidence']:.0%}"
        bb     = font.getbbox(label) if hasattr(font, 'getbbox') else (0,0,len(label)*fsz//2,fsz)
        tw, th = bb[2]-bb[0], bb[3]-bb[1]
        lx = max(0, x1)
        ly = max(th+8, y1)
        draw.rectangle([lx, ly-th-8, lx+tw+10, ly], fill=color)
        draw.text((lx+5, ly-th-5), label, font=font, fill=(255,255,255))

    wm    = "RoadScan Kazakhstan"
    wm_bb = font_wm.getbbox(wm) if hasattr(font_wm, 'getbbox') else (0,0,160,14)
    draw.text((w-(wm_bb[2]-wm_bb[0])-8, h-22), wm, font=font_wm, fill=(200,200,200))

    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)


# ─────────────────────────────────────────────────────────────────────────────
# Road validation
# ─────────────────────────────────────────────────────────────────────────────
def check_is_road(img_bgr: np.ndarray) -> tuple:
    h, w  = img_bgr.shape[:2]
    roi   = img_bgr[int(h*0.4):, :]
    hsv   = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    total = float(roi.shape[0] * roi.shape[1])

    road_ratio     = float(np.sum(cv2.inRange(hsv,(0,0,15),(180,55,210)) > 0)) / total
    sky_ratio      = float(np.sum(cv2.inRange(hsv,(85,60,100),(145,255,255)) > 0)) / total
    colorful_ratio = float(np.sum(cv2.inRange(hsv,(0,80,80),(180,255,255)) > 0)) / total
    bright_ratio   = float(np.sum(cv2.inRange(hsv,(0,0,215),(180,255,255)) > 0)) / total

    score   = road_ratio - 0.6*colorful_ratio - 0.5*sky_ratio - 0.4*bright_ratio
    is_road = (score > 0.05) and (road_ratio > 0.25)

    if is_road:
        reason = "Жол беткейі анықталды"
    elif bright_ratio > 0.45:
        reason = "Сурет тым жарық — жол емес"
    elif sky_ratio > 0.30:
        reason = "Суретте аспан көп — жол фотосы емес"
    elif colorful_ratio > 0.50:
        reason = "Суретте жол асфальты жоқ"
    else:
        reason = "Жол беткейі анықталмады — асфальт суретін жүктеңіз"

    return is_road, round(max(0.0, min(1.0, score+0.5)), 2), reason


# ─────────────────────────────────────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────────────────────────────────────
def detect_defects(image_path: str) -> Dict[str, Any]:
    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        raise ValueError(f"Cannot read image: {image_path}")

    # Resize to max 1920 px wide
    h, w = img_bgr.shape[:2]
    if w > 1920:
        scale   = 1920 / w
        img_bgr = cv2.resize(img_bgr, (1920, int(h*scale)))
        h, w    = img_bgr.shape[:2]

    # Road check
    is_road, road_conf, road_reason = check_is_road(img_bgr)
    if not is_road:
        raise ValueError(f"NOT_ROAD|{road_reason}|{road_conf}")

    img_area = float(h * w)
    gray_img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # ── Perspective detection ──────────────────────────────────────────────
    # A forward-facing car shot has BOTH sky AND green vegetation in the
    # upper portion.  Close-up pothole/crack shots have neither.
    perspective = _is_perspective(img_bgr)

    # ── Lane marking mask ──────────────────────────────────────────────────
    # For perspective shots use a much wider dilation (90 px) to kill
    # edge-of-mask artifacts that form near the converging stripe boundaries.
    dilation = 90 if perspective else 18
    marks    = _marking_mask(img_bgr, dilation)

    # ── Binary defect map ──────────────────────────────────────────────────
    cleaned = _preprocess(img_bgr, marks)

    # For perspective shots suppress the upper half (sky, vanishing-point
    # stripe edges, grass-road boundary – all create false contours there).
    if perspective:
        cleaned[:int(h * 0.50), :] = 0

    # ── Contour detection & classification ────────────────────────────────
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    defects = []
    for cnt in contours:
        r = _classify(cnt, img_area, w, h, gray_img, perspective)
        if r:
            defects.append(r)

    defects = _merge(defects, thr=45.0)
    defects = sorted(defects, key=lambda d: (-d["confidence"], -d["area_pct"]))[:20]

    result_img      = _draw(img_bgr, defects)
    result_filename = f"result_{uuid.uuid4().hex[:10]}.jpg"
    result_path     = os.path.join(settings.UPLOAD_DIR, result_filename)
    cv2.imwrite(result_path, result_img, [cv2.IMWRITE_JPEG_QUALITY, 90])

    total_damaged = sum(d["area_pct"] for d in defects)

    return {
        "defects":         defects,
        "defect_count":    len(defects),
        "damaged_area_pct": round(min(total_damaged, 100.0), 2),
        "result_filename": result_filename,
        "image_size":      {"width": w, "height": h},
    }
