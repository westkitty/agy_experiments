import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';
import { GLSL_NOISE } from '../common/ShaderChunks.js';

/**
 * EXPERIMENT 03 — THE CANYON OF FLOATING RINGS
 * Vast desert canyon beneath amber sky.
 * Strata separates from rock into immense concentric rings of suspended stone.
 * Cascading dust/sand, colossal shafts of light, counter-rotation, reassembly.
 */
export class Scene03CanyonFloatingRings {
  constructor() {
    this.name = 'The Canyon of Floating Rings';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x28140a);
    scene.fog = new THREE.FogExp2(0x28140a, 0.0035);

    camera.fov = 50;
    camera.near = 0.5;
    camera.far = 1800;
    camera.updateProjectionMatrix();

    // Warm amber lighting
    const amb = new THREE.AmbientLight(0x402214, 1.4);
    this.group.add(amb);

    this.sunLight = new THREE.DirectionalLight(0xffb066, 2.8);
    this.sunLight.position.set(120, 180, 90);
    this.group.add(this.sunLight);

    // 1. Canyon floor & distant canyon walls
    const canyonGeo = new THREE.PlaneGeometry(600, 600, 60, 60);
    canyonGeo.rotateX(-Math.PI / 2);
    this.disposables.push(canyonGeo);

    const rockShader = {
      vertexShader: `
        ${GLSL_NOISE}
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec3 p = position;
          // Rugged canyon terrain displacement
          float n = snoise(vec3(p.x * 0.015, p.z * 0.015, 0.0)) * 6.0;
          p.y += n;
          vLocalPos = p;
          vec4 worldPos = modelMatrix * vec4(p, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        ${GLSL_NOISE}
        uniform vec3 uSunDir;
        varying vec3 vWorldPos;
        varying vec3 vLocalPos;
        varying vec3 vNormal;

        void main() {
          // Sedimentary geological horizontal strata bands pinned to geology
          float strataCoord = vLocalPos.y * 0.42 + snoise(vec3(vLocalPos.xz * 0.04, vLocalPos.y * 0.08)) * 0.35;
          float band = sin(strataCoord * 3.14159);

          vec3 redSand = vec3(0.68, 0.28, 0.14);
          vec3 ochre = vec3(0.82, 0.52, 0.22);
          vec3 darkIron = vec3(0.32, 0.12, 0.06);
          vec3 gypsumWhite = vec3(0.92, 0.86, 0.74);
          vec3 desertVarnish = vec3(0.22, 0.11, 0.08);

          vec3 rockCol = mix(redSand, ochre, smoothstep(-0.4, 0.4, band));
          rockCol = mix(rockCol, darkIron, smoothstep(0.35, 0.85, sin(strataCoord * 2.1)));
          rockCol = mix(rockCol, gypsumWhite, smoothstep(0.82, 0.98, sin(strataCoord * 7.5)) * 0.75);
          rockCol = mix(rockCol, desertVarnish, smoothstep(0.7, 0.95, -vNormal.y) * 0.4);

          // Multi-tier micro-geological sediment striations
          float microStrata = sin(strataCoord * 28.0) * 0.15;
          rockCol += vec3(0.18, 0.1, 0.05) * microStrata;

          // Sunlight diffuse with warm specular sandstone sheen
          float NdotL = max(dot(vNormal, uSunDir), 0.0);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfDir = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 16.0) * 0.25;

          // High-frequency quartz crystal sparkle glints on sheared faces
          float crystalNoise = snoise(vLocalPos * 1.8);
          float quartzGlint = pow(max(dot(vNormal, halfDir), 0.0), 64.0) * smoothstep(0.3, 0.8, crystalNoise) * 1.8;

          vec3 finalColor = rockCol * (0.28 + NdotL * 0.85) + vec3(1.0, 0.82, 0.55) * spec + vec3(1.0, 0.95, 0.8) * quartzGlint;

          // Atmospheric amber distance haze
          float dist = length(vWorldPos.xz);
          float fog = 1.0 - exp(-dist * 0.003);
          finalColor = mix(finalColor, vec3(0.35, 0.18, 0.1), fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    };

    const canyonMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
      },
      vertexShader: rockShader.vertexShader,
      fragmentShader: rockShader.fragmentShader
    });
    this.disposables.push(canyonMat);

    this.canyonMesh = new THREE.Mesh(canyonGeo, canyonMat);
    this.canyonMesh.position.y = -8;
    this.group.add(this.canyonMesh);

    // 2. Concentric Suspended Rock Rings
    // 5 rings with weathered geological thickness
    this.rings = [];
    const ringConfigs = [
      { rIn: 6, rOut: 20, height: 26, targetY: 58, rotSpeed: 0.14, tilt: 0.04 },
      { rIn: 24, rOut: 45, height: 22, targetY: 42, rotSpeed: -0.09, tilt: -0.05 },
      { rIn: 49, rOut: 76, height: 18, targetY: 28, rotSpeed: 0.06, tilt: 0.03 },
      { rIn: 80, rOut: 114, height: 15, targetY: 16, rotSpeed: -0.04, tilt: -0.02 },
      { rIn: 118, rOut: 158, height: 12, targetY: 8, rotSpeed: 0.025, tilt: 0.015 }
    ];

    ringConfigs.forEach((cfg, idx) => {
      // Create thick annular cylinder ring
      const ringGeo = new THREE.CylinderGeometry(cfg.rOut, cfg.rOut, cfg.height, 48, 6, true);
      // Inner face
      const innerGeo = new THREE.CylinderGeometry(cfg.rIn, cfg.rIn, cfg.height, 48, 6, true);
      // Top cap ring
      const ringShape = new THREE.Shape();
      ringShape.absarc(0, 0, cfg.rOut, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, cfg.rIn, 0, Math.PI * 2, true);
      ringShape.holes.push(holePath);

      const extrudeSettings = {
        depth: cfg.height,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 1.2,
        bevelThickness: 1.0
      };
      const extrudedRingGeo = new THREE.ExtrudeGeometry(ringShape, extrudeSettings);
      extrudedRingGeo.rotateX(Math.PI / 2);
      extrudedRingGeo.translate(0, cfg.height * 0.5, 0);
      this.disposables.push(extrudedRingGeo);

      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
        },
        vertexShader: `
          ${GLSL_NOISE}
          varying vec3 vWorldPos;
          varying vec3 vLocalPos;
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec3 p = position;
            // Rugged rock displacement on edges
            float disp = snoise(p * 0.08) * 1.6;
            p += normal * disp;
            vLocalPos = p;
            vec4 worldPos = modelMatrix * vec4(p, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: rockShader.fragmentShader
      });
      this.disposables.push(ringMat);

