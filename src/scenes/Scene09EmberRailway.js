import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';

/**
 * EXPERIMENT 09 — THE EMBER RAILWAY
 * Steam locomotive in volcanic canyon beneath starry sky.
 * Spline-driven motion; tracks forge from glowing sparks ahead of train
 * and disintegrate into embers behind it.
 * Mechanical drive wheels/pistons, steam exhaust, climbs into vertical loop upside down against stars.
 */
export class Scene09EmberRailway {
  constructor() {
    this.name = 'The Ember Railway';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x060305);
    scene.fog = new THREE.FogExp2(0x060305, 0.0035);

    camera.fov = 50;
    camera.near = 0.5;
    camera.far = 1600;
    camera.updateProjectionMatrix();

    // Canyon ambient and volcanic glow
    const amb = new THREE.AmbientLight(0x241210, 1.2);
    this.group.add(amb);

    this.magmaLight = new THREE.DirectionalLight(0xff4411, 2.2);
    this.magmaLight.position.set(0, -40, 0);
    this.group.add(this.magmaLight);

    // 1. Volcanic Canyon & Magma Floor
    const canyonGeo = new THREE.PlaneGeometry(600, 600, 40, 40);
    canyonGeo.rotateX(-Math.PI / 2);
    this.disposables.push(canyonGeo);

