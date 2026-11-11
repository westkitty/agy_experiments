import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';
import { GLSL_NOISE } from '../common/ShaderChunks.js';

/**
 * EXPERIMENT 06 — THE WALKING SHADOW
 * Gigantic weathered stone statue in brilliant sunlit desert.
 * Shadow ripples, detaches from feet, rises into 3D light-absorbing silhouette.
 * Walks across terrain dimming daylight; climax: eclipses the sun on the horizon,
 * then returns, flattens, and reconnects.
 */
export class Scene06WalkingShadow {
  constructor() {
    this.name = 'The Walking Shadow';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x322014);
    scene.fog = new THREE.FogExp2(0x322014, 0.0035);

    camera.fov = 48;
    camera.near = 0.5;
    camera.far = 1600;
    camera.updateProjectionMatrix();

    // Directional Desert Sun (positioned on far horizon for eclipse climax)
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 2.8);
    this.sunPos = new THREE.Vector3(0, 32, -220);
    this.sunLight.position.copy(this.sunPos);
    this.group.add(this.sunLight);

    this.ambLight = new THREE.AmbientLight(0x4a3224, 1.2);
    this.group.add(this.ambLight);

    // 1. Desert Terrain & Ancient Ruins
    const terrainGeo = new THREE.PlaneGeometry(600, 600, 80, 80);
    terrainGeo.rotateX(-Math.PI / 2);
    this.disposables.push(terrainGeo);

    this.terrainMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunIntensity: { value: 1.0 },
        uShadowDist: { value: 0.0 }
      },
      vertexShader: `
        ${GLSL_NOISE}
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec3 p = position;
          // Rolling desert dunes
          float dune = sin(p.x * 0.015 + p.z * 0.02) * 8.0 + snoise(vec3(p.xz * 0.01, 0.0)) * 6.0;
          p.y += dune;
          vec4 worldPos = modelMatrix * vec4(p, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uSunIntensity;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec3 sunDir = normalize(vec3(0.0, 32.0, -220.0) - vWorldPos);
          float NdotL = max(dot(vNormal, sunDir), 0.0);

          vec3 sandBright = vec3(0.92, 0.74, 0.48);
          vec3 sandDim = vec3(0.35, 0.22, 0.18);
          vec3 sandCol = mix(sandDim, sandBright, NdotL * uSunIntensity);

          // Atmospheric haze over distance
          float dist = length(vWorldPos.xz);
          float fog = 1.0 - exp(-dist * 0.0035);
          vec3 skyFog = mix(vec3(0.5, 0.32, 0.2), vec3(0.12, 0.08, 0.14), 1.0 - uSunIntensity);
          vec3 finalColor = mix(sandCol, skyFog, fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(this.terrainMat);

    const terrainMesh = new THREE.Mesh(terrainGeo, this.terrainMat);
    terrainMesh.position.y = -6;
    this.group.add(terrainMesh);

    // Ruined Ancient Columns
    const colGeo = new THREE.CylinderGeometry(2.0, 2.2, 18, 16);
    this.disposables.push(colGeo);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x8a7058, roughness: 0.9 });
    this.disposables.push(colMat);

    const colPositions = [
      [-35, 3, 20], [-45, 2, 40], [35, 3, 10], [50, 4, -20], [-60, 5, -80], [45, 6, -110]
    ];
    colPositions.forEach(cp => {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cp[0], cp[1], cp[2]);
      col.rotation.z = (Math.random() - 0.5) * 0.2;
      this.group.add(col);
    });

    // 2. Colossal Stone Statue (Standing motionless on pedestal)
    this.createStatue();

    // 3. The Articulated Walking Shadow Silhouette
    this.createWalkingShadowTitan();

    // 4. Solar Eclipse Corona Glow (at horizon sun position)
    const coronaGeo = new THREE.PlaneGeometry(60, 60);
    this.disposables.push(coronaGeo);

    this.coronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uEclipse: { value: 0.0 },
        uTime: { value: 0.0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uEclipse;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 center = vUv - 0.5;
          float r = length(center) * 2.0;
          float theta = atan(center.y, center.x);

          // Diamond ring / Baily's beads effect on edge
          float ring = exp(-pow(r - 0.42, 2.0) * 60.0);

          // Multi-frequency solar coronal streamers and prominences
          float rayMajor = pow(max(sin(theta * 8.0 + uTime * 0.3), 0.0), 4.0) * exp(-r * 1.6);
          float rayMinor = pow(max(sin(theta * 32.0 - uTime * 0.5), 0.0), 6.0) * exp(-r * 2.8) * 0.7;

          // Chromatic dispersion across corona (incandescent core, golden ring, violet outer fringe)
          vec3 whiteCore = vec3(1.3, 1.2, 1.0);
          vec3 goldRing = vec3(1.0, 0.75, 0.35);
          vec3 violetFringe = vec3(0.85, 0.35, 0.65);

          vec3 col = mix(goldRing, whiteCore, ring);
          col = mix(col, violetFringe, clamp(r - 0.5, 0.0, 1.0));
          vec3 coronaCol = col * (ring * 3.2 + (rayMajor + rayMinor) * 2.2) * uEclipse;

          gl_FragColor = vec4(coronaCol, clamp((ring * 2.0 + rayMajor + rayMinor) * uEclipse, 0.0, 1.0));
        }
      `
    });
    this.disposables.push(this.coronaMat);

    this.coronaMesh = new THREE.Mesh(coronaGeo, this.coronaMat);
    this.coronaMesh.position.copy(this.sunPos);
    this.group.add(this.coronaMesh);

    scene.add(this.group);
  }

  createStatue() {
    this.statueGroup = new THREE.Group();
    this.statueGroup.position.set(0, 0, 50);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x9e8568,
      roughness: 0.92,
      metalness: 0.05
    });
    this.disposables.push(stoneMat);

    // Pedestal
    const baseGeo = new THREE.BoxGeometry(18, 5, 18);
    this.disposables.push(baseGeo);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 2.5;
    this.statueGroup.add(base);

    // Weathered Colossus Torso & Head
    const torsoGeo = new THREE.BoxGeometry(10, 16, 7);
    this.disposables.push(torsoGeo);
    const torso = new THREE.Mesh(torsoGeo, stoneMat);
    torso.position.y = 13;
    this.statueGroup.add(torso);

    const headGeo = new THREE.BoxGeometry(5.5, 7.5, 6.0);
    this.disposables.push(headGeo);
    const head = new THREE.Mesh(headGeo, stoneMat);
    head.position.y = 24.5;
    this.statueGroup.add(head);

    // Arms
    const armGeo = new THREE.BoxGeometry(3.5, 14, 3.5);
    this.disposables.push(armGeo);
    const leftArm = new THREE.Mesh(armGeo, stoneMat);
    leftArm.position.set(-6.8, 12, 0);
    this.statueGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, stoneMat);
    rightArm.position.set(6.8, 12, 0);
    this.statueGroup.add(rightArm);

    this.group.add(this.statueGroup);
  }

  createWalkingShadowTitan() {
    this.shadowTitan = new THREE.Group();
    this.shadowTitan.position.set(0, 0, 50);

    // Light-absorbing silhouette material
    this.shadowMat = new THREE.ShaderMaterial({
      uniforms: {
        uAbsorption: { value: 1.0 }
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
          // Pure light-absorbing void with subtle cosmic rim
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          vec3 voidBlack = vec3(0.005, 0.008, 0.012);
          vec3 rimAura = vec3(0.15, 0.2, 0.35) * fresnel * 0.45;
          gl_FragColor = vec4(voidBlack + rimAura, 0.98);
        }
      `
    });
    this.disposables.push(this.shadowMat);

    // Articulated limbs
    const torsoGeo = new THREE.BoxGeometry(9.5, 15, 6.5);
    this.disposables.push(torsoGeo);
    this.shadowTorso = new THREE.Mesh(torsoGeo, this.shadowMat);
    this.shadowTorso.position.y = 17;
    this.shadowTitan.add(this.shadowTorso);

    const headGeo = new THREE.BoxGeometry(5.2, 7.0, 5.5);
    this.disposables.push(headGeo);
    this.shadowHead = new THREE.Mesh(headGeo, this.shadowMat);
    this.shadowHead.position.y = 28;
    this.shadowTitan.add(this.shadowHead);

    const limbGeo = new THREE.BoxGeometry(3.2, 13, 3.2);
    this.disposables.push(limbGeo);

    // Left & Right Arms
    this.leftArm = new THREE.Mesh(limbGeo, this.shadowMat);
    this.leftArm.position.set(-6.5, 16, 0);
    this.shadowTitan.add(this.leftArm);

    this.rightArm = new THREE.Mesh(limbGeo, this.shadowMat);
    this.rightArm.position.set(6.5, 16, 0);
    this.shadowTitan.add(this.rightArm);

    // Left & Right Legs
    const legGeo = new THREE.BoxGeometry(3.6, 16, 3.6);
    this.disposables.push(legGeo);

    this.leftLeg = new THREE.Mesh(legGeo, this.shadowMat);
    this.leftLeg.position.set(-3.2, 8, 0);
    this.shadowTitan.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, this.shadowMat);
    this.rightLeg.position.set(3.2, 8, 0);
    this.shadowTitan.add(this.rightLeg);

    this.group.add(this.shadowTitan);

    // Umbilical Shadow Tether linking statue's feet to the walking silhouette
    const tetherGeo = new THREE.PlaneGeometry(12, 1);
    tetherGeo.rotateX(-Math.PI / 2);
    this.disposables.push(tetherGeo);
    this.tetherMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.85 }
      },
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          // Occult umbilical energy pulses traveling along tether from statue to titan
          float pulse = sin(vUv.y * 22.0 - uTime * 5.0) * 0.5 + 0.5;
          float edgeFade = sin(vUv.x * 3.14159);
          vec3 voidDark = vec3(0.003, 0.005, 0.01);
          vec3 occultGlow = vec3(0.08, 0.04, 0.14) * pulse;
          gl_FragColor = vec4(voidDark + occultGlow, edgeFade * uOpacity);
        }
      `
    });
    this.disposables.push(this.tetherMat);
    this.tetherMesh = new THREE.Mesh(tetherGeo, this.tetherMat);
    this.tetherMesh.position.set(0, 0.05, 50);
    this.group.add(this.tetherMesh);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Shadow detachment and walking animation cycle
    // 0 - 8s: Rest flattened at statue's feet
    // 8 - 16s: Ripples and rises into 3D silhouette stance
    // 16 - 32s: Walks toward the horizon dune ridge
    // 30 - 38s: Climax — reaches horizon and eclipses the sun!
    // 38 - 48s: Walks back, descends to ground, and reconnects with statue
    const riseFactor = smoothstep(7, 14, t) * (1.0 - smoothstep(39, 47, t));
    const walkProgress = smoothstep(14, 31, t) * (1.0 - smoothstep(37, 46, t));

    // Stance transition: scale Y from flat ground shadow (0.02) to full height (1.0)
    const scaleY = lerp(0.02, 1.0, riseFactor);
    this.shadowTitan.scale.set(1.0, scaleY, 1.0);

    // Walk translation across desert toward horizon sun (from z = 48 to z = -180)
    const targetZ = lerp(48, -180, walkProgress);
    const targetY = 0.0;
    this.shadowTitan.position.set(0, targetY, targetZ);
    if (this.tetherMesh) {
      const tetherLen = Math.max(1.0, 50.0 - targetZ);
      this.tetherMesh.scale.set(1.0, 1.0, tetherLen);
      this.tetherMat.uniforms.uOpacity.value = (1.0 - smoothstep(28, 38, t) * 0.7) * 0.85;
      this.tetherMat.uniforms.uTime.value = t;
    }

    // Articulated Walking Stride
    if (walkProgress > 0.05 && walkProgress < 0.95) {
      const walkCycle = t * 2.8;
      this.leftLeg.rotation.x = Math.sin(walkCycle) * 0.45;
      this.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.45;
      this.leftArm.rotation.x = -Math.sin(walkCycle) * 0.45;
      this.rightArm.rotation.x = Math.sin(walkCycle) * 0.45;
      this.shadowTorso.position.y = 17 + Math.abs(Math.sin(walkCycle * 2.0)) * 1.2;
    } else if (t >= 30 && t <= 38) {
      // Climax Eclipse: Arms raised high against the sun
      const eclipsePose = smoothstep(30, 33, t) * (1.0 - smoothstep(36, 39, t));
      this.leftArm.rotation.z = eclipsePose * 1.4;
      this.rightArm.rotation.z = -eclipsePose * 1.4;
      this.leftArm.rotation.x = -eclipsePose * 0.8;
      this.rightArm.rotation.x = -eclipsePose * 0.8;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.set(0, 0, 0);
      this.rightArm.rotation.set(0, 0, 0);
      this.shadowTorso.position.y = 17;
    }

    // Daylight dimming & Solar Eclipse Factor
    const eclipseFactor = smoothstep(29, 33, t) * (1.0 - smoothstep(36, 40, t));
    const dimmingFactor = smoothstep(12, 28, t) * (1.0 - smoothstep(37, 46, t));

    const currentSunIntensity = lerp(2.8, 0.35, Math.max(dimmingFactor * 0.6, eclipseFactor * 0.9));
    this.sunLight.intensity = currentSunIntensity;
    this.terrainMat.uniforms.uSunIntensity.value = currentSunIntensity / 2.8;

    // Corona burst during eclipse
    this.coronaMat.uniforms.uEclipse.value = eclipseFactor;
    this.coronaMat.uniforms.uTime.value = t;

    // Cinematic Camera Choreography
    let camPos = new THREE.Vector3();
    let target = new THREE.Vector3(0, 16, 50);

    if (t < 14) {
      // Intimate low angle watching shadow peel and rise from statue feet
      const p = t / 14;
      camPos.set(Math.sin(p * 1.2 + 0.4) * 42, 6 + p * 6, 75 - p * 15);
      target.set(0, 14, 50);
    } else if (t < 28) {
      // Sweeping wide alongside the giant shadow crossing the landscape
      const p = (t - 14) / 14;
      camPos.set(Math.cos(p * 1.8) * 65, 18 + p * 12, targetZ + 35);
      target.copy(this.shadowTitan.position).add(new THREE.Vector3(0, 14, 0));
    } else if (t < 39) {
      // Climax: Monumental low-angle shot framing the walking titan eclipsing the sun
      const p = (t - 28) / 11;
      camPos.set(Math.sin(p * 0.8) * 18, 12 + p * 4, -130);
      target.set(0, 28, -200);
    } else {
      // Smooth return to resting statue
      const p = (t - 39) / 11;
      camPos.set(Math.cos(2.2 + p * 1.0) * (50 + p * 10), 14, lerp(-120, 75, p));
      target.set(0, 16, 50);
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
