import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';

/**
 * EXPERIMENT 05 — THE HOURGLASS OF KINGDOMS
 * Enormous antique hourglass floating in darkness; bronze frame & glass chambers.
 * Upper ancient city dissolves into glowing grains, falls through narrow neck,
 * and reconstructs into a completely different civilization in the lower chamber.
 * Camera follows through the neck, then reverses to restore the beginning.
 */
export class Scene05HourglassKingdoms {
  constructor() {
    this.name = 'The Hourglass of Kingdoms';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x040306);
    scene.fog = new THREE.FogExp2(0x040306, 0.004);

    camera.fov = 48;
    camera.near = 0.5;
    camera.far = 1400;
    camera.updateProjectionMatrix();

    // Warm dramatic lighting
    const amb = new THREE.AmbientLight(0x282018, 1.2);
    this.group.add(amb);

    this.topLight = new THREE.DirectionalLight(0xffdfa0, 2.2);
    this.topLight.position.set(40, 80, 50);
    this.group.add(this.topLight);

    this.bottomLight = new THREE.DirectionalLight(0xe09840, 1.8);
    this.bottomLight.position.set(-40, -80, -40);
    this.group.add(this.bottomLight);

    // 1. Antique Bronze Hourglass Frame
    this.createHourglassFrame();

    // 2. Dual Kingdom Transfer Particle System (1400 instanced building grains)
    this.grainCount = 1400;
    this.grains = [];

    const grainGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    this.disposables.push(grainGeo);

    // Custom shader material for building grains
    this.grainUniforms = {
      uTime: { value: 0 },
      uTransferProgress: { value: 0 }
    };

