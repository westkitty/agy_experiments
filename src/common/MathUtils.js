/**
 * Mathematical utilities for deterministic procedural animations
 */

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function smootherstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function pulse(t, start, peak, end) {
  if (t < start || t > end) return 0;
  if (t < peak) return smoothstep(start, peak, t);
  return 1 - smoothstep(peak, end, t);
}

export function hash(n) {
  return (Math.sin(n) * 43758.5453123) % 1;
}

export function hash2(x, y) {
  return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123) % 1;
}

// Ease in-out cubic
export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