    const canyonMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
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
        varying vec3 vWorldPos;
        void main() {
          // Dark obsidian crags with glowing magma rivers
          float magmaRiver = smoothstep(18.0, 0.0, abs(vWorldPos.x));
          vec3 magmaCol = mix(vec3(0.9, 0.2, 0.05), vec3(1.0, 0.8, 0.2), sin(vWorldPos.z * 0.1 + uTime * 2.0) * 0.5 + 0.5);
          vec3 rockCol = vec3(0.08, 0.06, 0.07);

          vec3 finalColor = mix(rockCol, magmaCol * 1.8, magmaRiver);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(canyonMat);

    this.canyonMesh = new THREE.Mesh(canyonGeo, canyonMat);
    this.canyonMesh.position.y = -35;
    this.group.add(this.canyonMesh);

    // 2. Continuous 3D Spline Railway Loop
    // Includes straight canyon approach, vertical climbing arc, full 360 loop, descent
    const points = [
      new THREE.Vector3(0, 10, -140),
      new THREE.Vector3(0, 10, -80),
      new THREE.Vector3(0, 14, -20),
      new THREE.Vector3(0, 32, 20),
      new THREE.Vector3(0, 72, 45),    // Top of vertical loop (inverted upside down against stars)
      new THREE.Vector3(0, 52, 65),    // Coming down from loop
      new THREE.Vector3(0, 22, 50),
      new THREE.Vector3(0, 10, 0),
      new THREE.Vector3(0, 10, -60),
      new THREE.Vector3(0, 10, -140)
    ];
    this.trackCurve = new THREE.CatmullRomCurve3(points, true);

    // 3. Dynamic Track Assembly & Disintegration System
    // Instanced cross-ties along track
    this.tieCount = 200;
    const tieGeo = new THREE.BoxGeometry(4.2, 0.6, 1.2);
    this.disposables.push(tieGeo);

    this.trackUniforms = {
      uTrainU: { value: 0 },
      uTime: { value: 0 }
    };

    const tieMat = new THREE.ShaderMaterial({
      uniforms: this.trackUniforms,
      vertexShader: `
        attribute float aCurveU;
        uniform float uTrainU;
        varying float vState; // 0 = not built, 1 = forming sparks, 2 = solid, 3 = embers
        varying vec3 vWorldPos;

        void main() {
          // Distance along curve relative to train
          float diff = aCurveU - uTrainU;
          if (diff < -0.5) diff += 1.0;
          if (diff > 0.5) diff -= 1.0;

          // Ahead of train: +0.01 to +0.14 (spark assembly wave)
          // Under train: -0.05 to +0.01 (solid track)
          // Behind train: -0.12 to -0.05 (ember disintegration wave)
          vec3 pos = position;

          if (diff > 0.15 || diff < -0.15) {
            // Invisible / outside active window
            pos *= 0.0;
            vState = 0.0;
          } else if (diff > 0.02) {
            // Assembling sparks
            vState = 1.0;
          } else if (diff > -0.06) {
            // Solid supporting track
            vState = 2.0;
          } else {
            // Disintegrating into falling embers
            pos.y -= pow(abs(diff + 0.06) * 50.0, 1.8);
            vState = 3.0;
          }

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vState;
        varying vec3 vWorldPos;

        void main() {
          if (vState < 0.5) discard;

          vec3 col = vec3(0.0);
          if (vState < 1.5) {
            // Glowing white-gold assembly sparks
            col = vec3(1.2, 0.95, 0.5) * 2.0;
          } else if (vState < 2.5) {
            // Solid dark steel rail
            col = vec3(0.35, 0.32, 0.3);
          } else {
            // Fiery red/orange burning embers
            col = vec3(1.0, 0.4, 0.05) * 1.8;
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.disposables.push(tieMat);

    this.instancedTies = new THREE.InstancedMesh(tieGeo, tieMat, this.tieCount);
    const dummy = new THREE.Object3D();
    const curveUs = new Float32Array(this.tieCount);

    for (let i = 0; i < this.tieCount; i++) {
      const u = i / this.tieCount;
      curveUs[i] = u;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u);

      dummy.position.copy(pt);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.updateMatrix();
      this.instancedTies.setMatrixAt(i, dummy.matrix);
    }
    tieGeo.setAttribute('aCurveU', new THREE.InstancedBufferAttribute(curveUs, 1));
    this.instancedTies.instanceMatrix.needsUpdate = true;
    this.group.add(this.instancedTies);

    // 4. Procedural Locomotive
    this.createLocomotive();

    // 5. Billowing Steam Particles
    this.createSteamParticles();

    // Starfield in night sky
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3 + 0] = (Math.random() - 0.5) * 800;
      starPositions[i * 3 + 1] = Math.random() * 400 + 40;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.disposables.push(starGeo);

    const starMat = new THREE.PointsMaterial({ color: 0xddddff, size: 1.5, transparent: true, opacity: 0.7 });
    this.disposables.push(starMat);
    this.group.add(new THREE.Points(starGeo, starMat));

    scene.add(this.group);
  }

  createLocomotive() {
    this.trainGroup = new THREE.Group();

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.85, roughness: 0.3 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc89632, metalness: 0.9, roughness: 0.2 });
    this.disposables.push(ironMat, brassMat);

    // Boiler
    const boilerGeo = new THREE.CylinderGeometry(2.0, 2.0, 9.0, 20);
    boilerGeo.rotateX(Math.PI / 2);
    this.disposables.push(boilerGeo);
    const boiler = new THREE.Mesh(boilerGeo, ironMat);
    boiler.position.set(0, 2.5, 0.5);
    this.trainGroup.add(boiler);

    // Brass bands around boiler
    for (let b = -3; b <= 3; b += 2) {
      const bandGeo = new THREE.TorusGeometry(2.05, 0.08, 8, 24);
      this.disposables.push(bandGeo);
      const band = new THREE.Mesh(bandGeo, brassMat);
      band.position.set(0, 2.5, b);
      this.trainGroup.add(band);
    }

    // Cab
    const cabGeo = new THREE.BoxGeometry(4.4, 4.6, 4.0);
    this.disposables.push(cabGeo);
    const cab = new THREE.Mesh(cabGeo, ironMat);
    cab.position.set(0, 3.2, -4.5);
    this.trainGroup.add(cab);

    // Fiery furnace glow inside cab
    const furnaceLight = new THREE.PointLight(0xff5511, 2.5, 15);
    furnaceLight.position.set(0, 2.5, -4.2);
    this.trainGroup.add(furnaceLight);

    // Smokestack
    const stackGeo = new THREE.CylinderGeometry(0.7, 0.5, 2.2, 16);
    this.disposables.push(stackGeo);
    const stack = new THREE.Mesh(stackGeo, ironMat);
    stack.position.set(0, 5.2, 3.5);
    this.trainGroup.add(stack);

    // Headlamp
    const lampGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.2, 16);
    lampGeo.rotateX(Math.PI / 2);
    this.disposables.push(lampGeo);
    const lamp = new THREE.Mesh(lampGeo, brassMat);
    lamp.position.set(0, 3.2, 5.2);
    this.trainGroup.add(lamp);

    // Headlight Volumetric Beam
    const beamGeo = new THREE.ConeGeometry(8, 35, 24, 1, true);
    beamGeo.rotateX(-Math.PI / 2);
    beamGeo.translate(0, 0, 17.5);
    this.disposables.push(beamGeo);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffeebb,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.disposables.push(beamMat);

    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 3.2, 5.2);
    this.trainGroup.add(beam);

    // Illuminated Ash Motes inside Headlight Beam
    const beamMoteCount = 45;
    const beamMotePos = new Float32Array(beamMoteCount * 3);
    for (let i = 0; i < beamMoteCount; i++) {
      const z = 6.0 + Math.random() * 28.0;
      const spread = (z / 35.0) * 6.5;
      beamMotePos[i * 3 + 0] = (Math.random() - 0.5) * spread;
      beamMotePos[i * 3 + 1] = 3.2 + (Math.random() - 0.5) * spread;
      beamMotePos[i * 3 + 2] = z;
    }
    const beamMoteGeo = new THREE.BufferGeometry();
    beamMoteGeo.setAttribute('position', new THREE.BufferAttribute(beamMotePos, 3));
    this.disposables.push(beamMoteGeo);

    const beamMoteMat = new THREE.PointsMaterial({
      color: 0xfff0cc,
      size: 0.8,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.disposables.push(beamMoteMat);
    this.beamMotes = new THREE.Points(beamMoteGeo, beamMoteMat);
    this.trainGroup.add(this.beamMotes);

    // Molten Firebox Undercarriage Grate & Downward Glow
    const fireboxGrateGeo = new THREE.PlaneGeometry(3.6, 5.2);
    fireboxGrateGeo.rotateX(-Math.PI / 2);
    this.disposables.push(fireboxGrateGeo);

    const fireboxMat = new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.disposables.push(fireboxMat);

    const fireboxGrate = new THREE.Mesh(fireboxGrateGeo, fireboxMat);
    fireboxGrate.position.set(0, 0.4, -3.2);
    this.trainGroup.add(fireboxGrate);

    this.fireboxLight = new THREE.PointLight(0xff4400, 3.0, 10);
    this.fireboxLight.position.set(0, 0.3, -3.2);
    this.trainGroup.add(this.fireboxLight);

    // Churning Drive Wheels & Connecting Rods
    this.driveWheels = [];
    const wheelGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.4, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    this.disposables.push(wheelGeo);

    for (let w = 0; w < 4; w++) {
      const zOffset = -2.0 + w * 2.2;
      // Left wheel
      const wl = new THREE.Mesh(wheelGeo, ironMat);
      wl.position.set(-2.2, 1.4, zOffset);
      this.trainGroup.add(wl);
      this.driveWheels.push(wl);

      // Right wheel
      const wr = new THREE.Mesh(wheelGeo, ironMat);
      wr.position.set(2.2, 1.4, zOffset);
      this.trainGroup.add(wr);
      this.driveWheels.push(wr);
    }

    // Heavy Steel Reciprocating Connecting Side Rods
    const rodGeo = new THREE.BoxGeometry(0.25, 0.4, 7.2);
    this.disposables.push(rodGeo);

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, metalness: 0.95, roughness: 0.2 });
    this.disposables.push(steelMat);

    this.leftRod = new THREE.Mesh(rodGeo, steelMat);
    this.leftRod.position.set(-2.45, 1.4, 1.1);
    this.trainGroup.add(this.leftRod);

    this.rightRod = new THREE.Mesh(rodGeo, steelMat);
    this.rightRod.position.set(2.45, 1.4, 1.1);
    this.trainGroup.add(this.rightRod);

    // Heavy Steel Cowcatcher Pilot Wedge
    const cowcatcherGeo = new THREE.ConeGeometry(2.4, 2.2, 4);
    cowcatcherGeo.rotateX(Math.PI / 2);
    cowcatcherGeo.rotateY(Math.PI / 4);
    this.disposables.push(cowcatcherGeo);
    const cowcatcher = new THREE.Mesh(cowcatcherGeo, ironMat);
    cowcatcher.position.set(0, 0.8, 5.4);
    cowcatcher.scale.set(1.0, 0.6, 1.2);
    this.trainGroup.add(cowcatcher);

    // Kinetic Wheel Flange Sparks
    this.createWheelSparks();

    this.group.add(this.trainGroup);
  }

  createWheelSparks() {
    this.wheelSparkCount = 350;
    const sparkPos = new Float32Array(this.wheelSparkCount * 3);
    const sparkVels = new Float32Array(this.wheelSparkCount * 3);
    const sparkLifes = new Float32Array(this.wheelSparkCount);

    for (let i = 0; i < this.wheelSparkCount; i++) {
      sparkLifes[i] = Math.random();
      const side = (i % 2 === 0) ? -2.1 : 2.1;
      sparkPos[i * 3 + 0] = side;
      sparkPos[i * 3 + 1] = 0.2;
      sparkPos[i * 3 + 2] = 4.2;

      sparkVels[i * 3 + 0] = (side > 0 ? 1 : -1) * (2.0 + Math.random() * 4.0);
      sparkVels[i * 3 + 1] = 1.2 + Math.random() * 3.2;
      sparkVels[i * 3 + 2] = -12.0 - Math.random() * 14.0;
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    sparkGeo.setAttribute('aLife', new THREE.BufferAttribute(sparkLifes, 1));
    this.disposables.push(sparkGeo);
    this.wheelSparkGeo = sparkGeo;
    this.wheelSparkVels = sparkVels;
    this.wheelSparkPos = sparkPos;
    this.wheelSparkLifes = sparkLifes;

    const sparkMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aLife;
        varying float vLife;
        void main() {
          vLife = aLife;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.0 - aLife) * 18.0 * (35.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLife;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;
          vec3 whiteHot = vec3(1.5, 1.4, 1.1);
          vec3 orangeHot = vec3(1.3, 0.55, 0.08);
          vec3 col = mix(whiteHot, orangeHot, vLife);
          gl_FragColor = vec4(col, (1.0 - vLife) * 0.95);
        }
      `
    });
    this.disposables.push(sparkMat);

    this.wheelSparkMesh = new THREE.Points(sparkGeo, sparkMat);
    this.trainGroup.add(this.wheelSparkMesh);
  }

