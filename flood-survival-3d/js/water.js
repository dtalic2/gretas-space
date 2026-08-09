// ---------- The flood ----------
//
// The rising water is the clock of the whole game, so its level is a pure
// function of elapsed days. Nothing accumulates, nothing drifts: save the day
// counter and the water comes back exactly where it was.
//
// It renders as a single huge plane. Rather than rebuilding geometry to fit the
// shoreline, the fragment shader samples the terrain height texture and discards
// anything still above water. The waterline is therefore pixel-exact and always
// agrees with the ground the player walks on.
import * as THREE from 'three';
import { WORLD, buildHeightTexture } from './terrain.js';

export const DAYS = 10;                // survive to the end of day 10
export const START_LEVEL = -1.4;       // river sitting inside its banks
const RISE = 10.6;                     // total rise before the surge
const SURGE = 1.25;                    // the wall of water on the last night

const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (v, a, b) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/**
 * Water level after `d` days. Slightly super-linear: the first days are gentle
 * enough to learn in, the last ones are not.
 */
export function floodAt(d){
  const base = START_LEVEL + RISE * Math.pow(clamp01(d / DAYS), 1.3);
  return base + SURGE * smooth(d, DAYS - 0.4, DAYS);
}

/** Peak of the flood, plus a little for chop. Beat this and you live. */
export const SAFE_LINE = floodAt(DAYS) + 0.5;

/** Day (possibly fractional) at which a given altitude goes under. */
export function floodsOnDay(y){
  let lo = 0, hi = DAYS;
  if (floodAt(hi) < y) return Infinity;
  for (let i = 0; i < 40; i++){
    const mid = (lo + hi) / 2;
    if (floodAt(mid) < y) lo = mid; else hi = mid;
  }
  return hi;
}

const VERT = `
  uniform sampler2D hmap;
  uniform float time;
  uniform float level;
  uniform float worldSize;
  uniform float chop;
  varying vec3 vWorld;
  varying float vDepth;
  varying float vWave;

  // Four crossing swells. Enough to never read as a repeating pattern, cheap
  // enough to run per vertex on a phone.
  float swell(vec2 p, float t){
    float w  = sin(p.x * 0.21 + t * 1.05) * 0.42;
          w += sin(p.y * 0.17 - t * 0.85) * 0.36;
          w += sin((p.x + p.y) * 0.33 + t * 1.7) * 0.17;
          w += sin((p.x - p.y * 1.4) * 0.55 - t * 2.3) * 0.09;
    return w;
  }

  void main(){
    vec3 p = position;
    vec4 wp = modelMatrix * vec4(p, 1.0);

    float ground = texture2D(hmap, wp.xz / worldSize + 0.5).r;
    vDepth = level - ground;

    // Calm at the shoreline, open chop out in the deep. Without this the waves
    // saw through the bank and the edge shimmers.
    float amp = chop * smoothstep(0.0, 3.2, vDepth);
    vWave = swell(wp.xz, time) * amp;
    p.y += vWave;

    vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`;

