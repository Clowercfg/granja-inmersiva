import * as THREE from "three";

export const atmosphere = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.55, 0.85, 0.35).normalize() },
  uSunColor: { value: new THREE.Color("#fff2d3") },
  uSkyColor: { value: new THREE.Color("#9fc4e4") },
  uAmbient: { value: new THREE.Color("#e3eaec") },
  uFogColor: { value: new THREE.Color("#cfdfd1") },
  uFogDensity: { value: 0.00055 },
};

export function tickAtmosphere(dt: number): void {
  atmosphere.uTime.value += dt;
}

export function setFog(color: THREE.Color, density: number): void {
  atmosphere.uFogColor.value.copy(color);
  atmosphere.uFogDensity.value = density;
}

export function setSun(dir: THREE.Vector3, color: THREE.Color, intensity: number): void {
  atmosphere.uSunDir.value.copy(dir);
  atmosphere.uSunColor.value.copy(color);
  atmosphere.uSunColor.value.multiplyScalar(intensity);
}

export function setAmbient(color: THREE.Color): void {
  atmosphere.uAmbient.value.copy(color);
}
