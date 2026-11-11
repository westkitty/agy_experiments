import * as THREE from 'three';
import { smoothstep, smootherstep, clamp } from '../common/MathUtils.js';

/**
 * EXPERIMENT 02 — THE MIRROR MIGRATION
 * Salt desert, shallow reflective water.
 * Thousands of rising rectangular mirrors reflecting distinct sky environments.
 * Synchronized rotation waves creating light patterns across landscape.
 * Climax: mirrors align to form one gigantic sun spanning the horizon, then descend.
 */
export class Scene02MirrorMigration {
  constructor() {
    this.name = 'The Mirror Migration';
    this.duration = 50.0;
    this.group = new THREE.Group();
    this.disposables = [];
  }

  init(renderer, camera, scene) {
    this.camera = camera;
    this.scene = scene;
    scene.background = new THREE.Color(0x0c1018);
    scene.fog = new THREE.FogExp2(0x0c1018, 0.004);

    camera.fov = 48;
    camera.near = 0.5;
    camera.far = 1600;
    camera.updateProjectionMatrix();

    // Ambient light
    const amb = new THREE.AmbientLight(0x202838, 1.0);
    this.group.add(amb);

    // Directional horizon light
    this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    this.sunLight.position.set(0, 8, -300);
    this.group.add(this.sunLight);

    // Atmospheric Horizon Sky Dome
    const skyGeo = new THREE.SphereGeometry(900, 32, 16);
    this.disposables.push(skyGeo);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 zenith = vec3(0.04, 0.06, 0.12);
          vec3 horizon = vec3(0.85, 0.72, 0.52);
          vec3 sunsetGlow = vec3(1.0, 0.45, 0.2);
          vec3 col = mix(horizon, zenith, clamp(h * 2.5, 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.disposables.push(skyMat);
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(this.skyMesh);

    // 1. Salt desert ground with shallow reflective water
    const groundGeo = new THREE.PlaneGeometry(600, 600, 80, 80);
    groundGeo.rotateX(-Math.PI / 2);
    this.disposables.push(groundGeo);

    this.groundMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunAlign: { value: 0 }
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
        uniform float uSunAlign;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          // White crystalline salt crust with micro cracks
          vec2 p = vWorldPos.xz * 0.15;
          float saltNoise = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 saltBase = vec3(0.92, 0.94, 0.96) * (0.85 + saltNoise * 0.15);

          // Shallow water specular reflection
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 norm = vec3(0.0, 1.0, 0.0);
          // Dual-frequency water ripples and emergence wake waves
          norm.x += sin(vWorldPos.x * 0.45 + uTime * 1.8) * 0.02 + sin(vWorldPos.z * 0.8 - uTime * 1.2) * 0.01;
          norm.z += cos(vWorldPos.z * 0.45 + uTime * 1.8) * 0.02 + cos(vWorldPos.x * 0.8 + uTime * 1.2) * 0.01;
          float distCenter = length(vWorldPos.xz);
          float wake = sin(distCenter * 0.15 - uTime * 2.2) * exp(-distCenter * 0.018) * 0.025;
          norm.x += wake * (vWorldPos.x / (distCenter + 0.1));
          norm.z += wake * (vWorldPos.z / (distCenter + 0.1));
          norm = normalize(norm);

          float fresnel = pow(1.0 - max(dot(viewDir, norm), 0.0), 3.0);
          vec3 skyReflect = mix(vec3(0.1, 0.15, 0.25), vec3(0.9, 0.8, 0.65), fresnel);

          // Moving refractive caustic light networks on salt floor
          float c1 = sin(vWorldPos.x * 0.35 + uTime * 2.2) * cos(vWorldPos.z * 0.35 - uTime * 1.9);
          float c2 = sin((vWorldPos.x + vWorldPos.z) * 0.28 - uTime * 1.4);
          float caustics = pow(max(c1 * 0.5 + c2 * 0.5 + 0.5, 0.0), 3.2) * 0.85;

          // Blinding golden glare during climax sun alignment
          vec3 sunReflect = vec3(1.0, 0.85, 0.4) * uSunAlign * max(dot(-viewDir, vec3(0.0, 0.0, -1.0)), 0.0) * 2.0;

          vec3 finalColor = mix(saltBase * 0.4 + vec3(caustics * 0.35), skyReflect, 0.65 + fresnel * 0.35);
          finalColor += vec3(1.0, 0.9, 0.7) * caustics * 0.4;
          finalColor += sunReflect;

          // Horizon distance fog
          float d = length(vWorldPos.xz);
          float fog = 1.0 - exp(-d * 0.003);
          finalColor = mix(finalColor, vec3(0.08, 0.1, 0.15), fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(this.groundMat);

    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMat);
    this.groundMesh.position.y = 0;
    this.group.add(this.groundMesh);

    // 2. Instanced Mirror Monoliths (1000 mirrors)
    this.mirrorCount = 1000;
    const mirrorGeo = new THREE.BoxGeometry(3.8, 18.0, 0.35);
    this.disposables.push(mirrorGeo);

    // Custom shader for instanced mirrors with distinct procedural environments
    this.mirrorUniforms = {
      uTime: { value: 0 },
      uRise: { value: 0 },
      uSunAlign: { value: 0 }
    };

    const mirrorMat = new THREE.ShaderMaterial({
      uniforms: this.mirrorUniforms,
      vertexShader: `
        attribute float aEnvType;
        attribute vec3 aBasePos;
        attribute float aHeightScale;
        attribute float aPhaseOffset;

        uniform float uTime;
        uniform float uRise;
        uniform float uSunAlign;

        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vReflectDir;
        varying float vEnvType;

        void main() {
          vEnvType = aEnvType;

          // Base height and scaling
          vec3 pos = position;
          pos.y *= aHeightScale;

          // Synchronized wave rotation
          float wave = sin(aBasePos.x * 0.02 + aBasePos.z * 0.02 - uTime * 0.85 + aPhaseOffset);
          float waveRot = wave * 0.55 * (1.0 - uSunAlign);

          // Climax alignment: all mirrors lock facing the horizon center (sun)
          float targetAngle = atan(aBasePos.x, -350.0 - aBasePos.z) * 0.5;
          float currentRot = mix(waveRot, targetAngle, uSunAlign);

          // Rotate around Y axis
          float c = cos(currentRot);
          float s = sin(currentRot);
          mat2 rotMat = mat2(c, -s, s, c);
          pos.xz = rotMat * pos.xz;

          // World position with rise / descend animation
          // Submerged beneath water at y = -14, rises to full height
          float elevatedY = aBasePos.y + (pos.y * 0.5) - 14.0 + (uRise * 18.0);
          vec3 worldP = vec3(aBasePos.x + pos.x, elevatedY, aBasePos.z + pos.z);

          vWorldPos = worldP;

          // Transformed normal
          vec3 norm = normal;
          norm.xz = rotMat * norm.xz;
          vWorldNormal = normalize(norm);

          vec3 viewDir = normalize(worldP - cameraPosition);
          vReflectDir = reflect(viewDir, vWorldNormal);

          gl_Position = projectionMatrix * viewMatrix * vec4(worldP, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uSunAlign;

        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        varying vec3 vReflectDir;
        varying float vEnvType;

        void main() {
          vec3 r = normalize(vReflectDir);
          vec3 envCol = vec3(0.0);

          // Procedural environment based on aEnvType
          // 0 = Golden Sunrise
          // 1 = Violet Clouds
          // 2 = Crimson Dusk
          // 3 = Star Field
          // 4 = Deep Twilight
          if (vEnvType < 0.5) {
            // Golden Sunrise
            float sunDisc = max(dot(r, vec3(0.0, 0.15, -0.98)), 0.0);
            envCol = mix(vec3(0.15, 0.08, 0.05), vec3(1.0, 0.65, 0.2), clamp(r.y * 2.0 + 0.4, 0.0, 1.0));
            envCol += vec3(1.0, 0.9, 0.5) * pow(sunDisc, 16.0) * 3.0;
          } else if (vEnvType < 1.5) {
            // Violet Clouds
            envCol = mix(vec3(0.1, 0.05, 0.2), vec3(0.65, 0.35, 0.8), clamp(r.y * 1.8 + 0.3, 0.0, 1.0));
            envCol += vec3(0.85, 0.5, 0.95) * pow(max(dot(r, vec3(0.5, 0.2, -0.8)), 0.0), 8.0);
          } else if (vEnvType < 2.5) {
            // Crimson Dusk
            envCol = mix(vec3(0.08, 0.02, 0.02), vec3(0.85, 0.18, 0.12), clamp(r.y * 1.5 + 0.3, 0.0, 1.0));
            envCol += vec3(1.0, 0.4, 0.1) * pow(max(dot(r, vec3(-0.4, 0.1, -0.9)), 0.0), 12.0);
          } else if (vEnvType < 3.5) {
            // Star Field
            float stars = fract(sin(dot(r.xy, vec2(12.9898, 78.233))) * 43758.5453);
            stars = step(0.985, stars) * 2.5;
            envCol = mix(vec3(0.01, 0.02, 0.05), vec3(0.05, 0.1, 0.2), clamp(r.y + 0.5, 0.0, 1.0)) + vec3(stars);
          } else {
            // Deep Cyan Twilight
            envCol = mix(vec3(0.02, 0.08, 0.12), vec3(0.2, 0.7, 0.85), clamp(r.y * 2.0 + 0.2, 0.0, 1.0));
          }

          // Climax Sun Alignment: all mirrors converge reflections into one colossal horizon sun
          float horizonSunRay = max(dot(r, vec3(0.0, 0.05, -0.998)), 0.0);
          vec3 giantSun = vec3(1.2, 0.95, 0.55) * pow(horizonSunRay, 6.0) * 4.0;
          envCol = mix(envCol, envCol + giantSun, uSunAlign);

          // Thin glass frame border
          float frame = 1.0;
          if (abs(vWorldNormal.z) < 0.6) frame = 0.25; // Dark metallic frame on sides

          // Atmospheric haze over distance
          float dist = length(vWorldPos.xz);
          float fog = 1.0 - exp(-dist * 0.0035);
          vec3 finalColor = mix(envCol * frame, vec3(0.08, 0.1, 0.15), fog);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    this.disposables.push(mirrorMat);

    this.instancedMirrors = new THREE.InstancedMesh(mirrorGeo, mirrorMat, this.mirrorCount);

    // Setup instance attributes
    const envTypes = new Float32Array(this.mirrorCount);
    const basePositions = new Float32Array(this.mirrorCount * 3);
    const heightScales = new Float32Array(this.mirrorCount);
    const phaseOffsets = new Float32Array(this.mirrorCount);

    const dummy = new THREE.Object3D();
    const radius = 180;

    for (let i = 0; i < this.mirrorCount; i++) {
      // Natural distribution across salt desert with a flight corridor
      const angle = (i / this.mirrorCount) * Math.PI * 2 * 7.5;
      const r = Math.sqrt((i + 1) / this.mirrorCount) * radius + 15;
      const x = Math.cos(angle) * r;
      const z = -Math.abs(Math.sin(angle) * r) - 10; // Spread toward horizon

      basePositions[i * 3 + 0] = x;
      basePositions[i * 3 + 1] = 0;
      basePositions[i * 3 + 2] = z;

      envTypes[i] = i % 5;
      heightScales[i] = 0.7 + Math.random() * 0.7;
      phaseOffsets[i] = (x + z) * 0.03 + Math.random() * 0.5;

      dummy.position.set(x, 0, z);
      dummy.updateMatrix();
      this.instancedMirrors.setMatrixAt(i, dummy.matrix);
    }

    mirrorGeo.setAttribute('aEnvType', new THREE.InstancedBufferAttribute(envTypes, 1));
    mirrorGeo.setAttribute('aBasePos', new THREE.InstancedBufferAttribute(basePositions, 3));
    mirrorGeo.setAttribute('aHeightScale', new THREE.InstancedBufferAttribute(heightScales, 1));
    mirrorGeo.setAttribute('aPhaseOffset', new THREE.InstancedBufferAttribute(phaseOffsets, 1));

    this.instancedMirrors.instanceMatrix.needsUpdate = true;
    this.group.add(this.instancedMirrors);

    // Monumental Horizon Sun Disc for Climax Alignment
    const sunFlareGeo = new THREE.PlaneGeometry(180, 85);
    this.disposables.push(sunFlareGeo);
    this.sunFlareMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunAlign: { value: 0 }
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
        uniform float uSunAlign;
        varying vec2 vUv;
        void main() {
          vec2 c = vUv - 0.5;
          float d = length(vec2(c.x * 0.7, c.y * 1.5)) * 2.0;
          float sunDisc = exp(-pow(d, 2.0) * 8.0);
          float halo = exp(-d * 2.5);
          vec3 sunCol = vec3(1.2, 0.95, 0.6) * sunDisc * 2.5 + vec3(1.0, 0.65, 0.25) * halo * 1.2;
          gl_FragColor = vec4(sunCol * uSunAlign, (sunDisc + halo * 0.6) * uSunAlign);
        }
      `
    });
    this.disposables.push(this.sunFlareMat);
    this.sunFlareMesh = new THREE.Mesh(sunFlareGeo, this.sunFlareMat);
    this.sunFlareMesh.position.set(0, 16, -345);
    this.group.add(this.sunFlareMesh);

    scene.add(this.group);
  }

  update(time, deltaTime, progress) {
    const t = (time % this.duration);

    // Mirror Rise & Fall Animation
    // 0 - 8s: Submerged beneath shallow water
    // 8 - 18s: Towering mirrors rise into the air
    // 18 - 38s: Full height synchronized wave rotation
    // 28 - 38s: Climax sun alignment
    // 40 - 48s: Descend back beneath water
    const riseFactor = smoothstep(6, 17, t) * (1.0 - smoothstep(39, 48, t));
    const sunAlignFactor = smoothstep(26, 33, t) * (1.0 - smoothstep(38, 43, t));

    this.mirrorUniforms.uTime.value = t;
    this.mirrorUniforms.uRise.value = smootherstep(0, 1, riseFactor);
    this.mirrorUniforms.uSunAlign.value = smootherstep(0, 1, sunAlignFactor);

    this.groundMat.uniforms.uTime.value = t;
    this.groundMat.uniforms.uSunAlign.value = sunAlignFactor;
    if (this.sunFlareMat) {
      this.sunFlareMat.uniforms.uSunAlign.value = smootherstep(0, 1, sunAlignFactor);
    }

    // Cinematic Camera Choreography
    // Gliding between glass monoliths, dramatic low parallax, framing horizon sun
    let camPos = new THREE.Vector3();
    let target = new THREE.Vector3(0, 10, -220);

    if (t < 16) {
      // Low glide skimming shallow water
      const p = t / 16;
      camPos.set(Math.sin(p * 2.0) * 20, 2.0 + p * 3.0, -10 - p * 60);
      target.set(0, 6, -200);
    } else if (t < 30) {
      // Weaving between immense reflective glass walls
      const p = (t - 16) / 14;
      camPos.set(Math.cos(p * 2.5) * 35, 7.0 + Math.sin(p * Math.PI) * 12.0, -70 - p * 80);
      target.set(Math.sin(p * 2.0) * 15, 12, -260);
    } else if (t < 40) {
      // Climax: Elevating to frame the thousand aligned mirrors forming the horizon sun
      const p = (t - 30) / 10;
      camPos.set(0, 18.0 + p * 6.0, -150 - p * 30);
      target.set(0, 9.0, -320);
    } else {
      // Descending back to reflective salt water
      const p = (t - 40) / 10;
      camPos.set(Math.sin(p * 1.5) * 15, 24.0 - p * 21.0, -180 + p * 80);
      target.set(0, 4.0, -200);
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
