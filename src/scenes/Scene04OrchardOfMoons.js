import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';
import { GLSL_NOISE } from '../common/ShaderChunks.js';

/**
 * EXPERIMENT 04 — THE ORCHARD OF MOONS
 * Ancient black tree on dark stone island suspended in space.
 * Luminous moons hanging like fruit; golden light awakens them.
 * Moons detach, orbit in petal formations forming a celestial flower, then return.
 */
export class Scene04OrchardOfMoons {
  constructor() {
    this.name = 'The Orchard of Moons';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x020409);
    scene.fog = new THREE.FogExp2(0x020409, 0.003);

    camera.fov = 48;
    camera.near = 0.5;
    camera.far = 1600;
    camera.updateProjectionMatrix();

    // Cosmic lighting
    const amb = new THREE.AmbientLight(0x182032, 1.2);
    this.group.add(amb);

    this.coreLight = new THREE.PointLight(0xffdf88, 3.5, 300);
    this.coreLight.position.set(0, 15, 0);
    this.group.add(this.coreLight);

    // 1. Floating Dark Stone Island
    const islandGeo = new THREE.DodecahedronGeometry(18, 2);
    // Deform into craggy floating asteroid
    const pos = islandGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i);
      let x = pos.getX(i);
      let z = pos.getZ(i);
      if (y < 0) y *= 1.8; // tapered craggy bottom
      pos.setXYZ(i, x * 1.3, y, z * 1.3);
    }
    islandGeo.computeVertexNormals();
    // Initialize shared sap uniforms
    this.sapUniforms = {
      uTime: { value: 0 },
      uGlow: { value: 0 }
    };

    this.islandMat = new THREE.ShaderMaterial({
      uniforms: this.sapUniforms,
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
        uniform float uTime;
        uniform float uGlow;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 rock = vec3(0.045, 0.05, 0.07);
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          
          // Bioluminescent root veins penetrating deep into asteroid core
          float veinNoise = sin(vWorldPos.x * 0.4 + vWorldPos.z * 0.4 + sin(vWorldPos.y * 0.8));
          float rootPulse = smoothstep(0.72, 0.96, sin(vWorldPos.y * 0.35 - uTime * 2.0 + veinNoise)) * uGlow;
          vec3 goldVein = vec3(1.0, 0.85, 0.4) * 1.8;
          
          vec3 finalColor = mix(rock, goldVein, rootPulse * 0.85) + vec3(0.08, 0.12, 0.22) * fresnel * 0.6;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(this.islandMat);

    this.islandMesh = new THREE.Mesh(islandGeo, this.islandMat);
    this.islandMesh.position.set(0, -22, 0);
    this.group.add(this.islandMesh);

    // 2. Procedural Ancient Black Tree with Golden Sap Veins
    this.branchEndpoints = [];
    this.createTree();

    // 3. Hundreds of Luminous Moons
    this.moonCount = 64;
    this.moons = [];

    const sphereGeo = new THREE.SphereGeometry(1.0, 24, 24);
    this.disposables.push(sphereGeo);

    // Custom multi-world planetary shader
    this.moonUniforms = {
      uTime: { value: 0 },
      uAwaken: { value: 0 }
    };

    for (let i = 0; i < this.moonCount; i++) {
      const type = i % 5;
      const size = 0.85 + (i % 7) * 0.18;

      // Select branch anchor
      const branchAnchor = this.branchEndpoints[i % this.branchEndpoints.length].clone();
      branchAnchor.x += (Math.random() - 0.5) * 5;
      branchAnchor.y += (Math.random() - 0.5) * 5;
      branchAnchor.z += (Math.random() - 0.5) * 5;

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uType: { value: type },
          uTime: { value: 0 },
          uGlow: { value: 0 }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uType;
          uniform float uTime;
          uniform float uGlow;
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          varying vec2 vUv;

          void main() {
            vec3 col = vec3(0.0);
            float n = sin(vUv.y * 25.0 + uTime * 0.5);

            if (uType < 0.5) {
              // Gas Giant with banded clouds and swirling storm eye
              col = mix(vec3(0.85, 0.45, 0.15), vec3(0.95, 0.85, 0.6), n * 0.5 + 0.5);
              float storm = exp(-length(vUv - vec2(0.6, 0.42)) * 14.0);
              col = mix(col, vec3(0.95, 0.2, 0.1), storm * 0.85);
            } else if (uType < 1.5) {
              // Terrestrial blue ocean / continents / atmospheric clouds
              col = mix(vec3(0.08, 0.32, 0.82), vec3(0.85, 0.95, 1.0), smoothstep(0.25, 0.68, n));
            } else if (uType < 2.5) {
              // Volcanic molten fissures with animated thermal pulse
              float fissure = step(0.62, fract(sin(dot(vUv, vec2(12.9, 78.2))) * 4375.8));
              float thermal = sin(uTime * 2.5 + vUv.x * 6.28) * 0.25 + 0.75;
              col = mix(vec3(0.12, 0.08, 0.08), vec3(1.0, 0.48, 0.08) * thermal * 1.5, fissure);
            } else if (uType < 3.5) {
              // Ice world with crystalline crevasses
              col = mix(vec3(0.35, 0.82, 0.95), vec3(0.95, 0.98, 1.0), n * 0.5 + 0.5);
            } else {
              // Pearlescent bioluminescent aurora pearl
              col = vec3(0.7, 0.4, 0.9) + vec3(0.3, 0.5, 0.2) * sin(uTime + vUv.x * 6.28);
            }

            // Atmospheric corona glow
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.5);
            col += vec3(1.0, 0.92, 0.65) * (fresnel * (0.65 + uGlow * 1.4));

            gl_FragColor = vec4(col, 1.0);
          }
        `
      });
      this.disposables.push(mat);

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.setScalar(size);
      mesh.position.copy(branchAnchor);
      this.group.add(mesh);

      // Orbital parameters for 3D celestial flower formation
      const petalIndex = i % 6; // 6 primary petals
      const baseAngle = (petalIndex * Math.PI * 2) / 6;
      const petalRadius = 38.0 + (i % 8) * 4.5;
      const heightRange = 16.0 + (i % 5) * 5.0;
      const speed = 0.45 + (i % 4) * 0.08;

      this.moons.push({
        mesh,
        mat,
        anchor: branchAnchor.clone(),
        size,
        baseAngle,
        petalRadius,
        heightRange,
        speed,
        petalIndex,
        detachDelay: 8.0 + (i / this.moonCount) * 12.0
      });
    }

    // 4. Glowing Flower Orbital Petal Ribbons
    const petalCount = 6;
    const ribbonPoints = 120;
    this.petalLines = [];

    for (let p = 0; p < petalCount; p++) {
      const linePositions = new Float32Array(ribbonPoints * 3);
      const angleOffset = (p * Math.PI * 2) / petalCount;

      for (let j = 0; j < ribbonPoints; j++) {
        const u = (j / ribbonPoints) * Math.PI * 2;
        // 3D Petal loop curve
        const r = 45.0 * Math.sin(u * 0.5);
        const theta = angleOffset + Math.sin(u) * 0.45;
        linePositions[j * 3 + 0] = Math.cos(theta) * r;
        linePositions[j * 3 + 1] = Math.sin(u * 2.0) * 14.0 + 12.0;
        linePositions[j * 3 + 2] = Math.sin(theta) * r;
      }

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      this.disposables.push(lineGeo);

      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffd277,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
      });
      this.disposables.push(lineMat);

      const line = new THREE.Line(lineGeo, lineMat);
      this.group.add(line);
      this.petalLines.push(line);
    }

    // Starry Void
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3 + 0] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.disposables.push(starGeo);

    const starMat = new THREE.PointsMaterial({ color: 0x99bbee, size: 1.5, transparent: true, opacity: 0.6 });
    this.disposables.push(starMat);
    this.group.add(new THREE.Points(starGeo, starMat));

    scene.add(this.group);
  }

  createTree() {
    // Procedural trunk and branching canopy
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -20, 0),
      new THREE.Vector3(1, -10, -1),
      new THREE.Vector3(-1.5, 2, 1),
      new THREE.Vector3(0, 14, 0)
    ]);
    const trunkGeo = new THREE.TubeGeometry(trunkCurve, 32, 3.8, 12, false);
    this.disposables.push(trunkGeo);

    const treeMat = new THREE.ShaderMaterial({
      uniforms: this.sapUniforms,
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
        uniform float uTime;
        uniform float uGlow;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          // Obsidian black bark
          vec3 bark = vec3(0.04, 0.045, 0.06);
          // Luminous golden sap veins rising upwards
          float sapWave = sin(vWorldPos.y * 0.45 - uTime * 2.5);
          float vein = smoothstep(0.7, 0.95, sapWave) * uGlow;
          vec3 goldSap = vec3(1.0, 0.85, 0.4) * 2.2;
          vec3 finalColor = mix(bark, goldSap, vein * 0.9);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(treeMat);

    const trunkMesh = new THREE.Mesh(trunkGeo, treeMat);
    this.group.add(trunkMesh);

    // Major branches spreading outward
    const branchCount = 10;
    for (let b = 0; b < branchCount; b++) {
      const angle = (b * Math.PI * 2) / branchCount;
      const r = 24 + (b % 3) * 6;
      const endY = 12 + Math.sin(b * 1.5) * 8;
      const endX = Math.cos(angle) * r;
      const endZ = Math.sin(angle) * r;

      const midX = endX * 0.5 + Math.sin(b) * 4;
      const midY = 16 + Math.cos(b) * 3;
      const midZ = endZ * 0.5 + Math.cos(b) * 4;

      const branchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 14, 0),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(endX, endY, endZ)
      ]);
      const branchGeo = new THREE.TubeGeometry(branchCurve, 20, 1.4, 8, false);
      this.disposables.push(branchGeo);

      const branchMesh = new THREE.Mesh(branchGeo, treeMat);
      this.group.add(branchMesh);

      this.branchEndpoints.push(new THREE.Vector3(endX, endY, endZ));

      // Secondary smaller twigs
      for (let sub = 0; sub < 2; sub++) {
        const subEndX = endX + (Math.random() - 0.5) * 12;
        const subEndY = endY + (Math.random() - 0.5) * 8;
        const subEndZ = endZ + (Math.random() - 0.5) * 12;
        this.branchEndpoints.push(new THREE.Vector3(subEndX, subEndY, subEndZ));
      }
    }
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Golden sap awakening: rising light in trunk/branches
    const sapGlow = smoothstep(5, 15, t) * (1.0 - smoothstep(40, 48, t));
    this.sapUniforms.uGlow.value = sapGlow;
    this.sapUniforms.uTime.value = t;

    // Orbital choreography
    this.moons.forEach((m, idx) => {
      m.mat.uniforms.uTime.value = t;
      m.mat.uniforms.uGlow.value = sapGlow;

      // Detach animation progression
      // Detaches smoothly from branch, orbits in flower formation, returns to branch
      const detachFactor = smoothstep(m.detachDelay, m.detachDelay + 6.0, t) *
                            (1.0 - smoothstep(38.0, 46.0, t));
      const s = smootherstep(0, 1, detachFactor);

      if (s > 0.001) {
        // Parametric flower orbit
        const theta = m.baseAngle + (t - m.detachDelay) * m.speed * 0.4;
        const petalMod = Math.sin(theta * 3.0); // 3-lobed rose petal per orbit
        const r = m.petalRadius + petalMod * 14.0;
        const orbitX = Math.cos(theta) * r;
        const orbitY = 12.0 + Math.sin(theta * 2.0) * m.heightRange;
        const orbitZ = Math.sin(theta) * r;

        m.mesh.position.lerpVectors(m.anchor, new THREE.Vector3(orbitX, orbitY, orbitZ), s);
      } else {
        m.mesh.position.copy(m.anchor);
      }
    });

    // Luminous Petal lines opacity (climax blossom)
    const flowerClimax = smoothstep(22, 32, t) * (1.0 - smoothstep(38, 45, t));
    this.petalLines.forEach((line, pIdx) => {
      line.material.opacity = flowerClimax * 0.75;
      line.rotation.y = t * 0.08 + (pIdx * 0.1);
    });

    // Camera Choreography
    let camPos = new THREE.Vector3();
    let target = new THREE.Vector3(0, 10, 0);

    if (t < 14) {
      // Intimate close shot of dark roots and trunk as golden sap surges
      const p = t / 14;
      camPos.set(Math.sin(p * 1.5) * 32, -8 + p * 18, Math.cos(p * 1.5) * 32);
      target.set(0, 8, 0);
    } else if (t < 28) {
      // Tracking moons as they detach and fly into space
      const p = (t - 14) / 14;
      camPos.set(Math.cos(p * 2.0) * 65, 18 + p * 14, Math.sin(p * 2.0) * 65);
      target.set(0, 14, 0);
    } else if (t < 40) {
      // Grand panoramic view of the celestial flower blossoming around the ancient tree
      const p = (t - 28) / 12;
      camPos.set(Math.sin(p * 1.8 + 0.8) * 95, 38 + Math.sin(p * Math.PI) * 12, Math.cos(p * 1.8 + 0.8) * 95);
      target.set(0, 12, 0);
    } else {
      // Returning to tranquil orchard as moons dock back onto branches
      const p = (t - 40) / 10;
      camPos.set(Math.cos(2.8 + p * 0.8) * (85 - p * 40), 38 - p * 22, Math.sin(2.8 + p * 0.8) * (85 - p * 40));
      target.set(0, 10, 0);
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
