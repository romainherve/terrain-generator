# Martell — Technical Handbook

A single‑file Three.js creative tool that generates a premium **Martell Cognac** key‑visual
landscape (red/blue duotone dunes, a glowing winding trail up to a mountain) and lets you
build **camera animations** and **SVG UI screens** on top of it, then share read‑only links
with a client. Cloud features (saving, sharing, asset uploads) run on Cloudflare.

This document is the "what you need to know" reference. For per‑file/line detail, read the
code — it's almost entirely one file.

---

## 1. Live URLs & hosting

| What | Where |
|------|-------|
| **Production (client‑facing tool)** | https://martell-ahn.pages.dev |
| **Preview / working alias** | https://character-addition.martell-ahn.pages.dev |
| **GitHub repo** | https://github.com/hervestudio/Martell — branch **`character-addition`** |
| **Cloudflare account** | "Intangible Website" — account id `ad4fab9f93b4b81c4a02d2fc27e51969` |
| **Cloudflare Pages project** | `martell` (its `.pages.dev` subdomain is `martell-ahn`) |

The tool is **password‑gated** (soft, client‑side): password **`hervemartell2026!`**.
Share links (`/?v=…`) are **not** gated — clients open them directly.

> ⚠️ **Production = `main` branch, preview = any other branch.** `wrangler pages deploy`
> tags the deployment with the current git branch by default, which lands on a *preview*
> alias, **not** production. Always pass `--branch main` to publish to the apex.

---

## 2. Tech stack

- **Frontend:** one HTML file, `public/index.html` (~6.5k lines, a single `<script type="module">`).
  - **Three.js 0.160.0** via an **unpkg importmap** (ESM) — no bundler, no build step.
  - **lil-gui** for the control panel.
  - Custom GLSL shaders (terrain duotone, sky, flow lines, post‑processing).
- **Backend:** **Cloudflare Pages Functions** (file‑based routing under `functions/`), same‑origin `/api/*` (no CORS).
- **Database:** **Cloudflare D1** (SQLite) — binding `DB`.
- **Object storage:** **Cloudflare R2** — binding `MEDIA` (uploaded SVGs).
- **Deploy tool:** `wrangler` (v4, a devDependency).

There is **no build** — `wrangler pages deploy public` uploads the static files as‑is, and the
Functions are deployed alongside.

---

## 3. Repo structure

```
public/                 ← the ONLY static files served (pages_build_output_dir)
  index.html            ← the entire app (HTML + CSS + one module script)
  parameters.json       ← startup defaults, fetched on load (fallback if no cloud default)
  reference.jpg         ← reference overlay image (toggle with R)
  ui-assets/            ← brand fonts (.ttf), tut-logo.svg, etc.
functions/              ← Pages Functions (MUST be at repo root, NOT inside public/)
  _middleware.js        ← disabled password hook (one‑line enable later)
  api/
    _lib.js             ← json()/bad()/isKind() helpers (underscore = not a route)
    presets.js          ← GET list / POST upsert   (kind = settings | animation)
    presets/[id].js     ← GET one / DELETE
    default.js          ← GET the single settings boot default
    share.js            ← POST → create a share token
    share/[id].js       ← GET a shared snapshot (the /?v= viewer payload)
    upload.js           ← POST raw SVG → R2 → { url, key }
    asset/[key].js      ← GET → stream an SVG from R2 (served sandboxed)
    screens.js          ← GET list / POST upsert   (cloud UI screens)
    screens/[id].js     ← GET one / DELETE
migrations/             ← D1 schema (apply with `wrangler d1 migrations apply martell --remote`)
  0001_init.sql         ← presets table (CHECK kind IN ('settings','animation'))
  0002_shares.sql       ← shares table (random token id)
  0003_screens.sql      ← screens table (UI screens; UNIQUE name)
wrangler.toml           ← project name, output dir, D1 + R2 bindings
package.json            ← wrangler devDependency
```

---

## 4. Cloud backend

