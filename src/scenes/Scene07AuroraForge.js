import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';
import { GLSL_NOISE } from '../common/ShaderChunks.js';

/**
 * EXPERIMENT 07 — THE AURORA FORGE
 * Frozen tundra beneath polar sky.
 * Multi-colored auroras descend and progressively crystallize into solid architecture:
 * translucent arches, branching columns, floating crystal bridges.
 * Prismatic light on snow; fractures spread and crystal dissolves back into sky ribbons.
 */
export class Scene07AuroraForge {
  constructor() {
    this.name = 'The Aurora Forge';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x02060d);
    scene.fog = new THREE.FogExp2(0x02060d, 0.0035);

    camera.fov = 50;
    camera.near = 0.5;
    camera.far = 1600;
    camera.updateProjectionMatrix();

    const amb = new THREE.AmbientLight(0x0a1828, 1.2);
    this.group.add(amb);

    // 1. Frozen Snow Tundra & Ice Fields
    const snowGeo = new THREE.PlaneGeometry(600, 600, 80, 80);
    snowGeo.rotateX(-Math.PI / 2);
    this.disposables.push(snowGeo);

    this.snowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPrismIntensity: { value: 0 }
      },
      vertexShader: `
        ${GLSL_NOISE}
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec3 p = position;
          p.y += snoise(vec3(p.xz * 0.015, 0.0)) * 5.0;
          vec4 worldPos = modelMatrix * vec4(p, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPrismIntensity;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          // Cold snow with icy specular glints
          vec3 snowBase = vec3(0.72, 0.85, 0.95);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);

          // Moving prismatic caustics and focused hexagonal caustic halos from overhead crystal vault
          float pNoise = sin(vWorldPos.x * 0.08 + uTime * 0.8) * cos(vWorldPos.z * 0.08 - uTime * 0.6);
          vec3 prismCol = vec3(
            0.5 + 0.5 * sin(pNoise * 4.0),
            0.5 + 0.5 * sin(pNoise * 4.0 + 2.0),
            0.5 + 0.5 * sin(pNoise * 4.0 + 4.0)
          );

          // Focused hexagonal caustic halos projected on snow surface
          float rad = length(vWorldPos.xz);
          float causticRing1 = exp(-pow(rad - 26.0, 2.0) * 0.08) * (0.6 + 0.4 * sin(atan(vWorldPos.z, vWorldPos.x) * 6.0 + uTime * 1.4));
          float causticRing2 = exp(-pow(rad - 46.0, 2.0) * 0.05) * (0.6 + 0.4 * cos(atan(vWorldPos.z, vWorldPos.x) * 12.0 - uTime * 1.8));
          float causticHalos = (causticRing1 + causticRing2 * 0.7) * uPrismIntensity;

          vec3 rainbowHalo = vec3(
            sin(rad * 0.28 - uTime * 1.2) * 0.5 + 0.5,
            sin(rad * 0.28 - uTime * 1.2 + 2.09) * 0.5 + 0.5,
            sin(rad * 0.28 - uTime * 1.2 + 4.18) * 0.5 + 0.5
          );

          // Polar hoarfrost crystalline sparkle glints
          vec3 halfVec = normalize(viewDir + vec3(0.25, 0.9, 0.35));
          vec3 sparkleCoord = floor(vWorldPos * 3.5);
          float sparkleHash = fract(sin(dot(sparkleCoord, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
          vec3 randomNorm = normalize(vNormal + (vec3(fract(sparkleHash * 13.0), fract(sparkleHash * 17.0), fract(sparkleHash * 23.0)) - 0.5) * 0.85);
          float NdotH = max(dot(randomNorm, halfVec), 0.0);
          float glint = pow(NdotH, 65.0) * step(0.962, sparkleHash) * 3.2;

          vec3 finalColor = snowBase * 0.35 + (prismCol * 0.65 + rainbowHalo * (causticHalos * 1.8)) * (uPrismIntensity * 0.95) + vec3(0.9, 0.98, 1.2) * glint;

          // Horizon distance fog
          float dist = length(vWorldPos.xz);
          float fog = 1.0 - exp(-dist * 0.0035);
          finalColor = mix(finalColor, vec3(0.02, 0.06, 0.12), fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(this.snowMat);

    this.snowMesh = new THREE.Mesh(snowGeo, this.snowMat);
    this.snowMesh.position.y = -5;
    this.group.add(this.snowMesh);

    // 2. Animated Aurora Ribbons with Progressive Crystallization
    this.auroraUniforms = {
      uTime: { value: 0 },
      uDescent: { value: 0 },
      uCrystal: { value: 0 },
      uFracture: { value: 0 }
    };

    // Four sweeping ribbon curtains
    this.auroraCurtains = [];
    const ribbonGeo = new THREE.PlaneGeometry(280, 50, 90, 24);
    this.disposables.push(ribbonGeo);

    const auroraMat = new THREE.ShaderMaterial({
      uniforms: this.auroraUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        ${GLSL_NOISE}
        uniform float uTime;
        uniform float uDescent;
        uniform float uCrystal;
        uniform float uFracture;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vFacet;

        void main() {
          vUv = uv;
          vec3 p = position;

          // Flowing fluid undulating aurora curtain
          float wave1 = snoise(vec3(p.x * 0.025, p.y * 0.04, uTime * 0.4)) * 14.0;
          float wave2 = snoise(vec3(p.x * 0.05, p.y * 0.08, uTime * 0.7)) * 6.0;
          vec3 fluidOffset = vec3(0.0, 0.0, wave1 + wave2);

          // Hard faceted crystalline geometry morph
          vec3 crystalOffset = vec3(
            floor(p.x / 6.0) * 0.4,
            floor(p.y / 5.0) * 0.6,
            floor((wave1 + wave2) / 4.0) * 4.0
          );

          vec3 finalP = p + mix(fluidOffset, crystalOffset, uCrystal);

          // Geomagnetic dipole field loop arch curvature (Birkeland polar cusp)
          float polarCusp = pow(abs(p.x) / 140.0, 2.0);
          finalP.y -= polarCusp * 18.0 * (1.0 - uCrystal * 0.5);
          finalP.z += sin(p.x * 0.035 + uTime * 0.25) * polarCusp * 14.0;

          // Descent toward tundra surface
          finalP.y += 45.0 - (uDescent * 34.0);

          // Fracture dissolution: shards fly apart vertically
          if (uFracture > 0.001) {
            float shardSeed = fract(sin(dot(floor(p.xy / 8.0), vec2(12.98, 78.23))) * 43758.5);
            finalP.y += uFracture * shardSeed * 75.0;
            finalP.x += (shardSeed - 0.5) * uFracture * 35.0;
          }

          vFacet = abs(fract(p.x * 0.2) - 0.5);

          vec4 worldPos = modelMatrix * vec4(finalP, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uCrystal;
        uniform float uFracture;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vFacet;

        void main() {
          // Spectral multi-colored aurora hues: emerald green, cyan, violet, gold
          vec3 emerald = vec3(0.15, 0.95, 0.55);
          vec3 cyan = vec3(0.2, 0.85, 0.98);
          vec3 violet = vec3(0.75, 0.25, 0.95);
          vec3 gold = vec3(1.0, 0.85, 0.4);

          float colorT = sin(vWorldPos.x * 0.02 + uTime * 0.6) * 0.5 + 0.5;
          vec3 auroraCol = mix(emerald, cyan, colorT);
          auroraCol = mix(auroraCol, violet, smoothstep(0.6, 0.95, sin(vWorldPos.y * 0.1 + uTime)));

          // Vertical geomagnetic field pleat striations & rayed curtain streamers
          float magneticPleat = sin(vUv.x * 120.0 + sin(vUv.x * 30.0 + uTime * 0.8) * 4.0);
          float pleatShine = pow(magneticPleat * 0.5 + 0.5, 3.0) * (1.0 - uCrystal);
          float rayStreamer = sin(vUv.x * 45.0 - vWorldPos.y * 0.15 + uTime * 1.8);
          float streamerIntensity = smoothstep(0.4, 0.9, rayStreamer) * (1.0 - uCrystal);

          auroraCol += vec3(0.3, 0.9, 0.6) * pleatShine * 0.65;
          auroraCol += vec3(0.8, 0.4, 1.0) * streamerIntensity * 0.45;

          // Solid crystal shader properties with internal prism facet dispersion
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

          // Diamond internal facet reflections
          float facetX = fract(vWorldPos.x * 0.18 + vFacet * 2.0);
          float facetY = fract(vWorldPos.y * 0.12);
          float internalPrism = pow(max(sin(facetX * 6.28 + facetY * 6.28), 0.0), 4.0) * 2.2;
          vec3 prismSpectrum = vec3(
            sin(facetX * 6.28) * 0.5 + 0.5,
            sin(facetX * 6.28 + 2.09) * 0.5 + 0.5,
            sin(facetX * 6.28 + 4.18) * 0.5 + 0.5
          );

          vec3 facetedShade = mix(auroraCol * 0.8, gold, vFacet * 0.5);
          vec3 crystalCol = facetedShade + vec3(0.4, 0.7, 1.0) * fresnel * 0.65 + prismSpectrum * (internalPrism * 0.55);

          vec3 finalCol = mix(auroraCol, crystalCol, uCrystal);

          // Fracture crack lines glow
          if (uFracture > 0.01) {
            float crack = step(0.92, fract(sin(dot(vWorldPos.xy, vec2(12.98, 78.23))) * 43758.5));
            finalCol += vec3(1.0, 0.95, 0.7) * crack * (uFracture * 2.0);
          }

          // Vertical curtain transparency
          float alpha = sin(vUv.y * 3.14159);
          alpha += pleatShine * 0.22 * (1.0 - uCrystal);
          alpha = mix(alpha * 0.75, 0.85 + fresnel * 0.15, uCrystal);

          gl_FragColor = vec4(finalCol, alpha);
        }
      `
    });
    this.disposables.push(auroraMat);

    for (let c = 0; c < 3; c++) {
      const mesh = new THREE.Mesh(ribbonGeo, auroraMat);
      mesh.position.set(0, 0, (c - 1) * 45);
      mesh.rotation.y = (c - 1) * 0.18;
      this.group.add(mesh);
      this.auroraCurtains.push(mesh);
    }

    // 3. Polar Starfield
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3 + 0] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 1] = Math.random() * 300 + 40;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.disposables.push(starGeo);

    const starMat = new THREE.PointsMaterial({ color: 0x99ccff, size: 1.6, transparent: true, opacity: 0.75 });
    this.disposables.push(starMat);
    this.group.add(new THREE.Points(starGeo, starMat));

    // 4. Sub-Millimeter Crystalline Diamond Dust Ice Fog Dispersion
    const diamondCount = 2200;
    const diamondPos = new Float32Array(diamondCount * 3);
    const diamondColors = new Float32Array(diamondCount * 3);
    const diamondVel = new Float32Array(diamondCount * 3);
    const diamondBase = new Float32Array(diamondCount * 3);

    for (let i = 0; i < diamondCount; i++) {
      const bx = (Math.random() - 0.5) * 260;
      const by = Math.random() * 55 + 5;
      const bz = (Math.random() - 0.5) * 110;

      diamondBase[i * 3 + 0] = bx;
      diamondBase[i * 3 + 1] = by;
      diamondBase[i * 3 + 2] = bz;

      diamondPos[i * 3 + 0] = bx;
      diamondPos[i * 3 + 1] = by;
      diamondPos[i * 3 + 2] = bz;

      // Radial explosive drift velocity on fracture
      const dirX = (Math.random() - 0.5) * 2.2;
      const dirY = 0.8 + Math.random() * 2.4;
      const dirZ = (Math.random() - 0.5) * 2.2;
      diamondVel[i * 3 + 0] = dirX;
      diamondVel[i * 3 + 1] = dirY;
      diamondVel[i * 3 + 2] = dirZ;

      // Prismatic diamond crystal colors
      const cr = Math.random();
      if (cr < 0.35) {
        diamondColors[i * 3 + 0] = 0.3; diamondColors[i * 3 + 1] = 0.95; diamondColors[i * 3 + 2] = 0.65; // Emerald
      } else if (cr < 0.65) {
        diamondColors[i * 3 + 0] = 0.65; diamondColors[i * 3 + 1] = 0.45; diamondColors[i * 3 + 2] = 1.0; // Violet
      } else if (cr < 0.85) {
        diamondColors[i * 3 + 0] = 0.35; diamondColors[i * 3 + 1] = 0.85; diamondColors[i * 3 + 2] = 1.2; // Cyan
      } else {
        diamondColors[i * 3 + 0] = 1.3; diamondColors[i * 3 + 1] = 1.3; diamondColors[i * 3 + 2] = 1.4; // Diamond pure glint
      }
    }

    const diamondGeo = new THREE.BufferGeometry();
    diamondGeo.setAttribute('position', new THREE.BufferAttribute(diamondPos, 3));
    diamondGeo.setAttribute('color', new THREE.BufferAttribute(diamondColors, 3));
    this.disposables.push(diamondGeo);

    const diamondMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 1.8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.disposables.push(diamondMat);

    this.diamondDust = new THREE.Points(diamondGeo, diamondMat);
    this.diamondBase = diamondBase;
    this.diamondVel = diamondVel;
    this.diamondCount = diamondCount;
    this.group.add(this.diamondDust);

    scene.add(this.group);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Aurora Descent, Crystallization, Climax, and Fracture Cycle
    // 0 - 10s: Flowing fluid auroras in deep sky
    // 10 - 22s: Curtains descend toward tundra
    // 16 - 28s: Progressive crystallization into solid crystal architecture
    // 28 - 38s: Climax suspended crystal cathedral with prismatic light
    // 38 - 46s: Fracture lines spread, crystal shatters skyward into ribbons
    // 46 - 50s: Return to tranquil fluid sky
    const descentFactor = smoothstep(8, 20, t) * (1.0 - smoothstep(38, 47, t));
    const crystalFactor = smoothstep(14, 26, t) * (1.0 - smoothstep(37, 46, t));
    const fractureFactor = smoothstep(36, 42, t) * (1.0 - smoothstep(44, 48, t));

    this.auroraUniforms.uTime.value = t;
    this.auroraUniforms.uDescent.value = smootherstep(0, 1, descentFactor);
    this.auroraUniforms.uCrystal.value = smootherstep(0, 1, crystalFactor);
    this.auroraUniforms.uFracture.value = fractureFactor;

    this.snowMat.uniforms.uTime.value = t;
    this.snowMat.uniforms.uPrismIntensity.value = crystalFactor;

    // Diamond Dust Ice Fog Dispersion Animation
    if (this.diamondDust) {
      const dustOpacity = (crystalFactor * 0.45 + fractureFactor * 0.9);
      this.diamondDust.material.opacity = dustOpacity;

      if (dustOpacity > 0.01) {
        const pos = this.diamondDust.geometry.attributes.position.array;
        for (let i = 0; i < this.diamondCount; i++) {
          const idx = i * 3;
          // When fracture is active, explosive upward and lateral dispersal
          const f = fractureFactor * 45.0;
          pos[idx + 0] = this.diamondBase[idx + 0] + this.diamondVel[idx + 0] * f + Math.sin(t * 2.0 + i) * 1.5;
          pos[idx + 1] = this.diamondBase[idx + 1] + this.diamondVel[idx + 1] * f + Math.cos(t * 1.5 + i) * 1.2;
          pos[idx + 2] = this.diamondBase[idx + 2] + this.diamondVel[idx + 2] * f;
        }
        this.diamondDust.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Cinematic Camera Choreography
    let camPos = new THREE.Vector3();
    let target = new THREE.Vector3(0, 30, 0);

    if (t < 14) {
      // Skimming snow tundra looking up at majestic auroral curtains
      const p = t / 14;
      camPos.set(Math.sin(p * 1.5) * 45, 4 + p * 6, 120 - p * 30);
      target.set(0, 45, 0);
    } else if (t < 28) {
      // Sweeping between descending curtains as they solidify into crystal arches
      const p = (t - 14) / 14;
      camPos.set(Math.cos(p * 2.2) * 55, 12 + p * 10, 70 - p * 80);
      target.set(0, 20, 0);
    } else if (t < 40) {
      // Gliding through immense suspended crystalline structures
      const p = (t - 28) / 12;
      camPos.set(Math.sin(p * 2.0 + 0.6) * 65, 24 + Math.sin(p * Math.PI) * 8, Math.cos(p * 2.0 + 0.6) * 65);
      target.set(0, 22, 0);
    } else {
      // Ascending as crystal fractures into radiant motes that surge back into sky
      const p = (t - 40) / 10;
      camPos.set(Math.cos(2.5 + p * 0.8) * 90, 28 + p * 35, Math.sin(2.5 + p * 0.8) * 90);
      target.set(0, 50, 0);
    }

    this.camera.position.copy(camPos);
    this.camera.lookAt(target);
  }

  render(renderer) {
    renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.scene.remove(this.group);
    this.disposables.forEach(d => {
      if (d && typeof d.dispose === 'function') d.dispose();
    });
    this.disposables = [];
  }
}
