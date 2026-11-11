import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';
import { GLSL_NOISE } from '../common/ShaderChunks.js';

/**
 * EXPERIMENT 10 — THE CHROMATIC TIDE
 * Immense metropolis initially in shades of gray.
 * Advancing wave of liquid pigment expands from horizon.
 * Flows through streets, climbs building facades; material-dependent response:
 * (glass refracts, metal reflects, concrete absorbs, water carries).
 * Climax hyper-chromatic city, then colored tide recedes back to monochrome.
 */
export class Scene10ChromaticTide {
  constructor() {
    this.name = 'The Chromatic Tide';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x0e1014);
    scene.fog = new THREE.FogExp2(0x0e1014, 0.0035);

    camera.fov = 48;
    camera.near = 0.5;
    camera.far = 1800;
    camera.updateProjectionMatrix();

    const amb = new THREE.AmbientLight(0x282c35, 1.2);
    this.group.add(amb);

    this.skyLight = new THREE.DirectionalLight(0xdde2ec, 1.8);
    this.skyLight.position.set(60, 120, 80);
    this.group.add(this.skyLight);

    // Shared uniforms for chromatic wave propagation
    this.chromaticUniforms = {
      uTime: { value: 0 },
      uWaveRadius: { value: 0 },
      uWaveOrigin: { value: new THREE.Vector2(0, -220) },
      uMaxColor: { value: 0 }
    };

    // 1. Water Canal / Ground Plane
    const groundGeo = new THREE.PlaneGeometry(600, 600, 60, 60);
    groundGeo.rotateX(-Math.PI / 2);
    this.disposables.push(groundGeo);

