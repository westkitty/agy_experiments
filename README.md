# THE IMPOSSIBLE CINEMA
### Ten Experiments in Visual Impossibility

A unified, cinematic, procedural 3D browser experience built with WebGL and Three.js.

## Overview
- **Single Fullscreen 3D Viewport**: One central requestAnimationFrame loop, single WebGL rendering context, no clutter.
- **One Minimal Selector**: Unobtrusive translucent selector in the bottom-left corner with screen-reader accessibility.
- **Autonomous Lifecycle**: Transitions between scenes without page reload; previous scene GPU buffers, geometries, materials, and listeners are properly disposed.
- **Autoplay All & Independent Loops**: Default 50-second cinematic tour across all 10 experiments with subtle fade transitions, or infinite loop on any individually selected experiment.
- **Zero Remote Dependencies**: Works completely offline. Bundled into a standalone self-contained distribution (`dist/index.html`).

---

## The Ten Experiments

1. **01 — The Gravity Loom**: Nearly infinite golden cosmic membrane deformed by three orbiting celestial masses into deep gravitational wells; climax tear along a luminous seam exposing an intricate secondary matrix underneath before healing.
2. **02 — The Mirror Migration**: Shallow water on white salt desert; thousands of rising monolith mirrors reflecting varied sky palettes (sunrise, violet dusk, crimson sunset, starfield, deep cyan); synchronized waves align into a singular colossal sun spanning the horizon before submerging.
3. **03 — The Canyon of Floating Rings**: Vast desert canyon beneath amber sky; horizontal rock strata split and lift into monumental concentric stone rings spinning in counter-rotation, cascading sand particles and volumetric light shafts before locking back into bedrock.
4. **04 — The Orchard of Moons**: Ancient black tree rooted on a dark suspended space island; golden sap surges through trunk and branches, awakening luminous multi-patterned moons that detach and orbit in interlocking 3D flower petals before returning to rest.
5. **05 — The Hourglass of Kingdoms**: Monumental antique bronze hourglass; ancient spired upper city crumbles into glowing grains funneled through the glass neck, reconstructing into a vaulted lower civilization with arches and domes, followed by reverse restoration.
6. **06 — The Walking Shadow**: Weathered sandstone statue in sunlit desert; shadow ripples, separates from feet, rises into a towering 3D light-absorbing silhouette, strides across dunes dimming daylight, and briefly eclipses the sun with a brilliant corona before rejoining the statue.
7. **07 — The Aurora Forge**: Dark polar tundra under emerald/violet auroral curtains; flowing ribbons descend and crystallize into solid translucent arches, columns, and bridges with prismatic caustics across the snow, then fracture and dissolve back into sky ribbons.
8. **08 — The Cathedral of a Thousand Doors**: Obsidian reflective floor in darkness; suspended monumental portals open to reveal four distinct worlds (snow mountains, red desert with twin moons, bioluminescent rainstorm, extraterrestrial ocean) with particle spills and specular reflections, climaxing in an infinite avenue before slamming shut.
9. **09 — The Ember Railway**: Antique steam locomotive in volcanic canyon; spline-driven path where tracks forge ahead from blazing sparks and disintegrate into falling embers behind; features mechanical wheels, connecting rods, steam exhaust, and a full vertical 360° loop upside-down against the stars.
10. **10 — The Chromatic Tide**: Monochromatic grayscale metropolis; incandescent point of color ignites on the horizon and expands into an advancing wave of liquid pigment; glass refracts, metal reflects, concrete absorbs, and water carries pigment before the tide recedes to monochrome.

---

## Local Launch Instructions

### Option 1: Standalone Single File (Zero Install)
Open `dist/index.html` directly in any modern desktop browser (or serve with any static HTTP server).

### Option 2: Run Development / Preview Server
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build and preview production bundle
npm run build
npm run preview
```
Visit `http://localhost:3000` in your browser.