      const mesh = new THREE.Mesh(extrudedRingGeo, ringMat);
      mesh.position.y = 0; // Starts embedded in canyon floor
      this.group.add(mesh);

      this.rings.push({
        mesh,
        cfg,
        currentY: 0,
        currentRot: 0
      });
    });

    // 3. Cascading Dust & Sand Particles
    const dustCount = 1800;
    const dustPos = new Float32Array(dustCount * 3);
    const dustSpeeds = new Float32Array(dustCount);
    const dustRadii = new Float32Array(dustCount);
    const dustAngles = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const ringIdx = i % 5;
      const r = ringConfigs[ringIdx].rOut - 1.5;
      const angle = Math.random() * Math.PI * 2;
      dustRadii[i] = r;
      dustAngles[i] = angle;
      dustPos[i * 3 + 0] = Math.cos(angle) * r;
      dustPos[i * 3 + 1] = Math.random() * 50;
      dustPos[i * 3 + 2] = Math.sin(angle) * r;
      dustSpeeds[i] = 12 + Math.random() * 18;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.disposables.push(dustGeo);

    const dustMat = new THREE.PointsMaterial({
      color: 0xdf9855,
      size: 1.5,
      transparent: true,
      opacity: 0.0 // Controlled dynamically
    });
    this.disposables.push(dustMat);

    this.dustParticles = new THREE.Points(dustGeo, dustMat);
    this.dustSpeeds = dustSpeeds;
    this.dustRadii = dustRadii;
    this.dustAngles = dustAngles;
    this.group.add(this.dustParticles);

    // 3b. Orbiting Tumbling Rock Debris Chunks (InstancedMesh)
    const debrisCount = 75;
    const debrisGeo = new THREE.DodecahedronGeometry(1.6, 0);
    this.disposables.push(debrisGeo);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x9e6a45,
      roughness: 0.88,
      metalness: 0.05
    });
    this.disposables.push(debrisMat);
    this.debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.debrisMesh);

    this.debrisData = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < debrisCount; i++) {
      const ringIdx = i % 5;
      const r = ringConfigs[ringIdx].rOut + (Math.random() - 0.5) * 6.0;
      const angle = Math.random() * Math.PI * 2;
      const rotSpeed = (Math.random() - 0.5) * 3.5;
      const scale = 0.6 + Math.random() * 0.9;
      this.debrisData.push({ ringIdx, r, angle, rotSpeed, scale, y: Math.random() * 40 });
      dummy.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      this.debrisMesh.setMatrixAt(i, dummy.matrix);
    }
    this.debrisDummy = dummy;

    // 4. Volumetric Light Shafts cutting through newly opened spaces
    const lightConeGeo = new THREE.CylinderGeometry(8, 70, 140, 24, 1, true);
    lightConeGeo.rotateX(-0.3);
    lightConeGeo.rotateZ(0.2);
    this.disposables.push(lightConeGeo);

    this.shaftMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
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
        uniform float uOpacity;
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec2 vUv;
        void main() {
          float verticalFade = sin(vUv.y * 3.14159);
          // Sweeping angular occlusion rays from counter-rotating stone rings
          float angle = atan(vWorldPos.z, vWorldPos.x);
          float ray1 = pow(sin(angle * 7.0 + uTime * 0.4) * 0.5 + 0.5, 3.0);
          float ray2 = pow(sin(angle * 13.0 - uTime * 0.6) * 0.5 + 0.5, 2.5);
          float rayPattern = mix(0.4, 1.4, ray1 * ray2);

          vec3 amberLight = vec3(1.1, 0.8, 0.45) * rayPattern;
          float alpha = verticalFade * uOpacity * 0.28 * rayPattern;
          gl_FragColor = vec4(amberLight, alpha);
        }
      `
    });
    this.disposables.push(this.shaftMat);

    this.lightShaft = new THREE.Mesh(lightConeGeo, this.shaftMat);
    this.lightShaft.position.set(20, 60, -10);
    this.group.add(this.lightShaft);

    scene.add(this.group);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Geological Separation & Reassembly Animation
    // 0 - 8s: Rest locked in bedrock
    // 8 - 22s: Immense stone rings lift into the sky
    // 22 - 38s: Full elevation, concentric counter-rotation, light shafts
    // 38 - 48s: Reassembly: rings decelerate, align rotation, descend into bedrock
    const liftFactor = smoothstep(7, 21, t) * (1.0 - smoothstep(38, 48, t));
    const smoothLift = smootherstep(0, 1, liftFactor);

    // Rotation active primarily while elevated, smoothly realigning to 0 at landing
    const rotActive = smoothstep(10, 22, t) * (1.0 - smoothstep(36, 46, t));

    this.rings.forEach((r, idx) => {
      // Elevation
      r.mesh.position.y = smoothLift * r.cfg.targetY;

      // Rotation & subtle geological tilt
      r.currentRot += r.cfg.rotSpeed * deltaTime * rotActive;
      // Damping back to 0 as it reassembles
      if (t > 38) {
        r.currentRot = lerp(r.currentRot, 0, deltaTime * 0.8);
      }
      r.mesh.rotation.y = r.currentRot;
      r.mesh.rotation.z = r.cfg.tilt * smoothLift;
    });

    // Cascading Dust Animation
    const dustPositions = this.dustParticles.geometry.attributes.position.array;
    const dustOpacity = smoothstep(8, 16, t) * (1.0 - smoothstep(37, 46, t));
    this.dustParticles.material.opacity = dustOpacity * 0.75;

    if (dustOpacity > 0.01) {
      for (let i = 0; i < this.dustSpeeds.length; i++) {
        dustPositions[i * 3 + 1] -= this.dustSpeeds[i] * deltaTime;
        if (dustPositions[i * 3 + 1] < -5) {
          const ringIdx = i % 5;
          dustPositions[i * 3 + 1] = this.rings[ringIdx].mesh.position.y + 5;
        }
      }
      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Tumbling Rock Debris Animation
    if (this.debrisMesh && this.debrisData) {
      const dummy = this.debrisDummy;
      for (let i = 0; i < this.debrisData.length; i++) {
        const d = this.debrisData[i];
        const ring = this.rings[d.ringIdx];
        d.angle += (ring.cfg.rotSpeed * 1.5 + d.rotSpeed * 0.1) * deltaTime;
        const ringY = ring.mesh.position.y;
        d.y -= deltaTime * 4.0;
        if (d.y < 0) d.y = ringY + Math.random() * 8.0;
        const curY = Math.min(d.y, ringY + 12.0) * smoothLift;

        dummy.position.set(Math.cos(d.angle) * d.r, curY, Math.sin(d.angle) * d.r);
        dummy.rotation.x += d.rotSpeed * deltaTime;
        dummy.rotation.y += d.rotSpeed * 0.8 * deltaTime;
        const s = d.scale * (0.2 + 0.8 * smoothLift);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        this.debrisMesh.setMatrixAt(i, dummy.matrix);
      }
      this.debrisMesh.instanceMatrix.needsUpdate = true;
    }

    // Light shaft visibility through newly opened spaces
    this.shaftMat.uniforms.uOpacity.value = smoothLift;
    this.shaftMat.uniforms.uTime.value = t;

    // Cinematic Camera Choreography
    let camPos = new THREE.Vector3();
    let lookTarget = new THREE.Vector3(0, 20, 0);

    if (t < 14) {
      // Approaching the canyon formations from low altitude
      const p = t / 14;
      camPos.set(Math.sin(p * 1.2) * 60, 8 + p * 8, 170 - p * 60);
      lookTarget.set(0, 10, 20);
    } else if (t < 26) {
      // Looking up as colossal concentric strata rings lift overhead
      const p = (t - 14) / 12;
      camPos.set(Math.cos(p * 1.5) * 85, 16 + p * 28, 90 - p * 40);
      lookTarget.set(0, 32, 0);
    } else if (t < 38) {
      // Flying through the rings between inner and outer stone walls
      const p = (t - 26) / 12;
      camPos.set(Math.sin(p * 2.2 + 0.5) * 65, 42 - Math.sin(p * Math.PI) * 12, Math.cos(p * 2.2 + 0.5) * 65);
      lookTarget.set(0, 35, 0);
    } else {
      // Ascending to dramatic high overview as rings lock back into the canyon floor
      const p = (t - 38) / 12;
      camPos.set(Math.sin(2.7 + p * 0.8) * 130, 48 + p * 30, Math.cos(2.7 + p * 0.8) * 130);
      lookTarget.set(0, 5, 0);
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}