    this.groundMat = new THREE.ShaderMaterial({
      uniforms: this.chromaticUniforms,
      vertexShader: `
        ${GLSL_NOISE}
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        ${GLSL_NOISE}
        uniform float uTime;
        uniform float uWaveRadius;
        uniform vec2 uWaveOrigin;
        varying vec3 vWorldPos;
        varying vec2 vUv;

        void main() {
          float dist = length(vWorldPos.xz - uWaveOrigin);
          float waveFront = uWaveRadius - dist;
          float chromaticFactor = smoothstep(-15.0, 15.0, waveFront);

          // Monochrome water: dark gray slate
          vec3 monoWater = vec3(0.08, 0.09, 0.11);

          // Liquid pigment water: swirling turquoise and molten gold currents
          float flow = snoise(vec3(vWorldPos.xz * 0.03, uTime * 0.5));
          vec3 colorWater = mix(vec3(0.05, 0.75, 0.85), vec3(1.0, 0.75, 0.2), flow * 0.5 + 0.5);

          // Foaming white-hot crest along the advancing wave front
          float crest = exp(-pow(waveFront, 2.0) * 0.02) * step(0.0, uWaveRadius);

          vec3 finalColor = mix(monoWater, colorWater, chromaticFactor);
          finalColor += vec3(1.2, 1.1, 0.9) * crest;

          // Horizon distance fog
          float d = length(vWorldPos.xz);
          float fog = 1.0 - exp(-d * 0.0035);
          vec3 fogCol = mix(vec3(0.08, 0.09, 0.12), vec3(0.35, 0.15, 0.3), chromaticFactor * 0.5);
          finalColor = mix(finalColor, fogCol, fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(this.groundMat);

    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMat);
    this.groundMesh.position.y = 0;
    this.group.add(this.groundMesh);

    // 2. Procedural City Skyscrapers (Instanced with material responses)
    this.buildingCount = 85;
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    this.disposables.push(bGeo);

    const buildingMat = new THREE.ShaderMaterial({
      uniforms: this.chromaticUniforms,
      vertexShader: `
        attribute float aMatType; // 0 = Concrete, 1 = Glass, 2 = Metal
        attribute vec3 aBaseScale;
        attribute vec3 aBasePos;

        uniform float uTime;
        uniform float uWaveRadius;
        uniform vec2 uWaveOrigin;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vMatType;
        varying float vChromaticFactor;
        varying float vCrest;

        void main() {
          vMatType = aMatType;
          vNormal = normalize(normalMatrix * normal);

          vec3 scaledPos = position * aBaseScale;
          scaledPos.y += aBaseScale.y * 0.5; // Sit on ground
          vec3 worldP = aBasePos + scaledPos;
          vWorldPos = worldP;

          // Advancing wave front with height delay (climbing building facades)
          float dist = length(aBasePos.xz - uWaveOrigin);
          float climbOffset = worldP.y * 0.75; // Color climbs upward
          float waveFront = uWaveRadius - (dist + climbOffset);

          vChromaticFactor = smoothstep(-10.0, 12.0, waveFront);
          vCrest = exp(-pow(waveFront, 2.0) * 0.03);

          gl_Position = projectionMatrix * viewMatrix * vec4(worldP, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying float vMatType;
        varying float vChromaticFactor;
        varying float vCrest;

        void main() {
          // MONOCHROME BASE (Grayscale)
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float NdotV = max(dot(viewDir, vNormal), 0.0);
          float fresnel = pow(1.0 - NdotV, 3.0);

          vec3 monoCol = vec3(0.22, 0.23, 0.25);
          if (vMatType > 0.5 && vMatType < 1.5) {
            // Glass (gray specular)
            monoCol = vec3(0.12, 0.14, 0.16) + vec3(0.5) * fresnel;
          } else if (vMatType >= 1.5) {
            // Metal (gray metallic)
            monoCol = vec3(0.4, 0.42, 0.45);
          }

          // CHROMATIC AWAKENING PER MATERIAL
          vec3 colorCol = monoCol;
          if (vMatType < 0.5) {
            // CONCRETE: Absorbs deep matte cobalt, crimson, violet, emerald
            float seed = fract(sin(dot(floor(vWorldPos.xz / 20.0), vec2(12.98, 78.23))) * 43758.5);
            vec3 cobalt = vec3(0.1, 0.35, 0.88);
            vec3 crimson = vec3(0.88, 0.15, 0.25);
            vec3 emerald = vec3(0.08, 0.78, 0.45);
            vec3 violet = vec3(0.65, 0.2, 0.85);

            vec3 choice = mix(cobalt, crimson, step(0.25, seed));
            choice = mix(choice, emerald, step(0.5, seed));
            choice = mix(choice, violet, step(0.75, seed));
            colorCol = choice * (0.8 + 0.2 * NdotV);
          } else if (vMatType < 1.5) {
            // GLASS: Prismatic refraction, luminous cyan & violet internal sheen
            vec3 prism = vec3(
              0.5 + 0.5 * sin(vWorldPos.y * 0.15 + uTime),
              0.5 + 0.5 * sin(vWorldPos.y * 0.15 + uTime + 2.0),
              0.5 + 0.5 * sin(vWorldPos.y * 0.15 + uTime + 4.0)
            );
            colorCol = mix(vec3(0.1, 0.85, 0.95), prism, 0.6) + vec3(1.2) * fresnel;
          } else {
            // METAL: Reflects molten gold and iridescent copper
            vec3 moltenGold = vec3(1.0, 0.82, 0.35);
            colorCol = moltenGold * (0.9 + 0.5 * fresnel);
          }

          vec3 finalColor = mix(monoCol, colorCol, vChromaticFactor);
          // Foaming wave crest
          finalColor += vec3(1.2, 1.15, 0.95) * vCrest;

          // Distance fog
          float d = length(vWorldPos.xz);
          float fog = 1.0 - exp(-d * 0.0035);
          finalColor = mix(finalColor, vec3(0.1, 0.12, 0.16), fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(buildingMat);

    this.instancedBuildings = new THREE.InstancedMesh(bGeo, buildingMat, this.buildingCount);

    const basePositions = new Float32Array(this.buildingCount * 3);
    const baseScales = new Float32Array(this.buildingCount * 3);
    const matTypes = new Float32Array(this.buildingCount);
    const dummy = new THREE.Object3D();

    let bIdx = 0;
    for (let gx = -4; gx <= 4; gx++) {
      for (let gz = -4; gz <= 4; gz++) {
        if (bIdx >= this.buildingCount) break;
        // Skip central canal river corridor
        if (Math.abs(gx) === 0) continue;

        const x = gx * 22 + (Math.random() - 0.5) * 6;
        const z = gz * 26 - 40 + (Math.random() - 0.5) * 6;
        const width = 10 + Math.random() * 8;
        const depth = 10 + Math.random() * 8;
        const height = 24 + Math.random() * 68; // Soaring towers

        basePositions[bIdx * 3 + 0] = x;
        basePositions[bIdx * 3 + 1] = 0;
        basePositions[bIdx * 3 + 2] = z;

        baseScales[bIdx * 3 + 0] = width;
        baseScales[bIdx * 3 + 1] = height;
        baseScales[bIdx * 3 + 2] = depth;

        matTypes[bIdx] = bIdx % 3; // 0 = Concrete, 1 = Glass, 2 = Metal

        dummy.position.set(x, 0, z);
        dummy.updateMatrix();
        this.instancedBuildings.setMatrixAt(bIdx, dummy.matrix);
        bIdx++;
      }
    }

    bGeo.setAttribute('aBasePos', new THREE.InstancedBufferAttribute(basePositions, 3));
    bGeo.setAttribute('aBaseScale', new THREE.InstancedBufferAttribute(baseScales, 3));
    bGeo.setAttribute('aMatType', new THREE.InstancedBufferAttribute(matTypes, 1));
    this.instancedBuildings.instanceMatrix.needsUpdate = true;
    this.group.add(this.instancedBuildings);

    // Horizon Color Point Beacon (sparks and ignites at t = 8)
    const beaconGeo = new THREE.SphereGeometry(3.5, 16, 16);
    this.disposables.push(beaconGeo);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    this.disposables.push(this.beaconMat);

    this.beaconMesh = new THREE.Mesh(beaconGeo, this.beaconMat);
    this.beaconMesh.position.set(0, 18, -220);
    this.group.add(this.beaconMesh);

    scene.add(this.group);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Chromatic Tide Advance, Climax, and Recession Cycle
    // 0 - 8s: Monochromatic city, tiny color point ignites on horizon
    // 8 - 28s: Liquid pigment wave advances across the metropolis (radius 0 -> 360)
    // 28 - 38s: Climax — entire city submerged in hyper-saturated chromatic beauty
    // 38 - 48s: Wave recedes back to horizon, draining color and returning city to monochrome
    // 48 - 50s: Return to tranquil grayscale
    let radius = 0;
    if (t < 8) {
      radius = 0;
      // Horizon beacon ignition
      this.beaconMat.opacity = smoothstep(4, 7.8, t) * 0.9;
    } else if (t < 28) {
      const p = (t - 8) / 20;
      radius = smootherstep(0, 1, p) * 360.0;
      this.beaconMat.opacity = 1.0;
    } else if (t < 38) {
      radius = 360.0; // Fully submerged in color
      this.beaconMat.opacity = 1.0;
    } else if (t < 48) {
      const p = (t - 38) / 10;
      radius = (1.0 - smootherstep(0, 1, p)) * 360.0;
      this.beaconMat.opacity = 1.0 - p;
    } else {
      radius = 0;
      this.beaconMat.opacity = 0;
    }

    this.chromaticUniforms.uTime.value = t;
    this.chromaticUniforms.uWaveRadius.value = radius;

    // Sky and Ambient color response
    const climaxFactor = smoothstep(22, 32, t) * (1.0 - smoothstep(38, 46, t));
    const skyCol = new THREE.Color().lerpColors(
      new THREE.Color(0x0e1014),
      new THREE.Color(0x28122a),
      climaxFactor
    );
    this.scene.background = skyCol;
    this.scene.fog.color = skyCol;

    // Cinematic Camera Choreography
    let camPos = new THREE.Vector3();
    let target = new THREE.Vector3(0, 20, -50);

    if (t < 12) {
      // High establishing shot of the moody monochrome metropolis
      const p = t / 12;
      camPos.set(Math.sin(p * 1.2) * 50, 75 - p * 15, 120 - p * 30);
      target.set(0, 25, -60);
    } else if (t < 26) {
      // Swooping down into the street canyon as color surges along the avenue
      const p = (t - 12) / 14;
      camPos.set(Math.cos(p * 2.0) * 22, 14 + Math.sin(p * Math.PI) * 16, 40 - p * 90);
      target.set(0, 30, -100);
    } else if (t < 40) {
      // High-altitude panoramic overview of the fully saturated radiant metropolis at climax
      const p = (t - 26) / 14;
      camPos.set(Math.sin(p * 1.8 + 0.6) * 110, 85 + Math.sin(p * Math.PI) * 15, Math.cos(p * 1.8 + 0.6) * 110);
      target.set(0, 30, -40);
    } else {
      // Descending back down as the pigment recedes to the horizon, returning to monochrome
      const p = (t - 40) / 10;
      camPos.set(Math.cos(2.4 + p * 0.8) * 85, 85 - p * 25, Math.sin(2.4 + p * 0.8) * 85);
      target.set(0, 25, -40);
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
