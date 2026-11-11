import * as THREE from 'three';

import { Scene01GravityLoom } from './scenes/Scene01GravityLoom.js';
import { Scene02MirrorMigration } from './scenes/Scene02MirrorMigration.js';
import { Scene03CanyonFloatingRings } from './scenes/Scene03CanyonFloatingRings.js';
import { Scene04OrchardOfMoons } from './scenes/Scene04OrchardOfMoons.js';
import { Scene05HourglassKingdoms } from './scenes/Scene05HourglassKingdoms.js';
import { Scene06WalkingShadow } from './scenes/Scene06WalkingShadow.js';
import { Scene07AuroraForge } from './scenes/Scene07AuroraForge.js';
import { Scene08CathedralThousandDoors } from './scenes/Scene08CathedralThousandDoors.js';
import { Scene09EmberRailway } from './scenes/Scene09EmberRailway.js';
import { Scene10ChromaticTide } from './scenes/Scene10ChromaticTide.js';

/**
 * THE IMPOSSIBLE CINEMA — Application Orchestrator & Astonishment Engine
 * Unified procedural 3D browser runtime managing the 10 experiments.
 * Features the "Impossible Causal Transition" thread uniting all 10 worlds.
 */
class ImpossibleCinemaApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.veil = document.getElementById('transition-veil');
    this.fallbackLayer = document.getElementById('fallback-layer');
    this.selector = document.getElementById('scene-selector');

    this.scenes = [
      Scene01GravityLoom,
      Scene02MirrorMigration,
      Scene03CanyonFloatingRings,
      Scene04OrchardOfMoons,
      Scene05HourglassKingdoms,
      Scene06WalkingShadow,
      Scene07AuroraForge,
      Scene08CathedralThousandDoors,
      Scene09EmberRailway,
      Scene10ChromaticTide
    ];

    // Causal transition palettes for seamless anthology continuity (AWE Engine)
    this.transitionThemes = [
      { color: '#161208', glow: 'rgba(230, 180, 80, 0.4)' }, // 01 -> 02: Golden cosmic filament to salt horizon
      { color: '#2a1a0c', glow: 'rgba(255, 170, 70, 0.4)' }, // 02 -> 03: Horizon sun to canyon strata
      { color: '#18120e', glow: 'rgba(160, 110, 60, 0.3)' }, // 03 -> 04: Canyon rock to space asteroid
      { color: '#100c14', glow: 'rgba(255, 220, 120, 0.35)'},// 04 -> 05: Tree sap drop to hourglass sands
      { color: '#140c06', glow: 'rgba(220, 140, 50, 0.35)' },// 05 -> 06: Hourglass plinth to colossus pedestal
      { color: '#06060c', glow: 'rgba(80, 140, 240, 0.3)' }, // 06 -> 07: Total eclipse to polar auroral sky
      { color: '#040810', glow: 'rgba(100, 240, 200, 0.4)' },// 07 -> 08: Dissolving crystal to cathedral doorframes
      { color: '#120806', glow: 'rgba(255, 100, 30, 0.45)' },// 08 -> 09: Extraterrestrial sea to railway furnace
      { color: '#160814', glow: 'rgba(255, 160, 40, 0.4)' }, // 09 -> 10: Railway loop embers to chromatic tide
      { color: '#080a12', glow: 'rgba(200, 180, 100, 0.35)'} // 10 -> 01: Receding tide to gravity loom membrane
    ];

    this.activeSceneIndex = 0;
    this.activeSceneInstance = null;
    this.isAutoplay = true;
    this.isTransitioning = false;

    this.sceneElapsedTime = 0;
    this.lastTimestamp = performance.now();
    this.sceneDuration = 50.0; // Deterministic 50-second loop per experiment

    // WCAG Accessibility: Dynamic reduced motion listener
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
    });

    this.checkReducedMotion();
    this.initWebGL();
    this.initEvents();

    // Start with Scene 01 immediately
    this.loadScene(0);
    window.__CINEMA_APP__ = this;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  checkReducedMotion() {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
    });
  }

  initWebGL() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.5, 2000);
    } catch (err) {
      console.warn('WebGL initialization failed, activating graceful visual fallback.', err);
      if (this.fallbackLayer) {
        this.fallbackLayer.classList.add('visible');
      }
    }
  }

  initEvents() {
    window.addEventListener('resize', () => this.onResize(), { passive: true });

    // Keyboard navigation (Left / Right arrows for accessible keyboard stepping)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        const nextIdx = (this.activeSceneIndex + 1) % this.scenes.length;
        this.selectSceneByIndex(nextIdx);
      } else if (e.key === 'ArrowLeft') {
        const prevIdx = (this.activeSceneIndex - 1 + this.scenes.length) % this.scenes.length;
        this.selectSceneByIndex(prevIdx);
      }
    });

    if (this.selector) {
      this.selector.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'autoplay') {
          this.isAutoplay = true;
        } else {
          this.isAutoplay = false;
          const idx = parseInt(val, 10) - 1;
          if (idx >= 0 && idx < this.scenes.length && idx !== this.activeSceneIndex) {
            this.transitionToScene(idx);
          }
        }
      });
    }
  }

  selectSceneByIndex(idx) {
    if (this.selector) {
      this.selector.value = String(idx + 1).padStart(2, '0');
    }
    this.isAutoplay = false;
    this.transitionToScene(idx);
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.activeSceneInstance && typeof this.activeSceneInstance.resize === 'function') {
      this.activeSceneInstance.resize(w, h);
    }
  }

  loadScene(index) {
    // Clean up previous active scene GPU resources
    if (this.activeSceneInstance) {
      try {
        this.activeSceneInstance.dispose();
      } catch (err) {
        console.warn('Scene disposal warning:', err);
      }
      this.activeSceneInstance = null;
    }

    // Clear three.js scene graph
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    this.activeSceneIndex = index;
    this.sceneElapsedTime = 0;

    // Instantiate and initialize selected scene
    const SceneClass = this.scenes[index];
    this.activeSceneInstance = new SceneClass();
    this.activeSceneInstance.init(this.renderer, this.camera, this.scene);
    this.onResize();
  }

  transitionToScene(targetIndex) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Apply thematic causal bridge styling to veil
    const theme = this.transitionThemes[this.activeSceneIndex] || { color: '#000000', glow: 'transparent' };
    if (this.veil) {
      this.veil.style.backgroundColor = theme.color;
      this.veil.style.boxShadow = `inset 0 0 120px ${theme.glow}`;
      this.veil.classList.add('active');
    }

    setTimeout(() => {
      // Load new scene at midpoint of cinematic fade
      this.loadScene(targetIndex);

      setTimeout(() => {
        if (this.veil) {
          this.veil.classList.remove('active');
        }
        this.isTransitioning = false;
      }, 100);
    }, 750);
  }

  animate(now) {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min((now - this.lastTimestamp) * 0.001, 0.1);
    this.lastTimestamp = now;

    if (!this.renderer || !this.activeSceneInstance) return;

    const dt = this.reducedMotion ? deltaTime * 0.35 : deltaTime;
    this.sceneElapsedTime += dt;

    // Check for Autoplay progression or looping
    if (this.sceneElapsedTime >= this.sceneDuration) {
      if (this.isAutoplay) {
        const nextIdx = (this.activeSceneIndex + 1) % this.scenes.length;
        // Keep selector updated during Autoplay
        if (this.selector) {
          this.selector.value = 'autoplay';
        }
        this.transitionToScene(nextIdx);
      } else {
        // Continuous loop for individually selected experiment
        this.sceneElapsedTime = this.sceneElapsedTime % this.sceneDuration;
      }
    }

    const progress = (this.sceneElapsedTime % this.sceneDuration) / this.sceneDuration;

    // Update and render active experiment
    try {
      this.activeSceneInstance.update(this.sceneElapsedTime, dt, progress, this.reducedMotion);
      this.activeSceneInstance.render(this.renderer);
    } catch (err) {
      console.error('Error during scene update/render:', err);
    }
  }
}

// Launch the application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new ImpossibleCinemaApp();
});
