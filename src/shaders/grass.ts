import * as THREE from "three";

export const grassVertex = /* glsl */ `
  uniform float uTime;
  uniform float uWind;
  varying vec3 vColor;
  varying float vFogDepth;
  varying float vH;

  void main() {
    vec3 p = position;
    float h = p.y;
    vec4 wp = instanceMatrix * vec4(p, 1.0);
    vec3 world = wp.xyz;

    float swayA = sin(uTime * 1.35 + world.x * 0.85 + world.z * 0.6);
    float swayB = sin(uTime * 1.05 - world.z * 0.7 + world.x * 0.55);
    float gust = sin(uTime * 0.55 + world.x * 0.35 + world.z * 0.3) * 0.5 + 0.5;

    float bend = (swayA * 0.55 + swayB * 0.4) * h * h * 0.42 * uWind;
    float lean = gust * h * 0.4 * uWind;

    wp.x += bend * 0.85 + lean * 0.4;
    wp.z += (swayB * 0.5 - swayA * 0.3) * h * h * 0.32 * uWind;

    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    vFogDepth = -mv.z;
    vH = h;
    vColor = color * instanceColor;
  }
`;

export const grassFragment = /* glsl */ `
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  varying vec3 vColor;
  varying float vFogDepth;
  varying float vH;

  void main() {
    float a = 1.0 - smoothstep(0.5, 1.0, vH);
    if (a < 0.03) discard;
    vec3 col = vColor;
    col *= mix(0.72, 1.0, smoothstep(0.0, 0.35, vH));
    float fog = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
    col = mix(col, uFogColor, clamp(fog, 0.0, 1.0));
    gl_FragColor = vec4(col, a);
  }
`;

export function createGrassMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: 0.9 },
      uFogColor: { value: new THREE.Color("#cfdfd1") },
      uFogDensity: { value: 0.00055 },
    },
    vertexShader: grassVertex,
    fragmentShader: grassFragment,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    vertexColors: true,
  });
  return mat;
}