  createSteamParticles() {
    this.steamCount = 240;
    const steamPos = new Float32Array(this.steamCount * 3);
    const steamVels = new Float32Array(this.steamCount * 3);
    const steamLifes = new Float32Array(this.steamCount);

    for (let i = 0; i < this.steamCount; i++) {
      steamLifes[i] = Math.random();
    }

    const steamGeo = new THREE.BufferGeometry();
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    steamGeo.setAttribute('aLife', new THREE.BufferAttribute(steamLifes, 1));
    this.disposables.push(steamGeo);

    const steamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexShader: `
        attribute float aLife;
        varying float vLife;
        varying vec3 vWorldPos;
        void main() {
          vLife = aLife;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          // Volumetric puff expansion as steam ages
          gl_PointSize = (5.0 + aLife * 28.0) * (140.0 / length((viewMatrix * wp).xyz));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying float vLife;
        varying vec3 vWorldPos;
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float softEdge = smoothstep(0.5, 0.08, dist);

          // Chimney incandescent ember reflection at base, cooling to billowy steam
          vec3 emberTint = vec3(1.2, 0.55, 0.15);
          vec3 cloudWhite = vec3(0.82, 0.86, 0.92);
          vec3 col = mix(emberTint, cloudWhite, smoothstep(0.0, 0.35, vLife));

          float alpha = softEdge * (1.0 - vLife) * 0.42;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    this.disposables.push(steamMat);

    this.steamParticles = new THREE.Points(steamGeo, steamMat);
    this.steamVels = steamVels;
    this.steamLifes = steamLifes;
    this.group.add(this.steamParticles);

    // 6. Dynamic Track Disintegration Ash Flakes & Burning Ember Trails
    this.emberCount = 1400;
    const emberPos = new Float32Array(this.emberCount * 3);
    const emberVels = new Float32Array(this.emberCount * 3);
    const emberLifes = new Float32Array(this.emberCount);
    const emberColors = new Float32Array(this.emberCount * 3);

    for (let i = 0; i < this.emberCount; i++) {
      emberLifes[i] = Math.random();
      emberPos[i * 3 + 0] = 0;
      emberPos[i * 3 + 1] = -100;
      emberPos[i * 3 + 2] = 0;
    }

    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    emberGeo.setAttribute('color', new THREE.BufferAttribute(emberColors, 3));
    this.disposables.push(emberGeo);

    const emberMat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 1.6,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.disposables.push(emberMat);

    this.emberParticles = new THREE.Points(emberGeo, emberMat);
    this.emberVels = emberVels;
    this.emberLifes = emberLifes;
    this.group.add(this.emberParticles);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Spline curve progression
    // 0 to 1 full loop over 50 seconds
    const curveU = (t / this.duration) % 1.0;
    this.trackUniforms.uTrainU.value = curveU;
    this.trackUniforms.uTime.value = t;

    // Train position, tangent, and orientation along spline
    const trainPos = this.trackCurve.getPointAt(curveU);
    const trainTangent = this.trackCurve.getTangentAt(curveU).normalize();

    this.trainGroup.position.copy(trainPos);

    // Compute up-vector: normal to tangent
    // During the vertical loop, train naturally inverts upside-down
    const normal = new THREE.Vector3(0, 1, 0);
    if (Math.abs(trainTangent.y) > 0.95) {
      normal.set(0, 0, -1);
    }
    const binormal = new THREE.Vector3().crossVectors(trainTangent, normal).normalize();
    const dynamicUp = new THREE.Vector3().crossVectors(binormal, trainTangent).normalize();

    const m = new THREE.Matrix4();
    m.makeBasis(binormal, dynamicUp, trainTangent);
    this.trainGroup.quaternion.setFromRotationMatrix(m);

    // Firebox underglow flicker
    if (this.fireboxLight) {
      this.fireboxLight.intensity = 2.8 + Math.sin(t * 16.0) * 0.9 + Math.cos(t * 24.0) * 0.5;
    }

    // Headlight beam motes drifting through illumination cone
    if (this.beamMotes) {
      const bPos = this.beamMotes.geometry.attributes.position.array;
      for (let i = 0; i < 45; i++) {
        bPos[i * 3 + 2] -= deltaTime * 12.0;
        if (bPos[i * 3 + 2] < 6.0) {
          bPos[i * 3 + 2] = 34.0;
        }
      }
      this.beamMotes.geometry.attributes.position.needsUpdate = true;
    }

    // Rotate drive wheels & reciprocating connecting rods
    const wheelRot = t * 18.0;
    this.driveWheels.forEach(w => {
      w.rotation.x = wheelRot;
    });

    if (this.leftRod) {
      this.leftRod.position.set(-2.45, 1.4 + Math.sin(wheelRot) * 0.55, 1.1 + Math.cos(wheelRot) * 0.55);
    }
    if (this.rightRod) {
      this.rightRod.position.set(2.45, 1.4 + Math.sin(wheelRot) * 0.55, 1.1 + Math.cos(wheelRot) * 0.55);
    }

    // Animate rhythmic steam puffs synchronized with driving wheel piston chuffs
    const chuffPhase = Math.sin(wheelRot * 2.0);
    const isChuffing = chuffPhase > 0.2;
    const stackWorld = new THREE.Vector3(0, 5.5, 3.5).applyMatrix4(this.trainGroup.matrixWorld);
    const steamPositions = this.steamParticles.geometry.attributes.position.array;
    const steamLifesArr = this.steamParticles.geometry.attributes.aLife.array;

    for (let i = 0; i < this.steamCount; i++) {
      this.steamLifes[i] += deltaTime * 0.75;
      steamLifesArr[i] = this.steamLifes[i];
      if (this.steamLifes[i] > 1.0) {
        this.steamLifes[i] = 0;
        steamLifesArr[i] = 0;
        steamPositions[i * 3 + 0] = stackWorld.x + (Math.random() - 0.5) * 0.4;
        steamPositions[i * 3 + 1] = stackWorld.y + (Math.random() - 0.5) * 0.4;
        steamPositions[i * 3 + 2] = stackWorld.z + (Math.random() - 0.5) * 0.4;

        const puffForce = isChuffing ? 7.2 : 2.8;
        this.steamVels[i * 3 + 0] = -trainTangent.x * 12.0 + (Math.random() - 0.5) * 2.2;
        this.steamVels[i * 3 + 1] = puffForce + Math.random() * 2.2;
        this.steamVels[i * 3 + 2] = -trainTangent.z * 12.0 + (Math.random() - 0.5) * 2.2;
      } else {
        // Atmospheric drag deceleration and upward buoyancy
        this.steamVels[i * 3 + 0] *= 0.97;
        this.steamVels[i * 3 + 1] += deltaTime * 1.5;
        this.steamVels[i * 3 + 2] *= 0.97;

        steamPositions[i * 3 + 0] += this.steamVels[i * 3 + 0] * deltaTime;
        steamPositions[i * 3 + 1] += this.steamVels[i * 3 + 1] * deltaTime;
        steamPositions[i * 3 + 2] += this.steamVels[i * 3 + 2] * deltaTime;
      }
    }
    this.steamParticles.geometry.attributes.position.needsUpdate = true;
    this.steamParticles.geometry.attributes.aLife.needsUpdate = true;

    // Track Disintegration Ash & Ember Particle Simulation
    if (this.emberParticles) {
      const pos = this.emberParticles.geometry.attributes.position.array;
      const col = this.emberParticles.geometry.attributes.color.array;

      for (let i = 0; i < this.emberCount; i++) {
        const idx = i * 3;
        this.emberLifes[i] += deltaTime * 0.92;

        if (this.emberLifes[i] >= 1.0) {
          this.emberLifes[i] = 0.0;
          // Spawn along disintegrating track zone behind the train
          const trailU = (curveU - 0.055 - Math.random() * 0.08 + 1.0) % 1.0;
          const p = this.trackCurve.getPointAt(trailU);
          pos[idx + 0] = p.x + (Math.random() - 0.5) * 3.5;
          pos[idx + 1] = p.y + (Math.random() - 0.5) * 1.2;
          pos[idx + 2] = p.z + (Math.random() - 0.5) * 3.5;

          this.emberVels[idx + 0] = (Math.random() - 0.5) * 3.5;
          this.emberVels[idx + 1] = -2.0 - Math.random() * 6.0;
          this.emberVels[idx + 2] = (Math.random() - 0.5) * 3.5;
        } else {
          // Downward gravity and swirling atmospheric turbulence
          this.emberVels[idx + 1] -= 20.0 * deltaTime;
          pos[idx + 0] += (this.emberVels[idx + 0] + Math.sin(pos[idx + 1] * 0.2 + t * 4.0) * 1.5) * deltaTime;
          pos[idx + 1] += this.emberVels[idx + 1] * deltaTime;
          pos[idx + 2] += (this.emberVels[idx + 2] + Math.cos(pos[idx + 1] * 0.2 + t * 4.0) * 1.5) * deltaTime;
        }

        // Color transition: incandescent molten gold -> fiery orange -> cooling charcoal ash
        const life = this.emberLifes[i];
        if (life < 0.25) {
          col[idx + 0] = 1.4; col[idx + 1] = 0.95; col[idx + 2] = 0.45; // Incandescent gold
        } else if (life < 0.6) {
          col[idx + 0] = 1.2; col[idx + 1] = 0.45; col[idx + 2] = 0.08; // Fiery ember orange
        } else {
          const fade = 1.0 - (life - 0.6) / 0.4;
          col[idx + 0] = 0.35 * fade; col[idx + 1] = 0.15 * fade; col[idx + 2] = 0.05 * fade; // Cooling charcoal ash
        }
      }

      this.emberParticles.geometry.attributes.position.needsUpdate = true;
      this.emberParticles.geometry.attributes.color.needsUpdate = true;
    }

    // Kinetic Wheel Flange Sparks Update
    if (this.wheelSparkGeo && this.wheelSparkPos) {
      const pos = this.wheelSparkPos;
      const vels = this.wheelSparkVels;
      const lifes = this.wheelSparkLifes;
      for (let i = 0; i < this.wheelSparkCount; i++) {
        lifes[i] += deltaTime * (2.8 + (i % 6) * 0.4);
        if (lifes[i] >= 1.0) {
          lifes[i] = 0.0;
          const side = (i % 2 === 0) ? -2.1 : 2.1;
          pos[i * 3 + 0] = side + (Math.random() - 0.5) * 0.15;
          pos[i * 3 + 1] = 0.2 + Math.random() * 0.25;
          pos[i * 3 + 2] = 4.2 + (Math.random() - 0.5) * 0.4;

          vels[i * 3 + 0] = (side > 0 ? 1 : -1) * (2.2 + Math.random() * 4.2);
          vels[i * 3 + 1] = 1.4 + Math.random() * 3.5;
          vels[i * 3 + 2] = -12.0 - Math.random() * 15.0;
        } else {
          pos[i * 3 + 0] += vels[i * 3 + 0] * deltaTime;
          pos[i * 3 + 1] += vels[i * 3 + 1] * deltaTime - 12.0 * deltaTime * deltaTime * 0.5;
          vels[i * 3 + 1] -= 12.0 * deltaTime;
          pos[i * 3 + 2] += vels[i * 3 + 2] * deltaTime;
        }
      }
      this.wheelSparkGeo.attributes.position.needsUpdate = true;
      this.wheelSparkGeo.attributes.aLife.needsUpdate = true;
    }

    // Cinematic Camera Tracking
    let camPos = new THREE.Vector3();
    let lookTarget = trainPos.clone().add(new THREE.Vector3(0, 3, 0));

    if (t < 15) {
      // Dynamic low tracking shot alongside churning drive wheels
      const p = t / 15;
      const sideOffset = new THREE.Vector3(-14, 2, -4).applyQuaternion(this.trainGroup.quaternion);
      camPos.copy(trainPos).add(sideOffset);
      lookTarget.copy(trainPos).add(new THREE.Vector3(0, 2, 6));
    } else if (t < 25) {
      // Panning forward to frame cowcatcher and wheel sparks
      const p = (t - 15) / 10;
      const frontOffset = new THREE.Vector3(10.0 - p * 4.0, 3.5, 14.0).applyQuaternion(this.trainGroup.quaternion);
      camPos.copy(trainPos).add(frontOffset);
      lookTarget.copy(trainPos).add(new THREE.Vector3(0, 2.2, 1.5));
    } else if (t < 38) {
      // Climax: Tracking the train through the vertical loop (upside-down against the stars)
      const p = (t - 25) / 13;
      camPos.set(Math.cos(p * 2.5) * 65, 55, 30 + Math.sin(p * 2.0) * 40);
      lookTarget.copy(trainPos);
    } else {
      // Sweeping wide view of the train completing the loop and continuing along canyon
      const p = (t - 38) / 12;
      camPos.set(Math.sin(2.4 + p * 0.8) * 85, 32 - p * 12, -60 - p * 50);
      lookTarget.copy(trainPos);
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
