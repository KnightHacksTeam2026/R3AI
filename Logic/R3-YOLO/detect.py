"""R3-YOLO: YOLO26n batch detection with reference-bottle scale estimates.

Put an 8-inch bottle in images/b1obj.jpeg, then run: python detect.py
Physical estimates assume the same camera scale and object depth across photos.
YOLO boxes measure 2D projections, not true 3D physical dimensions.
"""
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from huggingface_hub import hf_hub_download
from PIL import Image
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
IMAGE_DIR = ROOT / "images"
RESULTS_DIR = ROOT / "results"
ANNOTATED_DIR = RESULTS_DIR / "annotated"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

MODEL_REPO = "Ultralytics/YOLO26"
MODEL_FILE = "yolo26n.pt"
CONFIDENCE_THRESHOLD = 0.25
TARGET_CLASSES = {"bottle", "cup"}

# Use an image with ONE known 8-inch bottle, photographed in the same setup.
REFERENCE_IMAGE = "b1obj.jpeg"
REFERENCE_LENGTH_CM = 20.32  # 8 inches * 2.54 cm/in

TEST_LABELS = {"b": "bottle", "c": "can", "l": "lunchbox", "i": "lunchbox", "p": "plastic_object"}


def expected_from_filename(stem: str) -> dict:
    named = re.fullmatch(r"([bclip])(\d+)obj", stem, re.IGNORECASE)
    if named:
        prefix, amount = named.groups()
        return {"expected_count": int(amount), "expected_kind": TEST_LABELS[prefix.lower()]}
    counted = re.fullmatch(r"(\d+)obj", stem, re.IGNORECASE)
    if counted:
        return {"expected_count": int(counted.group(1)), "expected_kind": "unspecified"}
    return {"expected_count": None, "expected_kind": "unlabeled"}


def extract_detections(prediction) -> list[dict]:
    image_h, image_w = prediction.orig_shape
    detections = []
    for idx, box in enumerate(prediction.boxes, start=1):
        x1, y1, x2, y2 = map(float, box.xyxy[0].tolist())
        width_px = max(0.0, x2 - x1)
        height_px = max(0.0, y2 - y1)
        detections.append({
            "detection_index": idx,
            "label": prediction.names[int(box.cls.item())],
            "confidence": round(float(box.conf.item()), 4),
            "bbox_xyxy_px": [round(v, 2) for v in (x1, y1, x2, y2)],
            "bbox_width_px": round(width_px, 2),
            "bbox_height_px": round(height_px, 2),
            "bbox_area_fraction": round(width_px * height_px / (image_w * image_h), 5),
            "waste_status": "needs_review",
        })
    return detections


def main():
    if not IMAGE_DIR.is_dir():
        raise SystemExit(f"Create {IMAGE_DIR} and put your images there.")
    images = sorted(p for p in IMAGE_DIR.rglob("*")
                    if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS)
    if not images:
        raise SystemExit(f"No images found inside {IMAGE_DIR}.")

    weights = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILE)
    model = YOLO(weights)
    eligible_class_ids = [int(i) for i, name in model.names.items() if name in TARGET_CLASSES]
    if not eligible_class_ids:
        raise SystemExit(f"None of {TARGET_CLASSES} appears in model.names")

    # First, get the reference bottle's bounding-box length in original image pixels.
    reference_path = IMAGE_DIR / REFERENCE_IMAGE
    if not reference_path.is_file():
        raise SystemExit(f"Reference photo missing: {reference_path}")
    reference_result = model.predict(source=str(reference_path), conf=CONFIDENCE_THRESHOLD,
                                     classes=eligible_class_ids, verbose=False)[0]
    reference_bottles = [d for d in extract_detections(reference_result) if d["label"] == "bottle"]
    if len(reference_bottles) != 1:
        raise SystemExit(
            f"Expected exactly one detected bottle in {REFERENCE_IMAGE}; found {len(reference_bottles)}. "
            "Use a clear single-bottle reference photo and try again."
        )
    reference = reference_bottles[0]
    reference_axis_px = max(reference["bbox_width_px"], reference["bbox_height_px"])
    if reference_axis_px <= 0:
        raise SystemExit("Reference detection has invalid bounding-box dimensions")
    pixels_per_cm = reference_axis_px / REFERENCE_LENGTH_CM
    print(f"Calibration: {reference_axis_px:.1f} px / {REFERENCE_LENGTH_CM:.2f} cm"
          f" = {pixels_per_cm:.2f} px/cm")
    print("WARNING: These are projected 2D estimates, not verified physical dimensions.")
    print("Other images must have comparable camera distance, angle, and resolution.\n")

    ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)
    reports, rows = [], []
    for image in images:
        prediction = model.predict(source=str(image), conf=CONFIDENCE_THRESHOLD,
                                   classes=eligible_class_ids, verbose=False)[0]
        image_h, image_w = prediction.orig_shape
        rel = image.relative_to(IMAGE_DIR)
        detections = extract_detections(prediction)
        for d in detections:
            width_cm = d["bbox_width_px"] / pixels_per_cm
            height_cm = d["bbox_height_px"] / pixels_per_cm
            long_cm = max(width_cm, height_cm)
            short_cm = min(width_cm, height_cm)
            d.update({
                "bbox_width_cm_est": round(width_cm, 2),
                "bbox_height_cm_est": round(height_cm, 2),
                "bbox_long_axis_cm_est": round(long_cm, 2),
                "bbox_short_axis_cm_est": round(short_cm, 2),
                "bbox_long_axis_m_est": round(long_cm / 100, 4),
                "bbox_short_axis_m_est": round(short_cm / 100, 4),
                "length_m": None,  # Physical 3D length is not measured.
                "width_m": None,
                "mass_kg": None,
                "size_method": "reference_bottle_2d_bbox_scale_estimate",
            })
            rows.append({"image": rel.as_posix(), **{
                **d, "bbox_xyxy_px": json.dumps(d["bbox_xyxy_px"])
            }})
        destination = (ANNOTATED_DIR / rel).with_suffix(".png")
        destination.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(prediction.plot()[..., ::-1]).save(destination)
        reports.append({
            "image": rel.as_posix(),
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "model_id": f"{MODEL_REPO}/{MODEL_FILE}",
            "image_width_px": image_w,
            "image_height_px": image_h,
            "calibration": {
                "reference_image": REFERENCE_IMAGE,
                "reference_length_cm": REFERENCE_LENGTH_CM,
                "reference_box_long_axis_px": reference_axis_px,
                "pixels_per_cm": round(pixels_per_cm, 4),
                "verified_for_this_image": False,
            },
            "test_label": expected_from_filename(image.stem),
            "detected_count": len(detections),
            "detections": detections,
        })
        print(f"{rel}: {len(detections)} bottle/cup detections")

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    (RESULTS_DIR / "detections.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
    fields = ["image", "detection_index", "label", "confidence", "bbox_xyxy_px",
              "bbox_width_px", "bbox_height_px", "bbox_area_fraction",
              "bbox_width_cm_est", "bbox_height_cm_est", "bbox_long_axis_cm_est",
              "bbox_short_axis_cm_est", "bbox_long_axis_m_est", "bbox_short_axis_m_est",
              "length_m", "width_m", "mass_kg", "size_method", "waste_status"]
    with (RESULTS_DIR / "detections.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"\nProcessed {len(images)} images. Reports saved to {RESULTS_DIR}")


if __name__ == "__main__":
    main()
