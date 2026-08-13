import * as THREE from "three";

export const waterVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    float wave =
      sin(w.x * 0.65 + uTime * 1.15) * 0.05 +
      sin(w.z * 0.5 + uTime * 0.9) * 0.05 +
      sin((w.x + w.z) * 0.85 + uTime * 1.5) * 0.035 +
      sin((w.x - w.z) * 1.3 + uTime * 2.0) * 0.02;
    w.y += wave;
    vWorld = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - w.xyz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const waterFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform vec2 uCenter;
  uniform float uRadius;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec3 N = normalize(vNormalW);
    float nx = sin(vWorld.x * 3.2 + uTime * 1.5) + sin(vWorld.z * 4.4 + uTime * 1.1);
    float nz = cos(vWorld.z * 3.6 + uTime * 1.3) + sin(vWorld.x * 5.2 + uTime * 0.8);
    N = normalize(vec3(N.x + nx * 0.055, N.y, N.z + nz * 0.055));

    float dist = length(vWorld.xz - uCenter);
    float shore = smoothstep(uRadius * 0.55, uRadius, dist);

    vec3 col = mix(uDeep, uShallow, shore);

    float fres = pow(1.0 - max(dot(vViewDir, N), 0.0), 3.0);
    col = mix(col, uSkyColor, fres * 0.55);

    vec3 refl = reflect(-uSunDir, N);
    float glint = pow(max(dot(refl, vViewDir), 0.0), 160.0) * 1.6;
    float sparkle = pow(max(dot(refl, vViewDir), 0.0), 24.0) * 0.25;
    col += uSunColor * (glint + sparkle);

    float edgeFade = smoothstep(uRadius + 1.5, uRadius - 1.0, dist);
    float alpha = (0.82 * edgeFade);

    float fogDepth = length(cameraPosition - vWorld);
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * fogDepth * fogDepth);
    col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export interface WaterUniforms {
  uTime: { value: number };
  uDeep: { value: THREE.Color };
  uShallow: { value: THREE.Color };
  uSkyColor: { value: THREE.Color };
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uFogColor: { value: THREE.Color };
  uFogDensity: { value: number };
  uCenter: { value: THREE.Vector2 };
  uRadius: { value: number };
}

export function createWaterMaterial(center: THREE.Vector2, radius: number): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#1c4a3a") },
      uShallow: { value: new THREE.Color("#4f8f86") },
      uSkyColor: { value: new THREE.Color("#aacbe8") },
      uSunDir: { value: new THREE.Vector3(0.55, 0.85, 0.35).normalize() },
      uSunColor: { value: new THREE.Color("#fff2d3") },
      uFogColor: { value: new THREE.Color("#cfdfd1") },
      uFogDensity: { value: 0.00055 },
      uCenter: { value: center },
      uRadius: { value: radius },
    },
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true,
    depthWrite: false,
  });
  return mat;
}
