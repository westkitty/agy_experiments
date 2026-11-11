import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';

/**
 * EXPERIMENT 08 — THE CATHEDRAL OF A THOUSAND DOORS
 * Black reflective floor stretching into darkness.
 * Suspended architectural doorframes opening into 4 distinct worlds:
 * (snow mountains, red desert, luminous rainstorm, extraterrestrial ocean).
 * Escaping snow, rain, mist, dust; immense corridor of realities; sequential closing.
 */
export class Scene08CathedralThousandDoors {
  constructor() {
    this.name = 'The Cathedral of a Thousand Doors';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x010204);
    scene.fog = new THREE.FogExp2(0x010204, 0.004);

    camera.fov = 50;
    camera.near = 0.5;
    camera.far = 1500;
    camera.updateProjectionMatrix();

    const amb = new THREE.AmbientLight(0x0d121c, 0.8);
    this.group.add(amb);

    // 1. Black Obsidian Reflective Floor
    const floorGeo = new THREE.PlaneGeometry(600, 600, 40, 40);
    floorGeo.rotateX(-Math.PI / 2);
    this.disposables.push(floorGeo);

    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpenAvg: { value: 0 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpenAvg;
        varying vec3 vWorldPos;
        void main() {
          // Deep glossy obsidian mirror
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.5);

          // Specular light spill from corridor doors along z axis
          float corridorDist = abs(vWorldPos.x);
          float spillLight = exp(-corridorDist * 0.04) * uOpenAvg;
          vec3 spillCol = mix(vec3(0.1, 0.2, 0.4), vec3(0.7, 0.5, 0.3), sin(vWorldPos.z * 0.05) * 0.5 + 0.5);

          vec3 mirrorBase = vec3(0.015, 0.02, 0.03);
          vec3 finalColor = mirrorBase + spillCol * spillLight * 0.85 + vec3(fresnel * 0.25);

          float d = length(vWorldPos.xz);
          float fog = 1.0 - exp(-d * 0.004);
          finalColor = mix(finalColor, vec3(0.01, 0.015, 0.02), fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(this.floorMat);

    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorMesh.position.y = 0;
    this.group.add(this.floorMesh);

    // 2. Grand Corridor of Monumental Foreground Portals
    this.portals = [];
    this.createGrandCorridor();

    // 3. Hundreds of Distant Suspended Doorframes
    this.createDistantDoorframes();

    // 4. Escaping Particles (Snow, Red Dust, Rain Mist, Cyan Motes)
    this.createEscapingParticles();

    scene.add(this.group);
  }

  createGrandCorridor() {
    // 8 Monumental Portals flanking the central corridor: z from 20 to -160
    const frameGeo = new THREE.BoxGeometry(11, 22, 1.8);
    this.disposables.push(frameGeo);

    const stoneFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e28,
      roughness: 0.8,
      metalness: 0.2
    });
    this.disposables.push(stoneFrameMat);

    // 4 World vista shaders
    const worldShaderConfigs = [
      {
        name: 'Snow Mountain',
        col1: new THREE.Color(0x88ccff),
        col2: new THREE.Color(0xffffff),
        lightCol: new THREE.Color(0xaaddee)
      },
      {
        name: 'Red Desert',
        col1: new THREE.Color(0xcc3311),
        col2: new THREE.Color(0xffaa44),
        lightCol: new THREE.Color(0xff7733)
      },
      {
        name: 'Luminous Rainstorm',
        col1: new THREE.Color(0x00cc88),
        col2: new THREE.Color(0x11ffbb),
        lightCol: new THREE.Color(0x33eebb)
      },
      {
        name: 'Extraterrestrial Ocean',
        col1: new THREE.Color(0x1144bb),
        col2: new THREE.Color(0x55ffff),
        lightCol: new THREE.Color(0x2288ee)
      }
    ];

    const vistaPlaneGeo = new THREE.PlaneGeometry(8.0, 19.0);
    this.disposables.push(vistaPlaneGeo);

    const doorPanelGeo = new THREE.BoxGeometry(4.0, 19.0, 0.35);
    doorPanelGeo.translate(2.0, 0, 0); // Pivot on edge
    this.disposables.push(doorPanelGeo);

