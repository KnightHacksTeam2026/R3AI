# R3AI

**Recognize. Recover. Restore.**

R3AI is a hackathon prototype for simulating an AI-assisted trash cleanup workflow: scan an area, detect waste, plan collection runs for a ground robot, and visualize cleanup progress through an interactive web experience.

The project combines three main ideas:

- **Recognize** -> identify trash in a target area using computer vision.
- **Recover** -> plan and simulate robot collection runs subject to storage, size, and weight constraints.
- **Restore** -> show the environmental impact and operational performance of cleanup missions.

## What the project is

R3AI is currently a **simulation-first system** built around a realistic mission loop:

1. A robot is assigned to a cleanup area.
2. The robot conducts a scan of the area.
3. Trash detections are interpreted by the AI pipeline.
4. Backend logic decides which items the robot can carry.
5. The system computes collection runs and pickup order.
6. The website visualizes the robot mission, route progress, capacity usage, and cleanup state.

At this stage, much of the visible mission flow is simulated for demonstration, but the repository already reflects the intended architecture: **AI detection + robot storage logic + road-constrained routing + mission visualization**.

## Core concept

R3AI is designed around an autonomous cleanup robot that does **not** simply know all trash locations in advance. Instead, the intended workflow is:

- scan a local area
- detect waste objects from imagery
- estimate pickup feasibility from dimensions and weight
- pack items into the robot using capacity-aware logic
- compute an efficient order for reachable pickups
- perform multiple runs if one load is not enough

This makes the system more than a simple map animation. It is a prototype for how perception, storage planning, and route execution could work together in a real cleanup operation.

## AI / detection pipeline

R3AI uses **YOLO26** as the image-scanning model for trash recognition, integrated through **Hugging Face**.

In the broader architecture, the AI layer is responsible for:

- scanning input imagery
- detecting waste items
- supplying object-level results to the mission pipeline
- enabling downstream planning for pickup priority and feasibility

The current repository mainly emphasizes the robot logic and frontend simulation layer, while the README reflects the intended end-to-end product direction with **YOLO26 on Hugging Face** as the recognition engine.

## Repository structure

### [`frontend/`](./frontend)
The Next.js web application that presents the product experience.

Main user-facing areas include:

- **Landing page** — project introduction and branding
- **`/command`** — mission dashboard for robot operations
- **`/go`** — mobile-oriented cleanup experience

The command dashboard visualizes:

- simulated ground robots
- road-constrained route playback
- scan and collection phases
- discovered vs. collected trash
- payload, battery, and mission progress

### [`Logic/R3_BOT/`](./Logic/R3_BOT)
Python backend logic for robot behavior and mission planning.

Key files:

- [`item.py`](./Logic/R3_BOT/item.py) — item model with dimensions, location, weight, and rotations
- [`robot.py`](./Logic/R3_BOT/robot.py) — robot storage, packing, and routing logic
- [`mission_scan.py`](./Logic/R3_BOT/mission_scan.py) — mission generation / scan output shaping
- [`test_collection_runs.py`](./Logic/R3_BOT/test_collection_runs.py) — regression tests for multi-run collection behavior

Important behaviors already implemented here include:

- item orientation handling
- robot height and weight constraints
- 2D heuristic packing for storage
- multi-load collection planning
- path ordering through `getPath(...)`

### [`Logic/R3-SAT/`](./Logic/R3-SAT)
Prototype satellite / telemetry pipeline components.

These files represent a communication concept for relaying robot telemetry, buffering messages, and forwarding mission data. They are part of the architectural direction of the project, but the current frontend demo is able to run as a local simulation without requiring the satellite path.

## How mission planning works

The current robot workflow in the repository centers on these ideas:

### 1. Scan
The robot first surveys an area and identifies trash candidates.

### 2. Store
Detected items are filtered by whether they fit the robot's physical constraints:

- width / depth footprint
- height limit
- weight capacity

The robot logic in [`robot.py`](./Logic/R3_BOT/robot.py) uses a **2D heuristic packing approach** rather than a simple volume-only check, making storage decisions more realistic for floor-space usage.

### 3. Route
Once a set of carryable items is selected, the robot computes a pickup order with `getPath(...)` and groups work into one or more collection runs.

### 4. Repeat if needed
If all detected trash cannot fit into one load, the system plans additional runs. Items that cannot be carried are separated from collectible ones for human handling or future intervention.

## Current project status

This repository is best understood as a **working prototype** with active simulation and planning logic, not yet a finished production robotics stack.

What is already represented well:

- mission-oriented cleanup workflow
- road-aware robot movement in the web simulation
- scan-first mission flow in the command dashboard
- storage-aware robot collection planning
- multi-run pickup simulation
- Python unit coverage for collection-run behavior

What is still prototype / evolving:

- live deployment integration for the AI inference path
- real-world telemetry and robot hardware integration
- production-grade persistence and operator workflows
- full end-to-end environmental metrics

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Tailwind, MapLibre
- **Backend / logic:** Python
- **AI detection:** YOLO26 via Hugging Face
- **Routing data:** OpenStreetMap / OSRM-derived road snapshots and path ordering concepts
- **Testing:** Python `unittest`, frontend checks and build validation

## Running the project

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`.

### Python logic tests

From the repository root:

```powershell
python -B -m unittest Logic\R3_BOT.test_collection_runs -v
```

## Why R3AI matters

Trash accumulation is both an environmental and operational problem. R3AI explores how AI-driven perception and autonomous cleanup planning could help teams:

- identify polluted areas faster
- understand robot carrying limits before dispatch
- simulate cleanup effectiveness
- prioritize recoverable waste
- visualize restoration progress for communities and operators

## Summary

R3AI is an AI-assisted cleanup simulation platform that combines:

- **YOLO26-based waste recognition**
- **robot storage and pickup planning**
- **route-based collection execution**
- **interactive mission visualization**

It is a strong prototype foundation for a system that could eventually bridge waste detection, robot autonomy, and environmental restoration analytics.
