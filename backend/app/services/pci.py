"""
Pavement Condition Index (PCI) calculation.
Standard ASTM D6433 methodology.
PCI: 0 (failed) — 100 (excellent)
"""
from typing import List, Dict, Any

# Deduct value weights per defect type and severity
DEDUCT_TABLE = {
    "pothole": {
        "Low":    15,
        "Medium": 35,
        "High":   55,
    },
    "alligator_crack": {
        "Low":    10,
        "Medium": 25,
        "High":   45,
    },
    "longitudinal_crack": {
        "Low":    5,
        "Medium": 12,
        "High":   22,
    },
    "transverse_crack": {
        "Low":    4,
        "Medium": 10,
        "High":   18,
    },
    "rutting": {
        "Low":    6,
        "Medium": 14,
        "High":   28,
    },
    "raveling": {
        "Low":    3,
        "Medium": 8,
        "High":   16,
    },
}

PCI_CATEGORIES = [
    (85, 100, "Excellent",     "Өте жақсы"),
    (70,  85, "Good",          "Жақсы"),
    (55,  70, "Satisfactory",  "Қанағаттанарлық"),
    (40,  55, "Fair",          "Орташа"),
    (25,  40, "Poor",          "Нашар"),
    (10,  25, "Very Poor",     "Өте нашар"),
    (0,   10, "Failed",        "Апатты"),
]


def calculate_pci(defects: List[Dict[str, Any]], damaged_area_pct: float) -> Dict[str, Any]:
    if not defects:
        return {
            "pci_score": 100.0,
            "pci_category": "Excellent",
            "pci_category_kz": "Өте жақсы",
            "severity": "Low",
            "deduct_values": [],
            "total_deduct": 0.0,
        }

    deduct_values = []
    for defect in defects:
        dtype = defect.get("type", "raveling")
        dseverity = defect.get("severity", "Low")
        area_pct = defect.get("area_pct", 0.0)

        base_deduct = DEDUCT_TABLE.get(dtype, DEDUCT_TABLE["raveling"]).get(dseverity, 5)
        # Scale by area: minimum 0.4 weight, reaches 1.0 at ~10% area coverage
        weight = min(1.0, area_pct / 10.0 + 0.4)
        deduct_values.append(round(base_deduct * weight, 2))

    # Corrected Deduct Value (CDV) — ASTM simplified approach
    deduct_values.sort(reverse=True)
    if len(deduct_values) > 1:
        # Only deducts > 2 are considered
        q = sum(1 for d in deduct_values if d > 2)
        total_deduct = deduct_values[0] + sum(d * (0.9 ** i) for i, d in enumerate(deduct_values[1:]))
    else:
        q = 1
        total_deduct = deduct_values[0] if deduct_values else 0

    # Area penalty: heavier penalty for widespread damage
    area_penalty = min(25.0, damaged_area_pct * 0.5)
    total_deduct = min(100.0, total_deduct + area_penalty)

    pci_score = max(0.0, round(100.0 - total_deduct, 1))

    category = "Failed"
    category_kz = "Апатты"
    for lo, hi, cat, cat_kz in PCI_CATEGORIES:
        if lo <= pci_score <= hi:
            category = cat
            category_kz = cat_kz
            break

    # Overall severity
    high_count = sum(1 for d in defects if d.get("severity") == "High")
    med_count = sum(1 for d in defects if d.get("severity") == "Medium")
    if high_count >= 2 or pci_score < 40:
        severity = "High"
    elif med_count >= 2 or pci_score < 60:
        severity = "Medium"
    else:
        severity = "Low"

    return {
        "pci_score": pci_score,
        "pci_category": category,
        "pci_category_kz": category_kz,
        "severity": severity,
        "deduct_values": deduct_values,
        "total_deduct": round(total_deduct, 2),
    }


# Sample data for Kazakhstan vs Germany comparison
COMPARISON_DATA = {
    "KZ": {
        "country": "Қазақстан",
        "avg_pci": 48.3,
        "excellent_pct": 8,
        "good_pct": 17,
        "fair_pct": 29,
        "poor_pct": 31,
        "failed_pct": 15,
        "total_km": 97000,
        "maintained_km": 42890,
        "critical_segments": 1204,
        "annual_budget_usd_m": 420,
        "defect_distribution": {
            "pothole": 28,
            "alligator_crack": 22,
            "longitudinal_crack": 20,
            "transverse_crack": 15,
            "rutting": 10,
            "raveling": 5,
        }
    },
    "DE": {
        "country": "Германия",
        "avg_pci": 78.6,
        "excellent_pct": 34,
        "good_pct": 32,
        "fair_pct": 20,
        "poor_pct": 10,
        "failed_pct": 4,
        "total_km": 645000,
        "maintained_km": 598000,
        "critical_segments": 112,
        "annual_budget_usd_m": 8200,
        "defect_distribution": {
            "pothole": 8,
            "alligator_crack": 10,
            "longitudinal_crack": 30,
            "transverse_crack": 25,
            "rutting": 18,
            "raveling": 9,
        }
    }
}