    // Architectural Doorframe Geometries (Hollow Portal)
    const jambGeo = new THREE.BoxGeometry(1.4, 20.0, 2.0);
    const lintelGeo = new THREE.BoxGeometry(10.8, 2.0, 2.2);
    const pedimentGeo = new THREE.ConeGeometry(5.6, 2.5, 4); // Classical triangular pediment
    pedimentGeo.rotateY(Math.PI / 4);
    this.disposables.push(jambGeo, lintelGeo, pedimentGeo);

    for (let i = 0; i < 8; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const row = Math.floor(i / 2);
      const zPos = 20 - row * 55;
      const xPos = side * 18;
      const worldCfg = worldShaderConfigs[row % 4];

      const portalGroup = new THREE.Group();
      portalGroup.position.set(xPos, 11, zPos);
      // Angle portals gently toward the central corridor
      portalGroup.rotation.y = (side === -1) ? 0.35 : -0.35;

      // Outer Architectural Frame (Left jamb, Right jamb, Top lintel, Pediment)
      const leftJamb = new THREE.Mesh(jambGeo, stoneFrameMat);
      leftJamb.position.set(-4.7, 0, 0);
      portalGroup.add(leftJamb);

      const rightJamb = new THREE.Mesh(jambGeo, stoneFrameMat);
      rightJamb.position.set(4.7, 0, 0);
      portalGroup.add(rightJamb);

      const lintel = new THREE.Mesh(lintelGeo, stoneFrameMat);
      lintel.position.set(0, 10.0, 0);
      portalGroup.add(lintel);

      const pediment = new THREE.Mesh(pedimentGeo, stoneFrameMat);
      pediment.position.set(0, 12.2, 0);
      portalGroup.add(pediment);

      // Vista Plane inside the doorway
      const vistaMat = new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uWorldType: { value: row % 4 },
          uOpen: { value: 0 }
        },
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
          uniform float uWorldType;
          uniform float uOpen;
          varying vec2 vUv;
          varying vec3 vWorldPos;

