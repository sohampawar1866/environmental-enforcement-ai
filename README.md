# Environmental Enforcement AI — Local Prototype

A local-first prototype that analyzes a fixed-camera video, tracks the model's `person` and `trash` detections, creates conservative review candidates with evidence, and presents them in a local browser UI. All detections remain human-review candidates. This software does not issue penalties or establish legal responsibility.

The detector is the audited Baraa YOLO11m checkpoint. It was previously loaded and smoke-tested on CPU. Event attribution here is a new, provisional geometric heuristic and has **not** been validated on staged event footage. Use staged videos labelled as simulated CCTV.

## Requirements

- Python 3.11–3.13 (the audit used Python 3.13.5, macOS ARM64 CPU)
- Node.js 20+
- Git and network access for dependencies and the checkpoint

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
uv sync --extra dev
cp .env.example .env
python scripts/download_model.py
cd frontend && npm install && cd ..
```

The downloader verifies the checkpoint's expected 40,498,732-byte size and SHA-256. Model weights, videos, database, and evidence are ignored by Git.

## Run a video

```bash
uv run environmental-enforcement /path/to/staged-clip.mp4 --camera-id CAM-01 --zone 'Simulated Beach Zone'
```

The command writes an annotated MP4 to `outputs/`, candidate incident records to the SQLite database, and evidence frames/clips under `evidence/`. It prints processed frames, detection count, unique track count, candidate count, elapsed seconds, and processing FPS. It requires the audited checkpoint; a missing or fingerprint-mismatched file fails before inference.

## Start the local review app

In separate terminals:

```bash
uv run uvicorn app.main:app --app-dir backend --reload
```

```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). API docs are at `http://127.0.0.1:8000/docs`.

## Checks

```bash
uv run pytest
cd frontend && npm run build
```

The included tests exercise startup calibration, event-state transitions, owner-return cancellation, and incident review persistence. They do not establish detector accuracy, reliable identity attribution on footage, or end-to-end validation. No staged clips are currently in this repository.

## Current event logic limits

The first two seconds of a clip are used to mark visible trash tracks as pre-existing. The event tracker then requires a unique geometric person/object association sustained for three frames, subsequent separation, object stationarity, and the provisional owner track leaving the frame. A return before video processing finishes cancels the candidate. This association is provisional: no pose/hand model is used. Litter entering later, occlusion, ID switches, lighting, perspective, or motion can produce missed events or false candidates. Inspect the timeline and evidence before any review decision.

See [AUDIT.md](AUDIT.md) for candidate findings and [THIRD_PARTY.md](THIRD_PARTY.md) for provenance and license notes.