const FRAG = `
  uniform float time;
  uniform float rain;
  uniform vec3  deepColor;
  uniform vec3  shallowColor;
  uniform vec3  foamColor;
  uniform vec3  skyTint;
  uniform vec3  sunDir;
  uniform vec3  sunColor;
  uniform vec3  fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform float chop;
  varying vec3 vWorld;
  varying float vDepth;
  varying float vWave;

  void main(){
    if (vDepth <= 0.02) discard;               // still dry land here

    vec3 view = normalize(cameraPosition - vWorld);

    // Surface normal from the analytic gradient of the same swells, plus a
    // fine ripple layer that rain drives.
    vec2 p = vWorld.xz;
    float t = time;
    float dx = cos(p.x * 0.21 + t * 1.05) * 0.42 * 0.21
             + cos((p.x + p.y) * 0.33 + t * 1.7) * 0.17 * 0.33
             + cos((p.x - p.y * 1.4) * 0.55 - t * 2.3) * 0.09 * 0.55;
    float dz = cos(p.y * 0.17 - t * 0.85) * 0.36 * 0.17
             + cos((p.x + p.y) * 0.33 + t * 1.7) * 0.17 * 0.33
             - cos((p.x - p.y * 1.4) * 0.55 - t * 2.3) * 0.09 * 0.55 * 1.4;
    float ripple = rain * 0.5;
    dx += sin(p.x * 3.1 + p.y * 2.3 + t * 9.0) * 0.06 * ripple;
    dz += sin(p.y * 3.4 - p.x * 2.1 + t * 8.2) * 0.06 * ripple;
    float k = chop * smoothstep(0.0, 3.2, vDepth) + ripple;
    vec3 n = normalize(vec3(-dx * k, 1.0, -dz * k));

    // Body colour: shallow water shows the mud under it, deep water doesn't.
    vec3 body = mix(shallowColor, deepColor, smoothstep(0.15, 5.5, vDepth));

    // Reflection. A fresnel term against a flat sky tint reads convincingly and
    // costs nothing next to a real reflection pass.
    float fres = pow(1.0 - max(dot(n, view), 0.0), 3.0);
    vec3 col = mix(body, skyTint, clamp(fres * 0.85, 0.0, 0.75));

    // Sun glitter, killed off by rain roughening the surface.
    vec3 h = normalize(sunDir + view);
    float spec = pow(max(dot(n, h), 0.0), 90.0) * (1.0 - rain * 0.8);
    col += sunColor * spec * 1.5;

    // Foam: a band along the shore that breathes with the swell, plus caps on
    // the crests further out.
    float edge = 0.55 + sin(p.x * 0.7 + p.y * 0.6 + time * 1.6) * 0.14;
    float shore = 1.0 - smoothstep(0.0, edge, vDepth);
    float caps = smoothstep(0.30, 0.52, vWave) * smoothstep(1.0, 3.0, vDepth) * 0.55;
    float foam = clamp(shore * 0.9 + caps, 0.0, 1.0);
    col = mix(col, foamColor, foam);

    float alpha = mix(0.62, 0.95, smoothstep(0.0, 2.2, vDepth));
    alpha = max(alpha, foam);

    // Manual fog: this material doesn't go through three's fog chunks.
    float f = smoothstep(fogNear, fogFar, length(cameraPosition - vWorld));
    col = mix(col, fogColor, f);

    gl_FragColor = vec4(col, alpha);
  }
`;

export class Flood {
  constructor(scene){
    this.level = floodAt(0);

    const geo = new THREE.PlaneGeometry(320, 320, 200, 200);
    geo.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,          // so it still reads when the camera dips under
      uniforms: {
        hmap:         { value: buildHeightTexture() },
        worldSize:    { value: WORLD },
        time:         { value: 0 },
        level:        { value: this.level },
        chop:         { value: 0.5 },
        rain:         { value: 0 },
        deepColor:    { value: new THREE.Color(0x143a4e) },
        shallowColor: { value: new THREE.Color(0x4a6b52) },
        foamColor:    { value: new THREE.Color(0xdfeef2) },
        skyTint:      { value: new THREE.Color(0x9fc7de) },
        sunDir:       { value: new THREE.Vector3(0.4, 0.7, 0.3) },
        sunColor:     { value: new THREE.Color(0xfff0cf) },
        fogColor:     { value: new THREE.Color(0x9fb4bd) },
        fogNear:      { value: 40 },
        fogFar:       { value: 150 },
      },
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.y = this.level;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  /** Follow the camera so the fine tessellation is always where it's seen. */
  update(dt, day, camera, weather){
    this.level = floodAt(day);
    const u = this.material.uniforms;
    u.time.value += dt;
    u.level.value = this.level;

    this.mesh.position.set(
      Math.round(camera.position.x / 1.6) * 1.6,
      this.level,
      Math.round(camera.position.z / 1.6) * 1.6,
    );

    if (weather){
      u.rain.value = weather.rain;
      u.chop.value = 0.34 + weather.rain * 0.55 + (day / DAYS) * 0.4;
      u.skyTint.value.copy(weather.skyTint);
      u.sunDir.value.copy(weather.sunDir);
      u.sunColor.value.copy(weather.sunColor);
      u.fogColor.value.copy(weather.fogColor);
      u.fogNear.value = weather.fogNear;
      u.fogFar.value = weather.fogFar;
      u.deepColor.value.copy(weather.waterDeep);
      u.shallowColor.value.copy(weather.waterShallow);
    }
  }
}
