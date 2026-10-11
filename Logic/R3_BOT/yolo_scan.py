"""Bridge the robot mission simulator to the R3-YOLO sample-image results."""

import json
import random
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
YOLO_ROOT = REPO_ROOT / "Logic" / "R3-YOLO"
IMAGE_DIR = YOLO_ROOT / "images"
REPORT_PATH = YOLO_ROOT / "results" / "detections.json"
DETECT_SCRIPT = YOLO_ROOT / "detect.py"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
REFERENCE_IMAGE = "b1obj.jpeg"


def refresh_detection_reports() -> None:
    """Run the existing detector when a caller explicitly requests fresh inference."""
    result = subprocess.run(
        [sys.executable, str(DETECT_SCRIPT)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip() or "R3-YOLO inference failed"
        raise RuntimeError(message)


def load_detection_reports(refresh: bool = False) -> list[dict]:
    """Load YOLO reports and verify that they cover the incorporated sample folder."""
    if refresh:
        refresh_detection_reports()
    if not REPORT_PATH.is_file():
        raise RuntimeError(f"R3-YOLO report is missing: {REPORT_PATH}")

    reports = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    if not isinstance(reports, list) or not reports:
        raise RuntimeError("R3-YOLO report does not contain any image results.")

    report_images = {report.get("image") for report in reports}
    sample_images = {
        image.relative_to(IMAGE_DIR).as_posix()
        for image in IMAGE_DIR.rglob("*")
        if image.is_file() and image.suffix.lower() in IMAGE_EXTENSIONS
    }
    missing = sorted(sample_images - report_images)
    if missing:
        raise RuntimeError(
            "R3-YOLO results are stale; run Logic/R3-YOLO/detect.py. "
            f"Missing reports for: {', '.join(missing)}"
        )
    return reports


def sample_image_scans(count: int | None = None, *, refresh: bool = False, rng=random) -> list[dict]:
    """Shuffle unique mission samples and return one true/false scan per image.

    The reference bottle is calibration input, not a mission camera frame.
    Requested counts are capped at the number of unique mission samples.
    """
    pool = [
        report for report in load_detection_reports(refresh=refresh)
        if report.get("image") != REFERENCE_IMAGE
    ]
    rng.shuffle(pool)
    selected = pool if count is None else pool[:max(0, min(count, len(pool)))]

    scans = []
    for index, report in enumerate(selected, start=1):
        detections = report.get("detections") or []
        test_label = report.get("test_label") or {}
        expected_count = test_label.get("expected_count")
        best_confidence = max(
            (float(detection.get("confidence", 0)) for detection in detections),
            default=None,
        )
        labels = sorted({str(detection.get("label", "unknown")) for detection in detections})
        scans.append({
            "candidateIndex": index,
            "image": report.get("image"),
            "trashDetected": bool(detections),
            "detectedCount": len(detections),
            "labels": labels,
            "confidence": best_confidence,
            "modelId": report.get("model_id"),
            "knownTrash": expected_count > 0 if isinstance(expected_count, int) else None,
            "expectedCount": expected_count,
            "expectedKind": test_label.get("expected_kind"),
        })
    return scans
