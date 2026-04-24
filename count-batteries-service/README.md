# Count Batteries Service

Python FastAPI micro-service for AI-based battery counting.  
Integrated with the Voniko-Website platform.

## Overview

- Runs on **port 8001** (separate from the battery-test service on 8765)
- Auth is delegated to the Node.js backend (`x-user-id`, `x-username`, `x-user-role` headers)
- Database: **SQLite** at `./data/count_batteries.db` (no MySQL/XAMPP needed)
- AI model: YOLOv8 exported to ONNX – place `best.onnx` in the `../models/` directory

## Setup

```bash
cd count-batteries-service
pip install -r requirements.txt
```

### ONNX model

Copy `best.onnx` (and optionally `best_fp16.onnx`) to `../models/`:

```
models/
└── best.onnx
```

Or set the env var `COUNT_BATTERIES_MODELS_DIR` to your model directory.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `COUNT_BATTERIES_PORT` | `8001` | Listening port |
| `COUNT_BATTERIES_DATA_DIR` | `./data` | SQLite DB directory |
| `COUNT_BATTERIES_STATIC_DIR` | `./static` | Result images directory |
| `COUNT_BATTERIES_MODELS_DIR` | `../models` | ONNX model directory |
| `COUNT_BATTERIES_CORS_ORIGINS` | `http://localhost:3001,...` | Allowed CORS origins |

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Or via the root `start.bat` which starts all services together.

## Accuracy Tuning Notes (Battery Tray Counting)

### 1) Runtime tuning (quick wins)

- The API still accepts `confidence` from UI (slider), and this user-selected threshold is respected in both standard and SAHI paths.
- Adaptive confidence remains as fallback when the caller does not provide a threshold.
- Post-processing duplicate suppression is tuned to reduce over-count from overlapping detections.

### 2) Image capture standardization

To stabilize counting before retraining:

- Keep camera angle fixed (top-down) and fixed tray distance.
- Use uniform lighting across the tray; avoid strong shadows on tray edges.
- Avoid motion blur; keep focus locked.
- Keep tray fully visible with minimal background clutter.

### 3) Retraining workflow (YOLO → ONNX)

1. Collect real production images from multiple conditions:
   - bright / low light
   - different tray batches
   - edge zones and reflective-metal backgrounds
2. Label consistently for every battery center/object, especially edge and dark zones.
3. Split train/val/test by capture sessions/shifts (to reduce overfit).
4. Train YOLO model with updated dataset.
5. Export ONNX and replace:
   - `count-batteries-service/models/best.onnx`
6. Reload model without full restart:
   - call `POST /reload-model` (already supported)

### 4) Acceptance KPI

Validate per tray against manual ground truth:

- MAE (mean absolute error) in battery count
- error rate of trays exceeding an allowed tolerance (e.g. `>|±N|`)

Only promote the model/config when KPI meets production threshold.