### wrangler.toml (the source of truth for bindings)
```toml
name = "martell"
pages_build_output_dir = "public"

[[d1_databases]]
binding = "DB"                 # must equal env.DB in every Function
database_name = "martell"
database_id = "7edf7a63-fc11-433f-afcf-94c39ef7de3b"

[[r2_buckets]]
binding = "MEDIA"              # env.MEDIA — 'ASSETS' is RESERVED by Pages, do not use it
bucket_name = "martell-assets"
```
For this project, **wrangler.toml bindings DO apply** to `wrangler pages deploy` (verified in
prod). No dashboard binding step is needed.

### D1 tables
- **`presets`** — `kind` (`settings` | `animation`), `name`, `data` (JSON), `is_default`,
  `UNIQUE(kind,name)`. `data` is the full `params` (settings) or `params.timeline` (animation).
  Has a `CHECK (kind IN ('settings','animation'))` constraint → **you cannot add a new `kind`
  without recreating the table**; that's why UI screens use a separate table.
- **`shares`** — `id` (random token), `data` (JSON: `{mode, params, timeline, view}`). The
  `/?v=<id>` viewer reads this.
- **`screens`** — `id`, `name` (UNIQUE → upsert by name), `data` (JSON:
  `{name, svgs:{<ratio>:url}, background:{type,ref}}`). Cloud‑saved UI screens.

### R2
- Bucket `martell-assets`. `POST /api/upload` validates it's an SVG (content‑type contains
  `svg`, ≤1 MB, sniffs `<svg`/`<?xml`), stores it, returns `/api/asset/<key>`.
- `GET /api/asset/:key` streams it as `image/svg+xml`, **immutable** cache, with
  `Content-Security-Policy: default-src 'none'` so any script embedded in the SVG can't run if
  the file is opened directly.

### Frontend cloud helper
`cloudApi` (base `/api`, no auth header currently) — `list/get/upsert/remove` for presets,
`listScreens/getScreen/upsertScreen/removeScreen` for screens, `createShare/getShare`,
`uploadAsset`. All wrapped in try/catch so the app degrades gracefully when Functions are
absent (e.g. running under a plain static server).

---

## 5. The app (`public/index.html`)

One module script. Roughly: design tokens (CSS `:root` vars) → params object → SimplexNoise →
scene/terrain/trail/flow‑lines builders → shaders → post pipeline → camera/controls →
timeline → UI workspace → cloud helpers → lil‑gui setup → render loop → startup.

