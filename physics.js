'use strict';
// Verlet ragdoll physics. World units are roughly pixels at default zoom; y is up, the ground is y = 0.

const DT = 1 / 60;
let GRAV = 900;               // set per map by setEnv()
// Ground behaviour for the current map; maps.js swaps these in before each battle.
const ENV_DEFAULT = { grav: 900, friction: 0.7, bounce: 0.15, traction: 1, lava: false, pools: null };
const ENV = Object.assign({}, ENV_DEFAULT);
const ITER = 4;
const FIELD_X = 720;   // half-width of the battlefield
const FIELD_Z = 560;   // depth of the battlefield along z
const ZONE_GAP = 70;   // no-man's-land either side of the centre line

const J = { HEAD: 0, CHEST: 1, PELVIS: 2, LELB: 3, LHAND: 4, RELB: 5, RHAND: 6, LKNEE: 7, LFOOT: 8, RKNEE: 9, RFOOT: 10 };

// Bone lengths for a scale-1 body.
const BONES = { neck: 10, torso: 22, upper: 12, fore: 12, thigh: 15, shin: 15 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
// Visual-only randomness (particles, sound). Never use it for anything that changes the battle.
const rand = (a, b) => a + Math.random() * (b - a);

// The battle itself must replay identically on every player's machine, so simulation code
// uses a seeded generator and trig built from + - * / and sqrt, which IEEE 754 pins down exactly.
let rngState = 1;
function seedRng(s) { rngState = (s >>> 0) || 1; }
function R() {
  rngState = (rngState + 0x6D2B79F5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const RR = (a, b) => a + R() * (b - a);

const PI = 3.141592653589793, TAU = PI * 2, HALF_PI = PI / 2;
function dsin(x) {
  x -= Math.floor((x + PI) / TAU) * TAU;
  if (x > HALF_PI) x = PI - x; else if (x < -HALF_PI) x = -PI - x;
  const x2 = x * x;
  return x * (1 - x2 / 6 * (1 - x2 / 20 * (1 - x2 / 42 * (1 - x2 / 72 * (1 - x2 / 110)))));
}
const dcos = x => dsin(x + HALF_PI);

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makePt(x, y, z) {
  return { x, y, z, px: x, py: y, pz: z };
}

// Builds a standing body with its pelvis above (x, z), facing fx (+1 or -1 along x).
function buildBody(x, z, S, fx) {
  const B = BONES;
  const hip = (B.thigh + B.shin) * S * 0.92;
  const pts = [];
  const set = (i, f, y, side) => { pts[i] = makePt(x + f * S * fx, y, z + side * S * fx); };
  set(J.PELVIS, 0, hip, 0);
  set(J.CHEST, 1, hip + B.torso * S, 0);
  set(J.HEAD, 1.5, hip + (B.torso + B.neck) * S, 0);
  set(J.LELB, 2, hip + (B.torso - 11) * S, -5);
  set(J.LHAND, 4, hip + (B.torso - 22) * S, -6);
  set(J.RELB, 2, hip + (B.torso - 11) * S, 5);
  set(J.RHAND, 4, hip + (B.torso - 22) * S, 6);
  set(J.LKNEE, 2, hip * 0.5, -4);
  set(J.LFOOT, 0, 0, -4);
  set(J.RKNEE, 2, hip * 0.5, 4);
  set(J.RFOOT, 0, 0, 4);
  const sticks = [
    [J.HEAD, J.CHEST, B.neck * S, 1],
    [J.CHEST, J.PELVIS, B.torso * S, 1],
    [J.CHEST, J.LELB, B.upper * S, 1], [J.LELB, J.LHAND, B.fore * S, 1],
    [J.CHEST, J.RELB, B.upper * S, 1], [J.RELB, J.RHAND, B.fore * S, 1],
    [J.PELVIS, J.LKNEE, B.thigh * S, 1], [J.LKNEE, J.LFOOT, B.shin * S, 1],
    [J.PELVIS, J.RKNEE, B.thigh * S, 1], [J.RKNEE, J.RFOOT, B.shin * S, 1],
    [J.HEAD, J.PELVIS, (B.neck + B.torso) * S, 0.25],
  ];
  return { pts, sticks };
}

function stepBody(b) {
  const pts = b.pts;
  const g = GRAV * DT * DT;
  for (const p of pts) {
    const vx = (p.x - p.px) * 0.996, vy = (p.y - p.py) * 0.996, vz = (p.z - p.pz) * 0.996;
    p.px = p.x; p.py = p.y; p.pz = p.z;
    p.x += vx; p.y += vy - g; p.z += vz;
    if (p.y < 0) {
      // Ground contact: a small bounce and a lot of scrubbing friction (less on ice, more bounce on jelly).
      p.y = 0;
      p.py = vy < 0 ? vy * ENV.bounce : 0;
      p.px = p.x - vx * ENV.friction;
      p.pz = p.z - vz * ENV.friction;
    }
  }
  const sticks = b.sticks;
  for (let it = 0; it < ITER; it++) {
    for (let i = 0; i < sticks.length; i++) {
      const s = sticks[i], a = pts[s[0]], c = pts[s[1]];
      const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      const k = (d - s[2]) / d * 0.5 * s[3];
      a.x += dx * k; a.y += dy * k; a.z += dz * k;
      c.x -= dx * k; c.y -= dy * k; c.z -= dz * k;
    }
    for (const p of pts) if (p.y < 0) p.y = 0;
  }
}

// Adds a velocity in world units per second.
function addVel(p, vx, vy, vz) {
  p.px -= vx * DT; p.py -= vy * DT; p.pz -= vz * DT;
}

// Muscle: steers a point toward a target. k pulls position, c damps velocity relative to rv (per-step velocity).
// Pass an anchor point to make it a muscle pair: the anchor takes the opposite push, so poses
// that can't be reached never shove the whole body across the field.
function drive(p, tx, ty, tz, k, c, rv, a) {
  const ox = p.x - p.px, oy = p.y - p.py, oz = p.z - p.pz;
  const vx = ox + (rv.x - ox) * c + (tx - p.x) * k;
  const vy = oy + (rv.y - oy) * c + (ty - p.y) * k;
  const vz = oz + (rv.z - oz) * c + (tz - p.z) * k;
  p.px = p.x - vx; p.py = p.y - vy; p.pz = p.z - vz;
  if (a) { a.px += vx - ox; a.py += vy - oy; a.pz += vz - oz; }
}

// Distance from point p to segment a-b, all as {x,y,z}.
function segDist(ax, ay, az, bx, by, bz, px, py, pz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const L = dx * dx + dy * dy + dz * dz;
  let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / L : 0;
  t = clamp(t, 0, 1);
  const qx = ax + dx * t - px, qy = ay + dy * t - py, qz = az + dz * t - pz;
  return Math.sqrt(qx * qx + qy * qy + qz * qz);
}
