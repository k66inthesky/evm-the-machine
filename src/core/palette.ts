// Palette — shared color constants. Locked by the game design doc; don't
// introduce new colors without a reason. Most materials get their color from
// here so a tweak propagates automatically.
import * as THREE from 'three';

export const COLOR = {
  bg:       0x0a0e1a,
  cyan:     0x00f0ff,
  purple:   0x8a00f0,
  red:      0xff0055,
  orange:   0xffa500,
  gold:     0xffd700,
  dim:      0x1a2238,
  white:    0xffffff,
} as const;

// Pre-built materials we reuse so every chamber shares the same look and
// THREE has fewer unique programs to compile.
export function neonLine(color: number, opacity = 1): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
}

export function neonMesh(color: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, wireframe: false });
}

export function wireframeMesh(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, wireframe: true });
}
