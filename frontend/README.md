# R3AI — Frontend

**Recognize. Recover. Restore.**

This folder contains the frontend for **R3AI**, an AI-powered environmental cleanup hackathon project.

We're building a website that visualizes waste detection, simulated robot cleanup operations, and environmental progress.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- MapLibre (planned for interactive maps)

## Pages

- **`/`** — Landing page
- **`/command`** — Interactive cleanup dashboard
- **`/go`** — Mobile-friendly cleanup interface

## Getting Started

Make sure you have Node.js and npm installed.

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## Multi-load collection simulation

The command dashboard calls `/api/command/scan`, which runs
[mission_scan.py](../Logic/R3_BOT/mission_scan.py). Set `PYTHON` to the Python
executable if it is not on PATH (Python 3.10+ is required).

A scan generates trash once. The backend precomputes successive loads using
`Robot.planCollectionRuns`: `reset`, `storeItems(remaining)`, then OSRM `getPath`
from the same base for each load. Items excluded from one load are retried in
an empty robot. When no item fits, the remainder is returned as
`humanRequiredItemIds`, not silently discarded or retried forever.

The UI plays each load in order, keeps collected markers across loads, and
resets the payload to zero at base between loads. Return/unloading is instantaneous
and not animated. New trash is requested only after the final load completes.
The `DemoState.humanRequiredItems` list retains human-required records across
scans for the current page session; it is not persisted after a reload.
An all-impossible scan waits for Reset rather than continuously requesting new scans.
Each load plays in 40 seconds; simulated battery use is 18% across the entire scan.

Routing still uses OSRM for **pickup order**. Displayed connections are straight-line
previews, not road geometry, and the scan is synthetic rather than a street sweep.
Packing retains the existing simplified x/y subtraction model with a fixed height
limit, not general rectangle packing.

Regression checks (no live OSRM requests):

```powershell
# From the repository root
python -B -m unittest Logic.R3_BOT.test_collection_runs -v
# From frontend
node --test tests\collection-runs.test.cjs
```

## Current Goals

- [ ] Build the landing page
- [ ] Create the interactive map dashboard
- [ ] Display waste detection results
- [ ] Connect the Python backend
- [ ] Show robot movement and cleanup progress
- [ ] Build the mobile interface

## Project Status

🚧 **Work in progress — Hackathon prototype**

The frontend is currently under development. Robot operations and satellite communication will be simulated for the demo.

---

**R3AI | Recognize. Recover. Restore.**