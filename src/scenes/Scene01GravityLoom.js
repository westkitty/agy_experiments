import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';
import { GLSL_NOISE } from '../common/ShaderChunks.js';

/**
 * EXPERIMENT 01 — THE GRAVITY LOOM
 * A nearly infinite golden cosmic membrane stretched across astronomical void.
 * Interwoven luminous filaments deformed by three dark celestial masses.
 * Climax: membrane splits along a luminous seam, exposing a second woven universe underneath.
 */
export class Scene01GravityLoom {
  constructor() {
    this.name = 'The Gravity Loom';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x020306);
    scene.fog = new THREE.FogExp2(0x020306, 0.005);

    // Setup Camera defaults
    camera.fov = 50;
    camera.near = 0.5;
    camera.far = 1500;
    camera.updateProjectionMatrix();

    // Subtle cosmic ambient light
    const ambientLight = new THREE.AmbientLight(0x1a2030, 1.2);
    this.group.add(ambientLight);

    // Celestial masses (three dark obsidian spheres with rim glow)
    this.celestialMasses = [];
    const sphereGeo = new THREE.SphereGeometry(4.5, 32, 32);
    this.disposables.push(sphereGeo);

    const massMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRimColor: { value: new THREE.Color(0xe0b560) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uRimColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.5);
          vec3 darkCore = vec3(0.015, 0.018, 0.025);
          vec3 finalColor = mix(darkCore, uRimColor * 1.5, fresnel);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(massMat);

    // Accretion halo ring geometry
    const ringGeo = new THREE.TorusGeometry(6.4, 0.35, 8, 32);
    ringGeo.rotateX(Math.PI / 2.3);
    this.disposables.push(ringGeo);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd277,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    this.disposables.push(ringMat);

