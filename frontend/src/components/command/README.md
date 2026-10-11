# Command demo data and routing

`app/command/page.tsx` owns selection, theme, layer visibility and per-bot simulation state. The current implementation is ground-only. Candidate points are paired with incorporated images from `Logic/R3-YOLO/images`; the API reads the matching YOLO report and returns a boolean detection. Only `trashDetected: true` candidates become observations or collection stops. `false` scans are counted in the mission panel and discarded before packing/path planning. The Known vs YOLO measurement compares how many processed images are developer-labeled as containing trash with how many images YOLO classified as containing trash. Map locations, mass, footprint and movement remain simulated.

Run `Logic/R3-YOLO/detect.py` after adding or changing sample images. The scan bridge rejects a stale report that does not cover every image in the sample folder. API callers can also set `refreshYolo: true` to rerun inference before reading results; normal dashboard scans reuse the checked report so loading all eight simulated bots does not start eight model processes.

Battery is simulated: each bot starts with a deterministic charge and uses 18 percentage points over its complete route. Paused and idle bots do not drain. Zero charge stops playback; reset restores the selected bot’s initial charge and mission. The 40-second playback is accelerated, not a real speed or ETA. Missions remain independent when selecting another bot. State is local and resets on page reload.

`streetRoutes.ts` contains OSRM **driving-profile** snapshots retrieved on 2026-10-10 for eight cities. Ground clusters are placed at routed stop coordinates, and movement follows every route vertex. Routes use OpenStreetMap data (ODbL); geometry is not a guarantee of present road access, pedestrian clearance, robot suitability or live obstacle avoidance. No public routing service is called at runtime.

To replace snapshots, query a properly authorized routing provider using ordered waypoints, full GeoJSON geometry and bounded road snapping; retain per-leg geometry, provenance and attribution. The snapshot shape is `{ waypoints: [longitude, latitude][], legs: [longitude, latitude][][] }`. OSRM reference: https://project-osrm.org/docs/v26.5.0/http. Public-service usage policy: https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy.

If a street snapshot is missing, the app displays an explicitly unverified waypoint preview and disables ground movement rather than traveling straight through obstacles. Aerial robots are not implemented in the current fleet.

Run `node scripts/check-command.cjs`, `npx tsc --noEmit`, `npm run lint` and `npm run build` from `frontend/`. Map imagery requires internet access; the simulation and route snapshots themselves do not.

## Interface and release checks

Global search matches robot IDs, assignment cities and type locally. Submit a city/country query to fetch Photon results (no per-keystroke network traffic); exact robot IDs never go to the provider. Place results are validated, cached for the session (30 queries), and requests are aborted on query changes with a 10-second timeout. Keyboard users can press ArrowDown from the input to reach results, Tab between buttons, Enter to select, and Escape to dismiss.

The default endpoint is `https://photon.komoot.io/api/`, a public demo with no availability guarantee. Set `NEXT_PUBLIC_GEOCODER_URL` to a CORS-enabled Photon-compatible `/api/` endpoint before building for production traffic. Submitted place queries and the browser IP reach that provider; no bot telemetry is sent. Photon policy: https://github.com/komoot/photon. Country summaries use explicit synthetic assignment-country metadata; city summaries use a 50 km radius, not administrative boundaries. Neither invents cleanup data for a new place. Map retry returns to world view; search again to refocus a place.

Desktop uses a mission panel and a switchable fleet/coverage inspector; each scrolls independently without nesting fleet scrollbars. Mobile uses collapsible panels (Escape closes and restores focus to the trigger), plus a fleet-wide pause action whenever a bot is running. Layer choices survive bot selection. Themes use the saved preference, falling back to the device preference. Simulation time uses elapsed foreground time, capped after long stalls; hidden tabs do not advance.

Map errors and a 20-second loading timeout expose a retry action. Retry recreates only the map, preserving mission state and layer choices; the camera returns to the world overview. Errors remain visible until retry rather than being hidden by MapLibre's idle event. Dynamic fleet changes remove stale map markers.

Before release, verify a successful production build in the deployment environment, keyboard navigation, narrow phones and short landscape screens, unavailable imagery/WebGL, and map retry. Confirm imagery-provider usage terms and deployment CSP for worker and tile requests. This remains a local simulation, not a live robot-control system; authentication, backend telemetry, real mission persistence and operational safety integration are not implemented.
