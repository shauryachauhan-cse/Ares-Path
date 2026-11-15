# Ares Path release — 15 November 2026

This updates the existing hosted Worker application in place. The actual project is dependency-free HTML/JavaScript and a Cloudflare Worker, rather than the React/Vite assumption in the supplied specification. Existing mission saving, ownership isolation, homepage and imagery are retained.

## Feature status

| Feature | Status and evidence |
|---|---|
| Route planning and editing | Implemented. Guided start/destination, manual stops, drag editing, per-stop Delete, map Delete mode, Undo, Clear, Reset, Reverse, existing signed-in Save/Load and export. Browser verified adding, deleting and restoring a waypoint. |
| Terrain alternatives | Implemented and tested. A* visits required stops, blocks missing cells, respects configured coarse slopes and user exclusion circles. Side-by-side A/B/C table includes time, distance, slopes, gain/loss, energy and reserve. 21 automated tests pass across the application. |
| Elevation | Implemented. Real USGS CTX stereo DEM, ~20 m native, area-averaged ~81 m planning grid, areoid-relative metres. Point samples, ascent/descent, profile, slope, hillshade and 25 m raster contour boundaries. Bilinear route interpolation does not add detail. |
| Science layers | Partial. Actual registered THEMIS daytime infrared mosaic with opacity; CTX and terrain overlays. NASA mineralogy and USGS geology are genuine reference figures, not registered per-pixel map queries. MEDA weather is historical Jezero data. RAD radiation is historical Gale context, not Jezero exposure. Active chemical monitoring unavailable. |
| Energy and team scenarios | Implemented and tested. Hypothetical physics-based robot Wh accounting, return energy, reserve, initial charge, science/auxiliary load, optional solar potential; crew scenarios 1–4. No operational authorization or safe-solo claim. |
| Mission Simulation Lab / Assist | Implemented. Example, short-budget, low-battery, longer and steeper manual route scenarios. Configurable support-role comparison, cargo assumptions and simulated robot marker. No validated traction, human effort or communication model. |
| Mars Watch | Implemented on request / while open. Two verified official RSS feeds filtered for Mars, deduplicated, health/stale indicators, runtime and R2 cache. Fifteen-minute browser polling and manual refresh. Background scheduled ingestion is NOT configured. Optional DONKI requires NASA_API_KEY; no key supplied. |
| Mars history / Chronicles | Partial. Curated sourced events, observed-on versus known-by filtering, date calendar, timeline, real-record replay, nearby records, comparison and bookmarks. Sparse catalog, not a complete PDS archive. No registered time-series imagery comparison or actual rover-traverse replay; unsupported comparisons disabled. |
| Personal observations | Implemented. Local browser CRUD, validated JSON import/export, CSV, optional small images, date filter and map events. Browser storage does not synchronize across devices. |
| Mars globe / landmarks | Implemented and browser tested. NASA Viking texture, spherical WebGL or software rendering, 2D atlas, 22 sourced coordinates, search, labels, reset/rotation/zoom. No global elevation relief. Broad-region markers represent catalogue centres, not exact boundaries. |
| Surface View | Partial. One genuine NASA Mastcam-Z cylindrical panorama with look and zoom controls. No global street-view network or arbitrary location photos. |
| Ares Experience | Partial, working educational experience. Selected-route DEM perspective, astronaut/rover/guided motion, cameras, pause, restart, time compression, science objective, configured battery, local results/export and date context. Scenery and hazards are simulations; no exact historical reconstruction or full planetary game. |
| Ares Vision | Genuine inference implemented; NASA sample browser inference tested. Four-class research model, local images, mask overlay/opacity, pixel scores, class fractions, imports/export. Quantized ONNX conversion tested; no independent ground-truth performance evaluation. Not NASA validated. CDN access needed for ONNX Runtime. See vision.md. |
| Navigation | Seven linked command sections preserve mission state. Desktop browser checked. Responsive CSS present; a dedicated mobile-device run was not performed. |

## Validation

Run `npm run build` then `npm test`. The release passed 21 automated tests: API validation and Mars distance; authenticated, isolated mission saving; persisted route intent and exclusions; origin/body limits; mobility/rest; three-path real-DEM routing; exclusion/missing-cell detours; intermediate stops; energy units, return, reserve, starting charge and solar treatment; temporal filtering; observation sanitization, CSV injection protection and official feed filtering/cache/outages.

Browser QA on the local Worker preview verified comparison values (A 4.42 km round trip, B 4.79 km, C 5.58 km), required reserve and energy output; individual waypoint deletion and Undo; thermal toggle and contours; actual AI inference and overlay opacity; landmark search, 3D software fallback and 2D mode; real panorama; guided and rover motion, pause, cameras, date context and result generation. Application console had no JavaScript exceptions during these checks; browser extension errors and ONNX CPU-vendor warnings were unrelated to application execution.

Signed-in production mission Save/Load is covered by mocked user/R2 ownership tests; no signed-in browser session was available for a live storage round trip. No claim is made that every acceptance item from the much larger 35-part specification is complete.

## Deployment

No package installation is required. Build with `npm run build`; test with `npm test`. `scripts/build.mjs` packages local resources into `dist/server/index.js`. Preserve `.openai/hosting.json` project identity, R2 `BUCKET`, and the existing audience. Publish using the Sites source/version/deployment workflow. `NASA_API_KEY` is optional and server-only for DONKI; never include it in public assets. There is no background cron trigger or GitHub Action configured in this Site.

## Reproducible demonstrations

1. Open Route Planner and Try example route. Add a waypoint on the map, delete it in Route points and Undo. Clear intermediate stops for the default example.
2. Calculate & compare routes. Select A, B and C; inspect distance, time and profile. Their cost preferences do not establish traversability or safety.
3. Open Mission Simulator and One-click example test: B is about 245/300 minutes and 383 Wh under default assumptions. Starting 1,600 Wh leaves approximately 1,217 Wh with a 400 Wh reserve.
4. Set budget to 60 minutes and starting charge to 10%; Run simulation again. The same route exceeds time and fails the configured battery reserve. More people or a robot does not erase these constraints.
5. Open Historical explorer; choose 2021-04-03 in observed-on mode for the MEDA summary. Switch to known-by before its publication to see the distinction. Try a date with no matching observation: no fabricated conditions appear.
6. Add a clearly labeled personal observation, inspect its date and location, edit/delete or export it. Records remain local to this browser.
7. In Ares Vision, Try NASA sample image then Run terrain analysis. Wait for actual inference completion, adjust opacity and click a region. Scores are model outputs, not accuracy or a safety classification.
8. In Mars Explorer search Olympus, inspect its source, switch atlas/globe. Open the real Jezero panorama. Ares Experience loads the selected local route; try Guided or Rover, pause, review and export a run.

## Scientific limits

The model has no live local weather/radiation feed, life-support model, oxygen calculation, rescue approval, measured chemical hazard layer, wheel-slip mechanics, validated astronaut effort or fine obstacle detection. Thermal display brightness is not temperature. Historical observations retain their place and time; static terrain is not reconstructed for arbitrary dates. Energy and team outputs are educational scenarios.
