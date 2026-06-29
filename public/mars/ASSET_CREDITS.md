# Mars Command — Asset Credits & Licences

Every 3D/texture asset shipped in the game is listed here with its source and
licence. New assets must be added here before they are integrated.

Asset files live in `phase3/freelon-city-site/public/mars/assets/` (the served
copy). Original/authored assets keep their build source in
`mars-command/assets_src/`.

---

## Original assets (authored for this project — CC0 / public domain)

These were built from scratch for Mars Command. We dedicate them to the public
domain under **CC0 1.0**. No third-party content is incorporated.

| File | What | Source / build | Licence |
|------|------|----------------|---------|
| `pp_rover_mk2.glb` | Hero player rover — six-wheel rocker-bogie design, beveled hull, equipment deck + solar wings, roof cargo, camera mast w/ twin emissive lenses, high-gain dish + whip antenna, emissive head/tail lights, dust skirt. ~1.6k base faces (≈3–4k tris triangulated), no textures (material colours only), 308 KB. | Authored in Blender 5.1 via `assets_src/build_rover.py` (parametric, fully reproducible: `blender --background --python assets_src/build_rover.py`). Inspired by the general form of NASA Curiosity/Perseverance-class rovers; geometry is 100% original, no model data copied. | CC0 1.0 |
| `hab_module.glb` | Habitat module — pressurised cylinder hull with domed end caps, gold-soot rib bands, emissive warm windows, airlock drum + emissive door, foundation skirt + four legs, angled roof solar panel, antenna mast + dish, side power unit + cable run, beacon. ~1k faces, no textures, 169 KB. Replaces the featureless Quaternius `House_Cylinder` as the habitat. | Authored in Blender 5.1 via `assets_src/build_base.py` (parametric: `blender --background --python assets_src/build_base.py`). 100% original geometry. | CC0 1.0 |
| `pp_crate_mk2.glb` | Equipment / supply case — beveled body, lid seam, recessed side panels, emissive warning stripe, two latches, top handle, four corner feet, gold corner caps. ~240 faces, no textures, 44 KB. Replaces the plain low-poly `pp_crate`. | Authored in Blender 5.1 via `assets_src/build_base.py`. 100% original geometry. | CC0 1.0 |
| `colonist_mk2.glb` | Crew / colonist NPC — EVA astronaut: domed helmet + dark front visor, PLSS life-support backpack, chest control panel, gold-trim utility belt, segmented suit arms/legs. Rigid-skinned to an 11-bone armature with a looping "Walk" action (leg/arm swing + pelvis bob). ~1.4k faces, no textures (material colours only), 327 KB. Replaces the off-tone `Astronaut_BarbaraTheBee` (a cartoon bee holding a pistol). | Authored in Blender 5.1 via `assets_src/build_colonist.py` (parametric: `blender --background --python assets_src/build_colonist.py`). 100% original geometry + original walk cycle. | CC0 1.0 |

