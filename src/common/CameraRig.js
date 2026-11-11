import * as THREE from 'three';

/**
 * CameraRig provides smooth cinematic trajectories and camera choreography
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.currentPos = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();
    this.targetPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  setImmediate(pos, target) {
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
    this.currentPos.copy(pos);
    this.currentTarget.copy(target);
    this.targetPos.copy(pos);
    this.targetLookAt.copy(target);
  }

  interpolate(targetPos, targetLookAt, smoothFactor = 0.05) {
    this.currentPos.lerp(targetPos, smoothFactor);
    this.currentTarget.lerp(targetLookAt, smoothFactor);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);
  }

  /**
   * Frame-rate independent exponential critically-damped spring smoothing
   */
  dampedUpdate(targetPos, targetLookAt, deltaTime, damping = 4.0) {
    const factor = 1.0 - Math.exp(-damping * Math.min(deltaTime, 0.1));
    this.currentPos.lerp(targetPos, factor);
    this.currentTarget.lerp(targetLookAt, factor);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);
  }

  /**
   * Cinematic focal breathing: expands / contracts FOV dynamically during dramatic climaxes
   */
  applyFocalBreathing(baseFov, breathAmount, targetFov = null) {
    const fov = targetFov !== null ? THREE.MathUtils.lerp(baseFov, targetFov, breathAmount) : baseFov + breathAmount;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  updateDirect(pos, target, roll = 0) {
    this.camera.position.copy(pos);
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.camera.lookAt(target);
    this.currentPos.copy(pos);
    this.currentTarget.copy(target);
  }
}