    for (let i = 0; i < 3; i++) {
      const massGroup = new THREE.Group();
      const sphere = new THREE.Mesh(sphereGeo, massMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      massGroup.add(sphere);
      massGroup.add(ring);
      this.group.add(massGroup);

      this.celestialMasses.push({
        group: massGroup,
        mesh: sphere,
        ring,
        baseAngle: (i * Math.PI * 2) / 3,
        radius: 35 + i * 15,
        speed: 0.35 + i * 0.1,
        pos: new THREE.Vector3()
      });
    }

    // 1. Primary Upper Membrane (140 x 140 segments for peak 60fps performance and high fidelity)
    const membraneGeo = new THREE.PlaneGeometry(360, 360, 140, 140);
    membraneGeo.rotateX(-Math.PI / 2);
    this.disposables.push(membraneGeo);

    this.membraneUniforms = {
      uTime: { value: 0 },
      uMass1: { value: new THREE.Vector3() },
      uMass2: { value: new THREE.Vector3() },
      uMass3: { value: new THREE.Vector3() },
      uSplitAmount: { value: 0 },
      uClimaxFactor: { value: 0 }
    };

    const membraneMat = new THREE.ShaderMaterial({
      uniforms: this.membraneUniforms,
      wireframe: false,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        ${GLSL_NOISE}
        uniform float uTime;
        uniform vec3 uMass1;
        uniform vec3 uMass2;
        uniform vec3 uMass3;
        uniform float uSplitAmount;
        uniform float uClimaxFactor;

        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vDeformation;
        varying float vSeamMask;
        varying float vDistToSeam;

        float getGravityWell(vec3 pos, vec3 massPos, float strength, float radius) {
          float d = length(pos.xz - massPos.xz);
          float well = -strength / (d * d * 0.0035 + 1.0);
          float wave = sin(d * 0.18 - uTime * 2.5) * exp(-d * 0.02) * 2.2;
          return well + wave;
        }

        void main() {
          vUv = uv;
          vec3 p = position;

          // Seam calculation along z-axis: split at x ~ sin(z * 0.035) * 18.0
          float seamCenter = sin(p.z * 0.035) * 18.0;
          float distToSeam = p.x - seamCenter;
          vDistToSeam = distToSeam;
          float seamWidth = 14.0;
          float seamFactor = smoothstep(seamWidth, 0.0, abs(distToSeam));
          vSeamMask = seamFactor;

          // Pull geometry apart along the seam during climax
          if (uSplitAmount > 0.001) {
            float side = sign(distToSeam);
            float splitDisplacement = side * pow(seamFactor, 1.2) * (uSplitAmount * 36.0);
            p.x += splitDisplacement;
            p.y -= seamFactor * uSplitAmount * 12.0;
          }

          // Gravitational wells from 3 masses
          float g1 = getGravityWell(p, uMass1, 28.0, 40.0);
          float g2 = getGravityWell(p, uMass2, 24.0, 35.0);
          float g3 = getGravityWell(p, uMass3, 20.0, 30.0);
          float totalWell = g1 + g2 + g3;

          // Traveling micro-waves on the membrane
          float microWaves = snoise(vec3(p.x * 0.02, p.z * 0.02, uTime * 0.35)) * 4.5;
          p.y += totalWell + microWaves;

          vDeformation = abs(totalWell) * 0.035;

          vec4 worldPos = modelMatrix * vec4(p, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSplitAmount;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vDeformation;
        varying float vSeamMask;
        varying float vDistToSeam;

        void main() {
          // Clean dimensional tear: discard fragments inside the open rift
          if (uSplitAmount > 0.01 && abs(vDistToSeam) < (uSplitAmount * 24.0)) {
            discard;
          }

          // Filament weave pattern
          vec2 grid = abs(fract(vUv * 90.0) - 0.5);
          float line = min(grid.x, grid.y);
          float filament = smoothstep(0.07, 0.01, line);

          // Deep woven gold coloring
          vec3 goldBase = vec3(0.85, 0.65, 0.25);
          vec3 goldHot = vec3(1.0, 0.92, 0.65);
          vec3 deepVoid = vec3(0.02, 0.025, 0.04);

          vec3 color = mix(deepVoid, goldBase, filament * 0.85);
          color += goldHot * (filament * vDeformation * 1.4);

          // Luminous seam lip glow right at tear boundary
          float lipDist = abs(abs(vDistToSeam) - (uSplitAmount * 24.0));
          float lipGlow = exp(-lipDist * 0.4) * uSplitAmount * 3.5;
          color += vec3(1.0, 0.95, 0.7) * lipGlow;

          // Rim lighting
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - abs(dot(viewDir, vec3(0.0, 1.0, 0.0))), 2.5);
          color += goldBase * fresnel * 0.45;

          // Fade edges of the infinite plane
          float dist = length(vWorldPos.xz);
          float edgeAlpha = 1.0 - smoothstep(120.0, 175.0, dist);

          gl_FragColor = vec4(color, edgeAlpha * (0.85 + filament * 0.15));
        }
      `
    });
    this.disposables.push(membraneMat);

    this.membraneMesh = new THREE.Mesh(membraneGeo, membraneMat);
    this.group.add(this.membraneMesh);

    // 2. Second Underneath Woven Universe (visible through the tear)
    const subLoomGeo = new THREE.PlaneGeometry(360, 360, 100, 100);
    subLoomGeo.rotateX(-Math.PI / 2);
    this.disposables.push(subLoomGeo);

    const subLoomMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      transparent: true,
      vertexShader: `
        ${GLSL_NOISE}
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vec3 p = position;
          p.y -= 28.0; // Suspended deep beneath the primary membrane
          p.y += snoise(vec3(p.x * 0.03, p.z * 0.03, uTime * 0.2)) * 6.0;
          vec4 worldPos = modelMatrix * vec4(p, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          // Complex cyan/violet intricate secondary matrix
          vec2 g1 = abs(fract(vUv * 160.0) - 0.5);
          vec2 g2 = abs(fract(vUv * 80.0 + 0.25) - 0.5);
          float f1 = smoothstep(0.06, 0.01, min(g1.x, g1.y));
          float f2 = smoothstep(0.05, 0.01, min(g2.x, g2.y));

          vec3 cyanGlow = vec3(0.2, 0.8, 0.95);
          vec3 violetGlow = vec3(0.65, 0.25, 0.9);
          vec3 col = mix(vec3(0.01, 0.015, 0.03), cyanGlow, f1 * 0.9);
          col = mix(col, violetGlow, f2 * 0.7);

          float edgeFade = 1.0 - smoothstep(100.0, 170.0, length(vWorldPos.xz));
          gl_FragColor = vec4(col, edgeFade * 0.9);
        }
      `
    });
    this.disposables.push(subLoomMat);

    this.subLoomMesh = new THREE.Mesh(subLoomGeo, subLoomMat);
    this.group.add(this.subLoomMesh);

    // Background cosmic starfield particles
    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3 + 0] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 400 - 50;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.disposables.push(starGeo);

    const starMat = new THREE.PointsMaterial({
      color: 0xd4af37,
      size: 1.8,
      transparent: true,
      opacity: 0.65
    });
    this.disposables.push(starMat);

    this.stars = new THREE.Points(starGeo, starMat);
    this.group.add(this.stars);

    scene.add(this.group);
  }

  update(time, deltaTime, progress) {
    // Deterministic cycle loop (duration 50s)
    const t = (time % this.duration);

    // Update Celestial Masses motion
    this.celestialMasses.forEach((cm, idx) => {
      const angle = cm.baseAngle + t * cm.speed * 0.25;
      const r = cm.radius + Math.sin(t * 0.4 + idx) * 8;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      // Dive lower toward the membrane between t=15 and t=35
      const diveFactor = smoothstep(12, 28, t) * (1.0 - smoothstep(36, 46, t));
      const y = 8.0 - diveFactor * 14.0 + Math.sin(t * 0.8 + idx) * 2.0;

      cm.pos.set(x, y, z);
      cm.group.position.copy(cm.pos);
      if (cm.ring) cm.ring.rotation.z = t * (1.2 + idx * 0.4);
    });

    // Update membrane uniforms
    this.membraneUniforms.uTime.value = t;
    this.membraneUniforms.uMass1.value.copy(this.celestialMasses[0].pos);
    this.membraneUniforms.uMass2.value.copy(this.celestialMasses[1].pos);
    this.membraneUniforms.uMass3.value.copy(this.celestialMasses[2].pos);

    // Climax: membrane splits along the seam (peaks around t = 30-40, closes by t = 46)
    const splitProgress = smoothstep(25, 34, t) * (1.0 - smoothstep(39, 47, t));
    this.membraneUniforms.uSplitAmount.value = smootherstep(0, 1, splitProgress);

    // Cinematic Camera Choreography
    // Phase 1 (0-15s): Wide establishing flyover
    // Phase 2 (15-28s): Swoop low into the deep gravitational folds
    // Phase 3 (28-40s): Climax flyover directly through the tearing seam peering down
    // Phase 4 (40-50s): Smooth pull-back restoring wide cosmic tranquility
    let camPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3(0, -6, 0);

    if (t < 15) {
      const p = t / 15;
      camPos.set(
        Math.cos(p * 0.6 + 0.3) * 110,
        45 - p * 15,
        Math.sin(p * 0.6 + 0.3) * 110
      );
      lookTarget.set(0, -5, 0);
    } else if (t < 28) {
      const p = (t - 15) / 13;
      camPos.set(
        Math.cos(1.2 + p * 1.1) * (80 - p * 30),
        25 - Math.sin(p * Math.PI) * 16,
        Math.sin(1.2 + p * 1.1) * (80 - p * 30)
      );
      lookTarget.copy(this.celestialMasses[0].pos);
    } else if (t < 40) {
      const p = (t - 28) / 12;
      // High-angle dramatic flythrough peering down through the split seam
      camPos.set(
        Math.sin(p * 1.4) * 15,
        22 - p * 8,
        -50 + p * 100
      );
      lookTarget.set(0, -18, -20 + p * 80);
    } else {
      const p = (t - 40) / 10;
      camPos.set(
        Math.cos(2.8 + p * 0.8) * (50 + p * 60),
        14 + p * 31,
        Math.sin(2.8 + p * 0.8) * (50 + p * 60)
      );
      lookTarget.set(0, -4, 0);
    }

    this.camera.position.copy(camPos);
    this.camera.lookAt(lookTarget);
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