    const grainMat = new THREE.ShaderMaterial({
      uniforms: this.grainUniforms,
      vertexShader: `
        attribute vec3 aUpperPos;
        attribute vec3 aLowerPos;
        attribute float aGrainDelay;
        attribute float aSwirlPhase;

        uniform float uTime;
        uniform float uTransferProgress;

        varying vec3 vWorldPos;
        varying float vIsGlow;

        void main() {
          // Individual grain progress based on transfer wave
          float p = clamp((uTransferProgress - aGrainDelay) * 1.8, 0.0, 1.0);
          float s = smoothstep(0.0, 1.0, p);

          vec3 pos = position;
          vec3 currentPos = aUpperPos;

          if (s > 0.0001 && s < 0.9999) {
            // In transit between upper and lower kingdom
            float height = mix(aUpperPos.y, aLowerPos.y, s);
            float neckCloseness = 1.0 - abs(height) / 35.0;
            // Funnel constriction with high centrifugal acceleration through waist
            float r = mix(length(aUpperPos.xz), 0.35, clamp(neckCloseness * 1.4, 0.0, 1.0));
            // Centrifugal spiral velocity peaks at neck y = 0
            float spinSpeed = (1.0 + neckCloseness * 3.5);
            float angle = aSwirlPhase + uTime * 3.5 * spinSpeed + s * 14.13;

            currentPos = vec3(cos(angle) * r, height, sin(angle) * r);
            vIsGlow = 1.0;
          } else if (s >= 0.9999) {
            currentPos = aLowerPos;
            vIsGlow = 0.0;
          } else {
            currentPos = aUpperPos;
            vIsGlow = 0.0;
          }

          vec4 worldPos = modelMatrix * vec4(currentPos + pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying float vIsGlow;

        void main() {
          // Antique carved limestone / bronze architectural material with sculptural depth
          vec3 stoneColor = vec3(0.76, 0.62, 0.45);
          vec3 glowColor = vec3(1.2, 0.95, 0.55);

          // Friction glow during high-velocity neck constriction
          float neckHeat = clamp(1.0 - abs(vWorldPos.y) / 9.0, 0.0, 1.0) * vIsGlow;
          vec3 hotEmber = vec3(1.3, 0.65, 0.2);

          // Block face shading for architectural relief
          float depthShade = 0.75 + 0.25 * sin(vWorldPos.y * 3.0);

          vec3 baseStone = stoneColor * depthShade;
          vec3 col = mix(baseStone, glowColor * 2.2, vIsGlow);
          col += hotEmber * (neckHeat * 1.8);

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.disposables.push(grainMat);

    this.instancedGrains = new THREE.InstancedMesh(grainGeo, grainMat, this.grainCount);

    const upperPositions = new Float32Array(this.grainCount * 3);
    const lowerPositions = new Float32Array(this.grainCount * 3);
    const delays = new Float32Array(this.grainCount);
    const swirlPhases = new Float32Array(this.grainCount);

    // Generate Upper Ancient City Coordinates (Gothic / Babylonian Spired Architecture)
    // and Lower Modern Civilization Coordinates (Domes, Radial Arches, Tiered Bridges)
    for (let i = 0; i < this.grainCount; i++) {
      // Upper City: Stepped citadel with high spires (y from +8 to +34)
      const uTower = i % 8;
      const uAngle = (uTower * Math.PI * 2) / 8;
      const uDist = (uTower === 0) ? 0 : (6 + (i % 5) * 2.2);
      const uHeight = (uTower === 0) ? (14 + (i % 40) * 0.5) : (8 + (i % 25) * 0.45);
      const ux = Math.cos(uAngle) * uDist + ((i % 3) - 1) * 0.8;
      const uz = Math.sin(uAngle) * uDist + (((i + 1) % 3) - 1) * 0.8;
      const uy = 6 + (i % 30) * 0.9;

      upperPositions[i * 3 + 0] = ux;
      upperPositions[i * 3 + 1] = Math.min(uy, 34);
      upperPositions[i * 3 + 2] = uz;

      // Lower City: Sweeping Domes & Concentric Arches (y from -34 to -8)
      const lRing = i % 6;
      const lAngle = (i / this.grainCount) * Math.PI * 2 * 12;
      const lRadius = 3.0 + lRing * 2.8;
      // Dome curvature
      const lDomeHeight = Math.cos(clamp(lRadius / 18.0, 0, 1) * Math.PI * 0.5) * 14.0;
      const lx = Math.cos(lAngle) * lRadius;
      const lz = Math.sin(lAngle) * lRadius;
      const ly = -32.0 + lDomeHeight + ((i % 4) * 0.9);

      lowerPositions[i * 3 + 0] = lx;
      lowerPositions[i * 3 + 1] = Math.min(ly, -8.0);
      lowerPositions[i * 3 + 2] = lz;

      // Delay based on upper height (higher blocks dissolve first)
      delays[i] = 1.0 - (upperPositions[i * 3 + 1] - 6.0) / 28.0;
      delays[i] = clamp(delays[i] * 0.7 + (Math.random() * 0.15), 0.0, 0.85);

      swirlPhases[i] = Math.random() * Math.PI * 2;
    }

    grainGeo.setAttribute('aUpperPos', new THREE.InstancedBufferAttribute(upperPositions, 3));
    grainGeo.setAttribute('aLowerPos', new THREE.InstancedBufferAttribute(lowerPositions, 3));
    grainGeo.setAttribute('aGrainDelay', new THREE.InstancedBufferAttribute(delays, 1));
    grainGeo.setAttribute('aSwirlPhase', new THREE.InstancedBufferAttribute(swirlPhases, 1));

    this.group.add(this.instancedGrains);

    scene.add(this.group);
  }

  createHourglassFrame() {
    // 1. Bronze Top & Bottom Plinths
    const plinthGeo = new THREE.CylinderGeometry(24, 25, 4.0, 36);
    this.disposables.push(plinthGeo);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8a5828,
      metalness: 0.85,
      roughness: 0.35
    });
    this.disposables.push(bronzeMat);

    const topPlinth = new THREE.Mesh(plinthGeo, bronzeMat);
    topPlinth.position.y = 39;
    this.group.add(topPlinth);

    const bottomPlinth = new THREE.Mesh(plinthGeo, bronzeMat);
    bottomPlinth.position.y = -39;
    this.group.add(bottomPlinth);

    // 2. Four Ornate Bronze Supporting Columns
    const colGeo = new THREE.CylinderGeometry(1.2, 1.2, 78, 16);
    this.disposables.push(colGeo);

    for (let c = 0; c < 4; c++) {
      const angle = (c * Math.PI * 2) / 4;
      const col = new THREE.Mesh(colGeo, bronzeMat);
      col.position.set(Math.cos(angle) * 22, 0, Math.sin(angle) * 22);
      this.group.add(col);
    }

    // 3. Central Bronze Ring & Astronomical Astrolabe Gimbal Rings at Waist
    const waistGeo = new THREE.TorusGeometry(3.6, 0.9, 16, 32);
    waistGeo.rotateX(Math.PI / 2);
    this.disposables.push(waistGeo);
    const waistMesh = new THREE.Mesh(waistGeo, bronzeMat);
    waistMesh.position.y = 0;
    this.group.add(waistMesh);

    // Inner & Outer Astrolabe Gimbal Rings with Celestial Graduations
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a048,
      metalness: 0.9,
      roughness: 0.25
    });
    this.disposables.push(brassMat);

    const innerGimbalGeo = new THREE.TorusGeometry(5.8, 0.3, 16, 48);
    this.disposables.push(innerGimbalGeo);
    this.astrolabeInner = new THREE.Mesh(innerGimbalGeo, brassMat);
    this.astrolabeInner.rotation.x = Math.PI / 2;
    this.group.add(this.astrolabeInner);

    const outerGimbalGeo = new THREE.TorusGeometry(8.2, 0.35, 16, 48);
    this.disposables.push(outerGimbalGeo);
    this.astrolabeOuter = new THREE.Mesh(outerGimbalGeo, brassMat);
    this.astrolabeOuter.rotation.x = Math.PI / 2;
    this.group.add(this.astrolabeOuter);

    // 4. Double Glass Bulbs
    // Curve for hourglass profile
    const glassPoints = [];
    for (let y = -37; y <= 37; y += 1.5) {
      // Waisted profile
      const waistFactor = Math.abs(y) / 37.0;
      const radius = 2.4 + Math.sin(waistFactor * Math.PI * 0.9) * 18.0;
      glassPoints.push(new THREE.Vector2(radius, y));
    }
    const glassGeo = new THREE.LatheGeometry(glassPoints, 36);
    this.disposables.push(glassGeo);

    const glassMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uCamPos: { value: new THREE.Vector3() }
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
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.8);
          vec3 glassHighlight = vec3(0.9, 0.95, 1.0) * (fresnel * 0.65 + 0.04);
          gl_FragColor = vec4(glassHighlight, fresnel * 0.4 + 0.08);
        }
      `
    });
    this.disposables.push(glassMat);