### Build/integration notes (rover_mk2)
- Forward built along Blender **−Y** so the default glTF Y-up export faces
  **+Z** in three.js (the game's rover heading-forward axis).
- The engine's `prepModel(root,'rover')` re-normalises scale to
  `MODEL_SCALE.rover` (4.5 along the largest horizontal axis) and re-centres
  the footprint, so absolute Blender dimensions don't matter — only proportions.
- `prepModel` applies the dusk regrade (`offsetHSL(0,-0.22,+0.03)`) and keeps
  the rover readable (no hard soot-clamp, unlike the buildings). Material base
  colours were authored slightly saturated to survive the −0.22 desaturation.
- Emissive materials (head/tail lights, mast lenses) are preserved by the
  engine regrade (it only shifts `color`, not `emissive`).
- Collision proxy is handled in-engine (the rover uses the existing
  `roverShell` physics transform — geometry swap only changes the visual mesh),
  so no separate collider asset is needed.

### Build/integration notes (hab_module + pp_crate_mk2)
- Both are placed by the engine via `MODEL_URLS.habitat` / `MODEL_URLS.crate`
  → cached in `MODEL_CACHE` → cloned by `buildMesh()` (habitat) / scattered as
  props (crate). `prepModel` normalises scale to `MODEL_SCALE` (habitat 14,
  crate 2.4) and sits the footprint on the ground.
- Buildings get the engine's dark soot+gold skyline clamp when material
  lightness > 0.28; emissive (windows, airlock, warning stripe) is preserved
  separately so it still glows. Hull/case base colours were authored dark on
  purpose so they read as premium soot rather than bright plastic.
- Airlock faces Blender **−Y** → **+Z** after Y-up export (consistent with the
  rover's forward convention).

### Build/integration notes (colonist_mk2)
- Figure faces Blender **−Y** → **+Z** after Y-up export (heading-forward, same
  convention as the rover/habitat).
- Rigid-skinned: every primitive segment is weighted 100% to a single bone (no
  auto-weights), the segments are joined into one mesh, and an Armature modifier
  is added manually. The glTF exporter splits the joined mesh by material, so
  GLTFLoader loads it as several `SkinnedMesh` primitives named `Cube`,
  `Cube_1` … (cosmetic naming only — the rig/skin/clip are intact).
- One looping `Walk` action (frames 1→25, seamless) drives leg/arm swing about
  local X plus a pelvis bob. The engine's `makeCitizen()` retargets it via
  `SkeletonUtils.clone` + `AnimationMixer` and plays the first `/walk/i` clip.
- **Loader scale fix:** the colonist loader originally measured height with
  `Box3.setFromObject`, which mis-measures a `SkinnedMesh` (returns bind-pose /
  partial bounds → it read this 1.91-tall rig as 0.72, a 2.65× under-measure →
  4.4× over-scale + floating feet). Replaced with a robust geometry-bbox union
  (`updateMatrixWorld(true)` then union each child `geometry.boundingBox`
  transformed by `matrixWorld`), giving the true height → correct ≈1.68 scale,
  feet grounded. Applied in both `index.html` copies.
- No textures (material colours only); emissive on the suit is minimal, so the
  loader's emissive-overwrite regrade doesn't lose authored glow.

---

## Third-party assets (pre-existing — licences as documented in source)

Recorded here for completeness; sourced before this credits file existed and
declared in inline comments in `index.html`.

| File | What | Source | Licence |
|------|------|--------|---------|
| `Roof_Radar/Building_L/Base_Large/House_Long/GeodesicDome-transformed.glb` | Base/skyline buildings (still in use for non-habitat structures) | Quaternius — Ultimate Space Pack (via poly.pizza) | CC0 |
| `pp_launchpad.glb` | Landing pad | KayKit (Kay Lousberg) | CC0 |
| `pp_descentship.glb` | Descent ship | Quaternius | CC0 |
| `pp_lander.glb` | Lander | poly.pizza kit | CC0 |
| `pp_rocket.glb` | Saturn V | "Mr. Peel" | CC-BY |
| `emile.glb` | EMILE playable character rig + locomotion | EmileGuapo rig (project asset) + CC0/MIT retargeted locomotion clips | project + CC0/MIT |
| `nasa_pano.webp`, `mars.webp`, `marsbump.webp` | Mars surface reference textures | NASA imagery | Public domain (NASA) |
| `sky.hdr`, `sand_diff/nor/rough.webp` | Environment + ground PBR | CC0 texture sources | CC0 |

### Retired
| File | Status |
|------|--------|
| `pp_rover.glb` | **Retired** as the player rover (low-poly CC0 "toy" — the quality ceiling that prompted the rebuild). File kept on disk for rollback only; no longer referenced by `MODEL_URLS`. |
| `House_Cylinder-transformed.glb` | **Retired** as the habitat (featureless Quaternius cylinder). Replaced by original `hab_module.glb`. File kept for rollback; no longer referenced by `MODEL_URLS`. |
| `pp_crate.glb` | **Retired** as the supply crate (plain low-poly box). Replaced by original `pp_crate_mk2.glb`. File kept for rollback; no longer referenced by `MODEL_URLS`. |
| `Astronaut_BarbaraTheBee-transformed.glb` | **Retired** as the crew/colonist NPC (a cartoon bee holding a pistol — tonally wrong for a Mars colony). Replaced by original `colonist_mk2.glb`. File kept for rollback; no longer referenced by the colonist loader. |

---

## Rejection criteria (for future asset sourcing)
Reject any asset that is: non-commercial / editorial-only / unclear licence /
ripped from a game or film / trademarked / too heavy for the browser /
stylistically unusable / missing licence proof. Allowed: CC0, public domain,
permissive licences, NASA/public-domain reference, explicitly-provided assets,
or original Blender-built assets.
