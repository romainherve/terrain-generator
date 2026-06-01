# Terrain Generator

A self-contained browser tool (Three.js) for generating a **winding valley/trail through rolling hills** — built for a runner-style game where an object travels a path with hills on both sides.

**Live:** https://romainherve.github.io/terrain-generator/

## Features

- Noise-based terrain (simplex FBM) tuned for soft **rolling hills**, with optional sharp ridges and hill-roundness control.
- A **winding valley** carved along a centerline (amplitude / S-curves / phase).
- **Altitude variation** with a grade control, so the path climbs and descends during the run.
- Glowing **flow lines** that drape along the path, like a topographic look.
- **Fly-camera + runner** preview that travels the centerline, with an on-screen DISTANCE / TIME HUD.
- Length auto-sizeable for a target run time (e.g. ~32 s at speed 50).

## Exports

- **Terrain GLB / OBJ** — the ground mesh (with vertex colours + planar UVs).
- **C4D Splines (.py)** — builds native Cinema 4D `SplineObject`s for the path + flow lines (run via Script Manager). Handles C4D's cm scale and handedness.
- **Splines OBJ** — polyline curves for other DCCs.
- **Lines texture (.png)** — bakes the flow lines top-down into a texture (black-and-white mask or coloured glow), aligned to the mesh UVs.
- **Path JSON** — centerline points to drive the runner.
- **Settings JSON** — save/load all parameters as a preset.

## Run locally

It uses ES-module imports from a CDN, so serve it over HTTP (not `file://`):

```sh
python3 -m http.server 8777
# then open http://127.0.0.1:8777/
```

## License

MIT