          void main() {
            vec3 col = vec3(0.0);
            if (uWorldType < 0.5) {
              // Snow Mountain vista
              float peak = step(0.4 + sin(vUv.x * 6.28) * 0.25, vUv.y);
              col = mix(vec3(0.9, 0.95, 1.0), vec3(0.2, 0.45, 0.75), peak);
              col += vec3(0.3) * fract(sin(dot(vUv * 100.0, vec2(12.9, 78.2)) + uTime * 15.0));
            } else if (uWorldType < 1.5) {
              // Red Desert vista with twin moons
              col = mix(vec3(0.95, 0.35, 0.1), vec3(0.35, 0.08, 0.18), vUv.y);
              float moon = exp(-length(vUv - vec2(0.65, 0.75)) * 18.0);
              col += vec3(1.2, 0.8, 0.9) * moon * 2.5;
            } else if (uWorldType < 2.5) {
              // Luminous Tropical Rainstorm
              col = mix(vec3(0.1, 0.85, 0.55), vec3(0.02, 0.25, 0.15), vUv.y);
              float rain = step(0.85, fract(vUv.y * 30.0 + vUv.x * 2.0 + uTime * 18.0));
              col += vec3(0.4, 1.0, 0.8) * rain;
            } else {
              // Extraterrestrial Ocean
              col = mix(vec3(0.1, 0.3, 0.95), vec3(0.02, 0.08, 0.3), vUv.y);
              float orb = exp(-length(vUv - vec2(0.4, 0.45 + sin(uTime) * 0.1)) * 14.0);
              col += vec3(0.4, 0.95, 1.2) * orb * 3.0;
            }

            // Self-illuminated portal window
            gl_FragColor = vec4(col * (0.3 + uOpen * 2.0), 1.0);
          }
        `
      });
      this.disposables.push(vistaMat);

      const vistaMesh = new THREE.Mesh(vistaPlaneGeo, vistaMat);
      vistaMesh.position.z = -0.2;
      portalGroup.add(vistaMesh);

      // Hinged Double Doors (swinging outwards towards the corridor)
      const doorMat = new THREE.MeshStandardMaterial({
        color: 0x5a4832,
        metalness: 0.85,
        roughness: 0.3
      });
      this.disposables.push(doorMat);

      // Left door panel (pivots at x = -4.0)
      const leftDoor = new THREE.Mesh(doorPanelGeo, doorMat);
      leftDoor.position.set(-4.0, 0, 0.1);
      portalGroup.add(leftDoor);

      // Right door panel (pivots at x = 4.0)
      const rightDoor = new THREE.Mesh(doorPanelGeo, doorMat);
      rightDoor.position.set(4.0, 0, 0.1);
      rightDoor.rotation.y = Math.PI; // Invert orientation
      portalGroup.add(rightDoor);

      // Point Light inside doorway emitting colored light
      const portalLight = new THREE.PointLight(worldCfg.lightCol, 0, 45);
      portalLight.position.set(0, 0, 2);
      portalGroup.add(portalLight);

      // Light Spill Trapezoid on floor
      const spillGeo = new THREE.PlaneGeometry(16, 35);
      spillGeo.rotateX(-Math.PI / 2);
      this.disposables.push(spillGeo);

      const spillMat = new THREE.MeshBasicMaterial({
        color: worldCfg.lightCol,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.disposables.push(spillMat);

      const spillMesh = new THREE.Mesh(spillGeo, spillMat);
      spillMesh.position.set(xPos + (side * -8), 0.05, zPos);
      this.group.add(spillMesh);

      this.group.add(portalGroup);

      this.portals.push({
        group: portalGroup,
        leftDoor,
        rightDoor,
        vistaMat,
        spillMesh,
        portalLight,
        openDelay: 6.0 + i * 2.8,
        worldType: row % 4
      });
    }
  }

  createDistantDoorframes() {
    // 160 suspended doorframes floating in dark cathedral space
    const count = 160;
    const miniFrameGeo = new THREE.BoxGeometry(6, 12, 0.8);
    this.disposables.push(miniFrameGeo);

    const miniFrameMat = new THREE.MeshStandardMaterial({
      color: 0x141824,
      roughness: 0.9,
      metalness: 0.2
    });
    this.disposables.push(miniFrameMat);

    this.distantFrames = new THREE.InstancedMesh(miniFrameGeo, miniFrameMat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 * 3;
      const r = 45 + Math.random() * 95;
      const x = Math.cos(angle) * r;
      const y = 8 + Math.random() * 55;
      const z = -20 - Math.random() * 220;

      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.scale.setScalar(0.6 + Math.random() * 0.8);
      dummy.updateMatrix();
      this.distantFrames.setMatrixAt(i, dummy.matrix);
    }

    this.distantFrames.instanceMatrix.needsUpdate = true;
    this.group.add(this.distantFrames);
  }

  createEscapingParticles() {
    // Escaping particles (snow, red dust, rain, cyan motes)
    this.partCount = 800;
    const partPos = new Float32Array(this.partCount * 3);
    const partVels = new Float32Array(this.partCount * 3);
    const partTypes = new Float32Array(this.partCount);

    for (let i = 0; i < this.partCount; i++) {
      partPos[i * 3 + 0] = (Math.random() - 0.5) * 45;
      partPos[i * 3 + 1] = Math.random() * 15;
      partPos[i * 3 + 2] = -Math.random() * 180;

      partVels[i * 3 + 0] = (Math.random() - 0.5) * 4.0;
      partVels[i * 3 + 1] = -Math.random() * 3.0;
      partVels[i * 3 + 2] = 2.0 + Math.random() * 4.0; // Drifting forward down corridor
      partTypes[i] = i % 4;
    }

    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    this.disposables.push(partGeo);

    const partMat = new THREE.PointsMaterial({
      color: 0xffeeaa,
      size: 1.8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    this.disposables.push(partMat);

    this.escapingParticles = new THREE.Points(partGeo, partMat);
    this.partVels = partVels;
    this.group.add(this.escapingParticles);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Door Openings & Closings
    // 0 - 6s: Pitch black silence
    // 6 - 26s: Portals swing open in sequence
    // 26 - 38s: Climax — entire corridor of realities ablaze
    // 38 - 46s: Sequential closing slam
    // 46 - 50s: Return to darkness
    let totalOpen = 0;

    this.portals.forEach((p, idx) => {
      // Opening curve
      const openProgress = smoothstep(p.openDelay, p.openDelay + 4.5, t);
      // Closing slam curve (slam shuts rapidly in sequence from back to front)
      const closeDelay = 37.0 + (7 - idx) * 1.1;
      const closeProgress = smoothstep(closeDelay, closeDelay + 1.2, t);

      const netOpen = smootherstep(0, 1, openProgress) * (1.0 - smootherstep(0, 1, closeProgress));
      totalOpen += netOpen;

      // Rotate door panels open (swing forward towards corridor up to 1.6 rad)
      p.leftDoor.rotation.y = netOpen * 1.6;
      p.rightDoor.rotation.y = Math.PI - netOpen * 1.6;

      p.vistaMat.uniforms.uOpen.value = netOpen;
      p.vistaMat.uniforms.uTime.value = t;

      // Light spill and portal light onto floor
      p.spillMesh.material.opacity = netOpen * 0.65;
      if (p.portalLight) {
        p.portalLight.intensity = netOpen * 3.8;
      }
    });

    const openAvg = totalOpen / this.portals.length;
    this.floorMat.uniforms.uOpenAvg.value = openAvg;
    this.floorMat.uniforms.uTime.value = t;

    // Escaping particles animation
    const partOpacity = smoothstep(8, 20, t) * (1.0 - smoothstep(38, 47, t));
    this.escapingParticles.material.opacity = partOpacity * 0.8;

    if (partOpacity > 0.01) {
      const positions = this.escapingParticles.geometry.attributes.position.array;
      for (let i = 0; i < this.partCount; i++) {
        const curX = positions[i * 3 + 0];
        const curZ = positions[i * 3 + 2];
        // Convective suction pulling weather motes toward center aisle with vortex swirl
        const centerDraft = -curX * 0.65 * deltaTime;
        const swirlY = Math.sin(curZ * 0.06 + t * 2.2) * 2.8 * deltaTime;
        const swirlX = Math.cos(curZ * 0.06 + t * 2.2) * 1.8 * deltaTime;

        positions[i * 3 + 0] += (this.partVels[i * 3 + 0] + swirlX) * deltaTime + centerDraft;
        positions[i * 3 + 1] += (this.partVels[i * 3 + 1] + swirlY) * deltaTime;
        positions[i * 3 + 2] += this.partVels[i * 3 + 2] * deltaTime;

        if (positions[i * 3 + 1] < 0 || positions[i * 3 + 2] > 30) {
          positions[i * 3 + 0] = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 8);
          positions[i * 3 + 1] = 10 + Math.random() * 8;
          positions[i * 3 + 2] = -Math.random() * 180;
        }
      }
      this.escapingParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Cinematic Camera Choreography
    let camPos = new THREE.Vector3();
    let target = new THREE.Vector3(0, 11, -60);

    if (t < 14) {
      // Gliding down the obsidian floor as the first doors open
      const p = t / 14;
      camPos.set(Math.sin(p * 1.2) * 6, 3.5 + p * 3.0, 75 - p * 30);
      target.set(0, 10, -50);
    } else if (t < 28) {
      // Gliding between the enormous open portals, banking close to the thresholds
      const p = (t - 14) / 14;
      camPos.set(Math.cos(p * 2.4) * 8, 6.5 + Math.sin(p * Math.PI) * 4, 45 - p * 45);
      target.set(Math.sin(p * 2.0) * 6, 11, -90);
    } else if (t < 40) {
      // Climax: Elevating to high corridor perspective framing all glowing open portals
      const p = (t - 28) / 12;
      camPos.set(Math.sin(p * 1.5) * 6, 18 + p * 6, 65 - p * 20);
      target.set(0, 12, -80);
    } else {
      // Gliding backward as the massive doors slam shut behind the camera
      const p = (t - 40) / 10;
      camPos.set(0, 12 - p * 8, 45 + p * 40);
      target.set(0, 8, -60);
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