    this.glassMesh = new THREE.Mesh(glassGeo, glassMat);
    this.group.add(this.glassMesh);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Geometry-to-Particle Transfer Progress
    // 0 - 8s: Upper city intact, majestic initial state
    // 8 - 26s: Progressive dissolution & transfer down through neck into lower city
    // 26 - 38s: Climax — lower kingdom fully formed and illuminated
    // 38 - 48s: Reverse restoration back up through neck to restore initial kingdom
    let transferVal = 0;
    if (t < 8) {
      transferVal = 0;
    } else if (t < 26) {
      transferVal = smootherstep(0, 1, (t - 8) / 18);
    } else if (t < 38) {
      transferVal = 1.0;
    } else {
      transferVal = 1.0 - smootherstep(0, 1, (t - 38) / 10);
    }

    this.grainUniforms.uTime.value = t;
    this.grainUniforms.uTransferProgress.value = transferVal;

    // Astrolabe Gimbal Rings Clockwork Motion
    if (this.astrolabeInner && this.astrolabeOuter) {
      this.astrolabeInner.rotation.z += deltaTime * 0.45;
      this.astrolabeInner.rotation.y = Math.sin(t * 0.4) * 0.22;
      this.astrolabeOuter.rotation.z -= deltaTime * 0.28;
      this.astrolabeOuter.rotation.x = Math.PI / 2 + Math.cos(t * 0.35) * 0.18;
    }

    // Cinematic Camera Choreography
    let camPos = new THREE.Vector3();
    let target = new THREE.Vector3(0, 20, 0);

    if (t < 12) {
      // High shot orbiting the upper ancient city
      const p = t / 12;
      camPos.set(Math.cos(p * 1.5) * 58, 28 + p * 4, Math.sin(p * 1.5) * 58);
      target.set(0, 20, 0);
    } else if (t < 26) {
      // Following falling material down through the narrow hourglass neck
      const p = (t - 12) / 14;
      const y = lerp(26, -10, p);
      camPos.set(Math.sin(p * 2.2 + 0.4) * (42 - Math.sin(p * Math.PI) * 14), y + 6, Math.cos(p * 2.2 + 0.4) * (42 - Math.sin(p * Math.PI) * 14));
      target.set(0, y, 0);
    } else if (t < 38) {
      // Lower chamber: Orbiting the reconstructed civilization
      const p = (t - 26) / 12;
      camPos.set(Math.cos(p * 2.0) * 54, -22 + Math.sin(p * Math.PI) * 6, Math.sin(p * 2.0) * 54);
      target.set(0, -22, 0);
    } else {
      // Ascending as process reverses to restore the beginning
      const p = (t - 38) / 12;
      const y = lerp(-20, 28, p);
      camPos.set(Math.sin(2.4 + p * 1.2) * (50 + p * 8), y, Math.cos(2.4 + p * 1.2) * (50 + p * 8));
      target.set(0, y * 0.6, 0);
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}
