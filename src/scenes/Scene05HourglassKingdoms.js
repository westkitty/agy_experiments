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
        varying float vIsLower;

        void main() {
          // Individual grain progress based on transfer wave
          float p = clamp((uTransferProgress - aGrainDelay) * 1.8, 0.0, 1.0);
          float s = smoothstep(0.0, 1.0, p);

          vec3 pos = position;
          vec3 currentPos = aUpperPos;

          // Pre-collapse seismic masonry trembling right before structural failure
          float preDetach = smoothstep(-0.06, 0.0, uTransferProgress - aGrainDelay) * step(uTransferProgress, aGrainDelay);
          pos += sin(vec3(uTime * 35.0 + aUpperPos.y * 2.0, uTime * 40.0 + aUpperPos.x * 2.0, uTime * 32.0 + aUpperPos.z * 2.0)) * preDetach * 0.08;

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
            vIsLower = 0.0;
          } else if (s >= 0.9999) {
            currentPos = aLowerPos;
            vIsGlow = 0.0;
            vIsLower = 1.0;
          } else {
            currentPos = aUpperPos;
            vIsGlow = 0.0;
            vIsLower = 0.0;
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
        varying float vIsLower;

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

          // Ancient spire stress fracture micro-cracks
          float crack = sin(vWorldPos.y * 14.0 + vWorldPos.x * 9.0) * cos(vWorldPos.z * 11.0);
          float isFracture = smoothstep(0.72, 0.96, crack) * (1.0 - vIsLower) * (1.0 - vIsGlow);
          baseStone = mix(baseStone, vec3(0.22, 0.15, 0.1), isFracture * 0.7);

          vec3 col = mix(baseStone, glowColor * 2.2, vIsGlow);
          col += hotEmber * (neckHeat * 1.8);

          // Holographic architectural blueprint construction vector grid on lower kingdom
          float gridX = fract(vWorldPos.x * 0.9);
          float gridZ = fract(vWorldPos.z * 0.9);
          float gridY = fract(vWorldPos.y * 0.9);
          float blueprintGrid = (step(0.85, gridX) + step(0.85, gridZ) + step(0.85, gridY)) * vIsLower;
          float buildScan = exp(-pow(vWorldPos.y + 22.0 - sin(uTime * 1.5) * 12.0, 2.0) * 0.12) * vIsLower;
          vec3 blueprintGold = vec3(1.2, 0.95, 0.45);
          vec3 cyanLaser = vec3(0.2, 0.85, 1.0);
          col += mix(blueprintGold, cyanLaser, 0.35) * (blueprintGrid * 0.45 + buildScan * 0.85);

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
    // 1. Bronze Top & Bottom Plinths with Astrolabe Engravings
    const plinthGeo = new THREE.CylinderGeometry(24, 25, 4.0, 48);
    this.disposables.push(plinthGeo);

    this.plinthMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.5).normalize() }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vLocalPos = position;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;

        void main() {
          vec3 bronzeBase = vec3(0.52, 0.36, 0.22);
          vec3 bronzeHighlight = vec3(0.92, 0.74, 0.45);
          vec3 verdigrisPatina = vec3(0.14, 0.32, 0.25);

          // Astrolabe dial concentric rings on plinth face (|vLocalPos.y| > 1.5)
          float r = length(vLocalPos.xz);
          float ring1 = smoothstep(0.06, 0.01, abs(r - 8.0));
          float ring2 = smoothstep(0.06, 0.01, abs(r - 14.0));
          float ring3 = smoothstep(0.06, 0.01, abs(r - 20.0));
          float rings = max(ring1, max(ring2, ring3));

          // 24 astronomical hour graduations
          float angle = atan(vLocalPos.z, vLocalPos.x);
          float ticks = smoothstep(0.03, 0.008, abs(fract(angle * 24.0 / 6.28318) - 0.5)) * step(8.0, r) * step(r, 20.0);
          float engraving = max(rings, ticks) * step(1.5, abs(vLocalPos.y));

          vec3 surfaceCol = mix(bronzeBase, verdigrisPatina, engraving * 0.75);
          surfaceCol = mix(surfaceCol, bronzeHighlight, (1.0 - engraving) * 0.28);

          // Directional sunlight diffuse & specular
          float NdotL = max(dot(vNormal, uSunDir), 0.0);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfDir = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 24.0) * (0.85 - engraving * 0.6);

          vec3 col = surfaceCol * (0.35 + NdotL * 0.75) + vec3(1.0, 0.85, 0.55) * spec;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.disposables.push(this.plinthMat);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8a5828,
      metalness: 0.85,
      roughness: 0.35
    });
    this.disposables.push(bronzeMat);

    const topPlinth = new THREE.Mesh(plinthGeo, this.plinthMat);
    topPlinth.position.y = 39;
    this.group.add(topPlinth);

    const bottomPlinth = new THREE.Mesh(plinthGeo, this.plinthMat);
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
          float curvatureSheen = pow(abs(dot(normalize(vWorldPos.xz + vec2(0.0001)), normalize(viewDir.xz + vec2(0.0001)))), 6.0) * 0.35;
          vec3 glassHighlight = vec3(0.9, 0.96, 1.0) * (fresnel * 0.75 + curvatureSheen + 0.05);
          gl_FragColor = vec4(glassHighlight, fresnel * 0.45 + 0.08);
        }
      `
    });
    this.disposables.push(glassMat);

    this.glassMesh = new THREE.Mesh(glassGeo, glassMat);
    this.group.add(this.glassMesh);

    // 5. Incandescent Neck Constriction Flare Ring & Molten Shockwave Flare
    const flareGeo = new THREE.PlaneGeometry(14.0, 14.0);
    this.disposables.push(flareGeo);

    const flareMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Billboarding facing camera
          vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mvPosition.xy += position.xy;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          if (r > 1.0) discard;

          // Multi-harmonic incandescent plasma core
          float core = exp(-r * 3.8) * 2.6;
          // Molten compression shockwave rings pulsating outward
          float shock = sin(r * 22.0 - uTime * 18.0) * 0.5 + 0.5;
          float ring = exp(-pow(r - 0.42, 2.0) * 45.0) * (0.6 + shock * 0.4);

          // Anamorphic horizontal flare ray
          float ray = exp(-abs(p.y) * 18.0) * exp(-abs(p.x) * 1.8) * 1.5;

          vec3 goldCore = vec3(1.3, 1.1, 0.6);
          vec3 moltenRed = vec3(1.4, 0.45, 0.1);
          vec3 cyanFlash = vec3(0.3, 0.85, 1.2);

          vec3 col = goldCore * core + moltenRed * ring + cyanFlash * ray;
          float alpha = clamp((core + ring + ray) * uIntensity, 0.0, 1.0);
          gl_FragColor = vec4(col * uIntensity * 1.8, alpha);
        }
      `
    });
    this.disposables.push(flareMat);
    this.neckFlareMat = flareMat;

    this.neckFlareMesh = new THREE.Mesh(flareGeo, flareMat);
    this.neckFlareMesh.position.set(0, 0, 0);
    this.group.add(this.neckFlareMesh);

    // 6. Masonry Dust & Spire Disintegration Debris Cloud (900 motes)
    const dustCount = 900;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustInitial = new Float32Array(dustCount * 3);
    const dustSpeeds = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const rad = 2.0 + Math.random() * 12.0;
      const y = 8.0 + Math.random() * 26.0;
      const x = Math.cos(theta) * rad;
      const z = Math.sin(theta) * rad;
      dustPositions[i * 3 + 0] = x;
      dustPositions[i * 3 + 1] = y;
      dustPositions[i * 3 + 2] = z;
      dustInitial[i * 3 + 0] = x;
      dustInitial[i * 3 + 1] = y;
      dustInitial[i * 3 + 2] = z;
      dustSpeeds[i] = 1.4 + Math.random() * 2.2;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    this.dustInitial = dustInitial;
    this.dustSpeeds = dustSpeeds;
    this.dustPositions = dustPositions;
    this.disposables.push(dustGeo);

    const dustMat = new THREE.PointsMaterial({
      color: 0xdfc29f,
      size: 0.45,
      transparent: true,
      opacity: 0.0,
      blending: THREE.NormalBlending
    });
    this.disposables.push(dustMat);
    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.group.add(this.dustPoints);
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

    // Spire disintegration debris cloud animation
    const debrisActivity = smoothstep(6.0, 14.0, t) * (1.0 - smoothstep(32.0, 42.0, t));
    if (this.dustPoints && this.dustPositions) {
      this.dustPoints.material.opacity = debrisActivity * 0.7;
      if (debrisActivity > 0.01) {
        const posArr = this.dustPositions;
        const initArr = this.dustInitial;
        const speeds = this.dustSpeeds;
        const count = speeds.length;
        for (let i = 0; i < count; i++) {
          let y = initArr[i * 3 + 1] - ((t * speeds[i]) % 26.0);
          posArr[i * 3 + 1] = y;
          posArr[i * 3 + 0] = initArr[i * 3 + 0] + Math.sin(t * 1.8 + i) * 0.5;
          posArr[i * 3 + 2] = initArr[i * 3 + 2] + Math.cos(t * 1.8 + i) * 0.5;
        }
        this.dustPoints.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Astrolabe Gimbal Rings Clockwork Motion
    if (this.astrolabeInner && this.astrolabeOuter) {
      this.astrolabeInner.rotation.z += deltaTime * 0.45;
      this.astrolabeInner.rotation.y = Math.sin(t * 0.4) * 0.22;
      this.astrolabeOuter.rotation.z -= deltaTime * 0.28;
      this.astrolabeOuter.rotation.x = Math.PI / 2 + Math.cos(t * 0.35) * 0.18;
    }

    // Incandescent Neck Constriction Flare Intensity (peaks during active grain transit)
    const isTransferring = (t >= 8 && t <= 26) || (t >= 38 && t <= 48);
    const transferIntensity = isTransferring ?
      (t < 26 ? smoothstep(8, 14, t) * (1.0 - smoothstep(22, 26, t))
              : smoothstep(38, 41, t) * (1.0 - smoothstep(44, 48, t))) : 0.0;

    if (this.neckFlareMat) {
      this.neckFlareMat.uniforms.uTime.value = t;
      this.neckFlareMat.uniforms.uIntensity.value = transferIntensity;
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