### Design system / tokens
CSS variables in `:root`: deep blue‑slate surfaces (`--bg`, `--s0…s2`, `--inset`, `--overlay`),
text hierarchy (`--fg`, `--fg-2/3`, `--fg-muted`), borders, and the accent **`--gold`**.
The UI accent was **de‑branded to yellow `#ffd633`** (was cognac gold `#ffd089`) so the tool can
be reused on other projects; the **3D scene's** gold (trail/runner/focus gizmo) is still
`#ffd089` (that's project content). Brand fonts (`Martell Web`/`Martel Sans`) live in
`ui-assets/` but the tool chrome now uses generic `system-ui`.

### Workspaces (top‑left toolbar = **Build / Animate / UI** only)
`setWorkspaceMode('build'|'animate'|'ui')`. Camera/Runner/Rig buttons were removed from the
toolbar (still reachable: camera views + runner in the GUI; Rig view on the Animate timeline).
The lil‑gui control panel is **open by default in Build** and toggled with **S**.
**⌘/Ctrl+P** opens a parameter **search/filter** over the whole panel (Esc to close).

### Rendering pipeline
- `renderer.toneMapping = NoToneMapping` — **the grade pass does the tone‑mapping**
  (Khronos **PBRNeutral**), and an **`OutputPass` does the linear→sRGB** encoding.
- `EffectComposer` (`composerTarget` is **HalfFloat, samples:4**):
  `RenderPass → AfterimagePass → UnrealBloomPass → GradeShader → FrameVignetteShader →
  OutputPass → DitherShader`.
- **Framed‑region FPS optimization** — `canFramedOnly()` (true when a frame ratio is set, bars
  opaque ≥0.99, not rig, not exporting) + `applyRenderRegion()` size the composer buffers to the
  **framed rect** and aim `camera.aspect` at the frame ratio; the render loop clears the canvas
  black and `setViewport/setScissor` to that rect before `composer.render()`. Result: a 9:16
  frame in a wide window renders ~60% fewer pixels at zero in‑frame quality loss. **Applies to
  the client share viewer too.** It only saves fragment+post cost, NOT the ~1.9M‑vert geometry
  cost. NB: a plain scissor alone does nothing with post on — the composer renders full‑buffer
  unless you resize it, which is why `applyRenderRegion` resizes the composer.

### Scene / look
- **Terrain:** SimplexNoise FBM heightfield; winding valley carved along a centreline
  (`pathCenterX(z)`); `sample(x,z)` returns `{y, valley, …}`. Geometry is heavy (segments up to
  ~705×2742 ≈ 1.9M verts).
- **Surface shader:** duotone red/blue mapping + **striations** drawn on the surface. The
  striation pattern is `params.shLineMap` (`STRIATION_MAPS`: height, lengthwise, across,
  from‑path, radial, angular, flow, path‑parallel). The shader computes a per‑pixel field `lc`
  per the selected map and draws iso‑lines of it.
- **Trail:** a bright bundle along the centreline; has a "rails" style (left+right rails) and a
  striation clear‑zone.
- **Sky** (dome + gradient + noise), **sun**, **fog** (incl. animated `flowFog`), **clouds**.

### Flow lines (the glowing draped lines)
`buildFlowLines()` → `buildPathLines` (parallel to the path) / `buildContourLines` (iso‑height) /
**`buildStriationLines`** (traces the **selected striation field** — a CPU mirror of the shader's
`lc`, via `striationFieldFn()` + `marchingSquares()` + `stitchSegments()`).
All lines use **one shared gold `ShaderMaterial` (`flowLineMat`)** with per‑vertex `aDist`
(absolute arc‑length), `aBright`, and `aMask` attributes. The shader draws a **gold base + comet
‑like light pulses** travelling along `aDist` (driven by `uTime`, advanced every frame in
`advanceSceneTime`). An **optional noise mask** (`lineMaskAt`, types fbm/simplex/ridged/billow)
fades the lines in/out so they appear only in certain areas (per‑vertex, smoothstep gate; the
on/off + reveal/softness are live uniforms, type/scale rebuild). Controls live in the
`〰️ Flow lines` GUI folder (count/detail per mode, gold colour, flow speed, glow, density, mask).

---

## 6. Animate workspace (the timeline)

State: `params.timeline = { duration, keys[], inT, outT, paramTiming, smooth, masterEase,
focusLock, loop }`. Each key: `{ t, px..pz, qx..qw, focal, fx..fz (focus point), easing,
follow (runner), runT, params: snapshotAnimParams() }`. Runtime state lives in `tl` (playing,
t, posCurve, quats, selected, selSet, …).

- **Interpolation:** CatmullRom positions + quaternion **slerp** + focus‑lock lookAt; **PCHIP**
  time mapping; per‑segment **bezier easing** + a **master ease**; per‑parameter **retiming**
  (`paramTiming[key]=[t0,t1]` → a param animates over its own sub‑window).
- **Film‑strip UI:** dark stage track, adaptive second ruler + horizontal zoom, white playhead
  with a triangle head, grouped transport, draggable in/out points, keyframe **snapping**
  (Alt bypasses), retiming‑lane drag previews.
- **Keyframe thumbnails:** `genKeyThumb(k)` renders the scene from each key's camera pose **with
  that key's own look** (`applyAnimatedParams(k.params, true)`, then restored) to a small
  offscreen target, runs it through the **same `gradePass`** (so tone‑map + grade match the live
  view) and applies a **linear→sRGB LUT** (replicating the OutputPass the thumbnail skips —
  otherwise thumbnails are too dark). Cached by a pose+look hash, generated ≤1/frame, skipped
  in viewer mode.
- **Multi‑keyframe edits:** shift‑select several pins (`tl.selSet`) → editing a parameter writes
  it to **all** selected keys (the global `gui.onChange` auto‑commit).
- **Cloud animations:** D1 `kind='animation'`. The strip shows recent chips + a custom
  **`#animMenu`** popover (rendered first‑keyframe previews, search, ✎ rename / × delete).
  Save/overwrite via the naming modal or **⌘/Ctrl+S**. Rename = re‑save under new name + delete
  old (D1 is upsert‑by‑name). Data‑loss guards: an **UNSAVED** indicator (snapshot‑compared) and
  a **confirm before switching** clips with unsaved edits.

---

## 7. UI workspace (SVG screens)

The old template‑based screens were **replaced by uploaded SVG screens** (the templates code is
left dormant). Model: `params.ui.screens = [ the one working screen ]`, each
`{ id, name, svgs:{ '<ratio>': url }, background:{ type:'animation', ref } }`.

- **One SVG per ratio**, **auto‑shown to match the current frame ratio** (`params.frameRatio`):
  `uiRenderScreen` shows `svgs[ratio]` full‑bleed in the framed `#uiStage` (falls back to any
  variant with a "showing X" note).
- Toolbar: **☰ Saved screens** (cloud picker popover with SVG previews + rename/delete),
  **＋ New** (blank working screen), **💾 Save** (→ cloud `screens`), name, **ratio** select,
  **⬆ Upload SVG** (→ R2, stored on the active screen+ratio), **behind 🎬** (pick a **cloud
  animation** via the reused `#animMenu` with an `onPick` callback), **🔗 Share**.
- The screen + its background travel in `params.ui` → carried by presets and `/?v=` shares.

---

## 8. Sharing (`/?v=<id>`)

`cloudShareLink()` snapshots `{ mode, params, timeline, view }` into the `shares` table and
returns a token link. The client opens `/?v=<id>` → `enterViewer(id)`:
- A `<head>` guard sets `html.viewer` (hides all tool chrome pre‑paint) + a loading spinner.
- Applies the shared params, **applies the framed‑region render** (FPS), then either plays the
  animation (with a player bar `#viewerBar`) or shows the UI screen over its background animation.
- Thumbnail generation is **skipped** in viewer mode (the timeline is hidden).

---

## 9. Deploy & operations

**Deploy is a direct `wrangler pages deploy` (NOT git‑connected).** You need a Cloudflare API
token with Pages + D1 + R2 perms.

```bash
# from repo root, with the token in env (never commit it):
export CLOUDFLARE_API_TOKEN=<token>
export CLOUDFLARE_ACCOUNT_ID=ad4fab9f93b4b81c4a02d2fc27e51969

# PREVIEW (working alias):
npx wrangler pages deploy public --project-name martell --branch character-addition --commit-dirty=true

# PRODUCTION (apex martell-ahn.pages.dev):
npx wrangler pages deploy public --project-name martell --branch main --commit-dirty=true

# D1 migrations (run on BOTH remote and, for local dev, local):
npx wrangler d1 migrations apply martell --remote
```

- HTML is served `must-revalidate` (no stale cache; a normal reload gets new deploys).
- **Gotcha:** a *brand‑new* `/api/*` route can briefly serve the **SPA‑fallback HTML** (cached
  404) for a few seconds right after the first deploy that introduces it — it self‑corrects on
  revalidation. The Functions' JSON responses are `no-store`.
- Local dev: `python3 -m http.server` in `public/` boots the app (cloud `/api` 404s → it falls
  back to `parameters.json`; JSON import/export still works). For the real `/api`, use
  `npx wrangler pages dev public` (its own **local** D1 — migrate it separately).

---

## 10. Validation patterns (how this codebase is tested without a bundler)

- **Syntax:** extract the `<script type="module">` and `node --check` it.
- **Boot / runtime errors:** headless Chrome with
  `--use-angle=swiftshader-webgl --enable-unsafe-swiftshader`, grep stderr for JS errors.
  ⚠️ Screenshots/`--dump-dom` **hang** on the live app (the rAF loop never settles) — only the
  **console‑error grep** is reliable for the full app.
- **Visual checks:** extract the `<style>` + a mock of the DOM into a **static** HTML page (no
  rAF) and screenshot that.
- **Shaders:** compile the exact GLSL in a tiny standalone three.js page and check `glErr`.

---

## 11. Gotchas & things to know

- **`ASSETS` is a reserved Pages binding** — the R2 binding is `MEDIA`.
- **presets `CHECK` constraint** — adding a new `kind` means recreating the table; new entity
  types should get their **own table** (that's why screens are separate).
- **AZERTY keyboard** — the user is on AZERTY; use `e.key` (letters), not `e.code`, for shortcuts.
- **Framed render** saves fragment+post only, **not geometry** — the ~1.9M‑vert terrain still
  transforms every frame. The remaining FPS lever is fewer terrain segments.
- **`canFramedOnly` escape hatch** — drop bar opacity below 0.99 or ratio "off" to fall back to
  full‑window render if a device renders the framed path oddly.
- **Tokens** — the Cloudflare API token is supplied per‑session and rotated; it must **never** be
  committed. `.gitignore` covers `node_modules/`, `.wrangler/`, `.dev.vars`, `*.log`.

### ⚠️ Known unresolved
- **"Param edit not saved to keyframe" (the retiming trap).** The Animate timeline has
  per‑parameter **retiming** lanes. A retimed param's value at the playhead comes from sampling
  over its own `[t0,t1]` window, **not** the keyframe under the playhead — so editing a retimed
  param can *look* like it reverts (the edit IS saved; the window keeps displaying a different
  keyframe). Mitigations are in place (a lane click no longer retimes — only a drag; editing a
  param's value un‑retimes it and re‑locks to keyframe timing; a `_heldEdits` store prevents a
  sample from reverting a live edit). The user reported it **still not fully fixed** and chose to
  **defer** it. Existing saved animations may have accidental retiming baked in until re‑saved.
- **Offered but not built:** a "lite geometry for shares" option (lighter terrain for weak client
  devices); Cloudflare Pages **git integration** (auto‑deploy on push instead of manual
  `wrangler pages deploy`).

---

## 12. History (high level)

1. **Origins:** a browser tool generating a valley/hills terrain with a winding glowing path for
   a Martell key visual / runner game; GLB/OBJ/C4D‑splines export; a fly‑camera "Runner" preview.
   Originally on GitHub Pages (`hervestudio.github.io`).
2. **Cloud migration:** restructured into `public/` + `functions/` + `migrations/`; moved hosting
   to **Cloudflare Pages** (`martell`) with **D1** (open/no‑auth) for settings presets + camera
   animations + a startup default; kept JSON import. Added shareable read‑only `/?v=` links.
3. **Animate workspace** matured: keyframe timeline, focus‑lock gizmo, per‑segment + master
   easing, per‑parameter retiming, bake, WebM/PNG export, client player bar.
4. **This handbook's session (June 2026):**
   - **FPS:** framed‑region‑only rendering (editor + share viewer).
   - **Timeline redesign:** film‑strip with rendered keyframe thumbnails, ruler+zoom, snapping,
     multi‑keyframe edits, data‑loss guards, a nicer animation picker with previews + rename.
   - **R2 SVG uploads** + **cloud UI screens** (separate D1 table); the UI workspace moved from
     template screens to **SVG‑per‑ratio screens** with cloud‑animation backgrounds.
   - **De‑brand:** generic fonts + yellow accent.
   - **Workspace/UX:** toolbar trimmed to Build/Animate/UI; controls open by default in Build;
     ⌘P parameter search.
   - **Flow lines:** gold with flowing light pulses, tracing the selected striation, density +
     definition controls, optional noise mask.
   - Promoted to production and committed to `hervestudio/Martell`.
</content>
</invoke>
