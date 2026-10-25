'use strict';
// Unit roster, AI, poses and combat. Everything here runs inside the deterministic simulation:
// use R()/RR() and dsin/dcos, never Math.random, Math.sin or Math.hypot.

const TYPES = {
  peasant:   { name: 'Peasant', cost: 50, hp: 60, S: 1, speed: 60, reach: 34, dmg: 14, cd: 1.1, knock: 240, style: 'thrust', anim: 0.6, weapon: 'fork', hat: 'straw', block: 0,
               blurb: 'Brought a pitchfork. Brought nothing else.' },
  squire:    { name: 'Squire', cost: 100, hp: 120, S: 1, speed: 52, reach: 32, dmg: 22, cd: 1.0, knock: 260, style: 'chop', anim: 0.55, weapon: 'sword', hat: 'helm', block: 0.35, shield: 'kite',
               blurb: 'Sword, shield and a strong sense of duty.' },
  hoplite:   { name: 'Hoplite', cost: 180, hp: 150, S: 1.05, speed: 46, reach: 56, dmg: 26, cd: 1.3, knock: 300, style: 'thrust', anim: 0.65, weapon: 'spear', hat: 'crest', block: 0.45, shield: 'round',
               blurb: 'Long spear, big shield. Blocks most blows from the front.' },
  berserker: { name: 'Berserker', cost: 260, hp: 230, S: 1.1, speed: 95, reach: 32, dmg: 21, cd: 0.42, knock: 260, style: 'dual', anim: 0.38, weapon: 'axe', hat: 'horns', block: 0,
               blurb: 'Two axes, no plan, very fast.' },
  archer:    { name: 'Archer', cost: 140, hp: 50, S: 0.95, speed: 52, range: 430, dmg: 26, cd: 2.2, knock: 160, style: 'bow', anim: 1.1, weapon: 'bow', hat: 'hood', block: 0,
               blurb: 'Lobs arrows at whoever is nearest.' },
  thrower:   { name: 'Stone Thrower', cost: 300, hp: 90, S: 1.05, speed: 46, range: 380, dmg: 55, cd: 3.8, knock: 900, style: 'throw', anim: 1.3, weapon: 'none', hat: 'band', block: 0,
               blurb: 'Throws boulders. The boulders keep rolling.' },
  wizard:    { name: 'Wizard', cost: 450, hp: 70, S: 1, speed: 44, range: 330, dmg: 60, cd: 3.4, knock: 1000, style: 'cast', anim: 1.2, weapon: 'staff', hat: 'wizard', block: 0,
               blurb: 'Fireballs knock everyone flat, friends included.' },
  giant:     { name: 'Giant', cost: 1200, hp: 1600, S: 2.3, speed: 34, reach: 62, dmg: 110, cd: 1.9, knock: 1100, style: 'punch', anim: 0.9, weapon: 'none', hat: 'giant', block: 0, aoe: true,
               blurb: 'Punches whole squads into the sky.' },
};
Object.assign(TYPES, {
  knight:    { name: 'Knight', cost: 400, hp: 420, S: 1.1, speed: 40, reach: 38, dmg: 40, cd: 1.4, knock: 420, style: 'chop', anim: 0.6, weapon: 'greatsword', hat: 'knight', block: 0.4, shield: 'kite', heavy: 1.6,
               blurb: 'Plate armour head to toe. Slow, stubborn and hard to topple.' },
  ninja:     { name: 'Ninja', cost: 350, hp: 170, S: 0.95, speed: 130, reach: 30, dmg: 42, cd: 0.5, knock: 200, style: 'dual', anim: 0.32, weapon: 'katana', hat: 'ninja', block: 0, dodge: 0.5,
               blurb: 'Dodges half of all blows and cuts very fast.' },
  musketeer: { name: 'Musketeer', cost: 220, hp: 60, S: 1, speed: 48, range: 440, dmg: 60, cd: 5, knock: 520, style: 'gun', anim: 1.0, weapon: 'musket', hat: 'tricorn', block: 0,
               blurb: 'One loud, accurate shot, then a long reload.' },
  bomber:    { name: 'Bomber', cost: 160, hp: 70, S: 0.95, speed: 105, reach: 24, dmg: 160, cd: 1, knock: 1300, style: 'bomb', anim: 0.45, weapon: 'bomb', hat: 'aviator', block: 0,
               blurb: 'Runs at the enemy and explodes, or explodes when killed. Friends included.' },
  healer:    { name: 'Healer', cost: 200, hp: 80, S: 0.95, speed: 50, range: 240, heal: 30, dmg: 0, cd: 1.6, knock: 0, style: 'heal', anim: 0.7, weapon: 'staff', hat: 'halo', block: 0,
               blurb: 'Patches up hurt allies. Cannot fight back.' },
  storm:     { name: 'Storm Caller', cost: 500, hp: 75, S: 1, speed: 44, range: 360, dmg: 45, cd: 3.0, knock: 380, style: 'cast', anim: 1.0, weapon: 'staff', hat: 'storm', block: 0, chain: 4,
               blurb: 'Lightning that jumps between up to four enemies.' },
  sumo:      { name: 'Sumo', cost: 600, hp: 700, S: 1.5, speed: 40, reach: 40, dmg: 35, cd: 1.5, knock: 950, style: 'shove', anim: 0.7, weapon: 'none', hat: 'sumo', block: 0, aoe: true, fat: 1.6, heavy: 2,
               blurb: 'Belly-shoves everything in front of it.' },
});
Object.assign(TYPES, {
  squirrel:  { name: 'Squirrel', cost: 25, hp: 28, S: 0.6, speed: 120, reach: 18, dmg: 8, cd: 0.7, knock: 160, style: 'pounce', anim: 0.5, weapon: 'none', hat: 'squirrel', block: 0, dodge: 0.25,
               blurb: 'Tiny, fast and furious. Pounces in swarms.' },
  lebron:    { name: 'LeBron James', cost: 1000, hp: 850, S: 1.35, speed: 70, range: 380, dmg: 55, cd: 1.3, knock: 750, style: 'hoops', anim: 0.8, weapon: 'none', hat: 'lebron', block: 0, heavy: 1.3,
               blurb: 'The King. Bouncing basketballs from range, slam dunks up close.' },
  // Stand-in shown for an online opponent's units until the battle starts. Never placed or fought with.
  mystery:   { name: 'Hidden unit', cost: 0, hp: 1, S: 1, speed: 0, reach: 1, dmg: 0, cd: 99, knock: 0, style: 'none', anim: 1, weapon: 'none', hat: 'mystery', block: 0, blurb: '' },
});
Object.assign(TYPES, {
  chicken:    { name: 'Chicken', cost: 10, hp: 14, S: 0.45, speed: 110, reach: 12, dmg: 4, cd: 0.6, knock: 80, style: 'pounce', anim: 0.45, weapon: 'none', hat: 'chicken', block: 0, dodge: 0.2,
                blurb: 'Pecks ankles. Witches turn people into these.' },
  grandma:    { name: 'Grandma', cost: 120, hp: 160, S: 0.85, speed: 45, reach: 28, dmg: 20, cd: 0.9, knock: 380, style: 'chop', anim: 0.5, weapon: 'pin', hat: 'granny', block: 0,
                blurb: 'Rolling pin. Has never once lost an argument.' },
  fishmonger: { name: 'Fishmonger', cost: 150, hp: 130, S: 1.05, speed: 50, reach: 34, dmg: 18, cd: 1.1, knock: 700, style: 'chop', anim: 0.55, weapon: 'fish', hat: 'cap', block: 0,
                blurb: 'Slaps people with a fish. They fly a surprising distance.' },
  jester:     { name: 'Jester', cost: 160, hp: 70, S: 0.95, speed: 60, range: 300, dmg: 6, cd: 2.4, knock: 120, style: 'lob', proj: 'pie', anim: 0.8, weapon: 'pie', hat: 'jester', block: 0,
                blurb: 'Cream pies to the face. Targets stagger about, blinded.' },
  bard:       { name: 'Bard', cost: 180, hp: 80, S: 1, speed: 48, auraR: 170, dmg: 0, cd: 3, knock: 0, style: 'aura', aura: 'inspire', support: true, anim: 0.9, weapon: 'lute', hat: 'feather', block: 0,
                blurb: 'Plays a jaunty tune. Nearby allies fight and run faster.' },
  disco:      { name: 'Disco Dancer', cost: 280, hp: 120, S: 1, speed: 55, reach: 70, auraR: 120, dmg: 0, cd: 3.5, knock: 0, style: 'aura', aura: 'disco', anim: 0.9, weapon: 'none', hat: 'afro', block: 0,
                blurb: 'Every enemy nearby has to stop and dance.' },
  scarecrow:  { name: 'Scarecrow', cost: 140, hp: 320, S: 1.1, speed: 32, reach: 30, dmg: 6, cd: 1.2, knock: 150, style: 'punch', anim: 0.8, weapon: 'none', hat: 'scarecrow', block: 0, taunt: true,
                blurb: 'Enemies cannot resist attacking it. Mostly straw.' },
  cupid:      { name: 'Cupid', cost: 260, hp: 50, S: 0.8, speed: 60, range: 380, dmg: 4, cd: 3, knock: 60, style: 'bow', proj: 'heart', anim: 1.0, weapon: 'bow', hat: 'cupid', block: 0,
                blurb: 'Love arrows make enemies switch sides for six seconds.' },
  witch:      { name: 'Witch', cost: 400, hp: 70, S: 0.95, speed: 46, range: 320, dmg: 0, cd: 4.5, knock: 0, style: 'cast', proj: 'hex', anim: 1.0, weapon: 'broom', hat: 'witch', block: 0,
                blurb: 'Turns enemies into chickens. Yes, even giants.' },
  monkey:     { name: 'Monkey', cost: 120, hp: 60, S: 0.75, speed: 85, range: 260, dmg: 0, cd: 2.0, knock: 0, style: 'lob', proj: 'peel', anim: 0.7, weapon: 'banana', hat: 'monkey', block: 0, dodge: 0.2,
                blurb: 'Throws banana peels. Whoever steps on one goes flying.' },
  pirate:     { name: 'Pirate', cost: 280, hp: 110, S: 1.05, speed: 50, range: 360, dmg: 50, cd: 3.5, knock: 800, style: 'gun', proj: 'cannon', anim: 1.0, weapon: 'blunderbuss', hat: 'pirate', block: 0,
                blurb: 'A hand cannon loaded with actual cannonballs.' },
  robot:      { name: 'Robot', cost: 350, hp: 200, S: 1.1, speed: 42, range: 340, dmg: 22, cd: 1.0, knock: 200, style: 'laser', anim: 0.5, weapon: 'none', hat: 'robot', block: 0, heavy: 1.4,
                blurb: 'Beep. Fires a laser that never misses. Boop.' },
  treant:     { name: 'Treant', cost: 900, hp: 1100, S: 1.9, speed: 28, reach: 50, dmg: 70, cd: 2.2, knock: 900, style: 'punch', anim: 1.0, weapon: 'none', hat: 'treant', block: 0, aoe: true, fat: 1.2, heavy: 1.5,
                blurb: 'A grumpy old oak. Swats whole rows aside.' },
});
TYPES.giant.fat = 1.15;
const ORDER = ['chicken', 'squirrel', 'peasant', 'grandma', 'squire', 'fishmonger', 'hoplite', 'berserker', 'knight', 'ninja', 'scarecrow',
  'archer', 'musketeer', 'monkey', 'jester', 'thrower', 'pirate', 'bomber', 'cupid', 'bard', 'healer', 'disco', 'wizard', 'witch', 'storm',
  'robot', 'sumo', 'treant', 'lebron', 'giant'];
const HIT_T = { thrust: 0.55, chop: 0.55, dual: 0.55, punch: 0.55, shove: 0.55, pounce: 0.45, bow: 0.8, gun: 0.5, throw: 0.62, hoops: 0.55, lob: 0.55, cast: 0.62, heal: 0.45, aura: 0.5, laser: 0.3, bomb: 0.3, none: 2 };
// What each ranged style throws or fires unless the unit names its own projectile.
const DEFAULT_PROJ = { bow: 'arrow', gun: 'bullet', throw: 'boulder', hoops: 'ball', cast: 'fire' };
const SPREAD = { arrow: 0.05, heart: 0.05, bullet: 0.015, cannon: 0.03, boulder: 0.07, ball: 0.05, fire: 0.04, hex: 0.04, pie: 0.05, peel: 0.06 };

let NEXT_ID = 1;

class Unit {
  constructor(key, team, x, z) {
    this.key = key; this.t = TYPES[key]; this.team = team;
    this.id = NEXT_ID++;
    this.S = this.t.S;
    this.fx = team === 0 ? 1 : -1; this.fz = 0;
    this.body = buildBody(x, z, this.S, this.fx);
    this.hp = this.t.hp; this.alive = true;
    this.mass = this.S * this.S * (this.t.heavy || 1);
    this.r = 9 * this.S * Math.sqrt(this.t.fat || 1);
    this.phase = R() * TAU;
    this.cdT = R() * 0.6;
    this.act = 'idle'; this.actT = 0; this.fired = false; this.alt = false;
    this.aimY = 0.2;
    this.target = null; this.retarget = R() * 0.4;
    this.stun = 0; this.recover = 1;
    this.hitFlash = 0; this.kills = 0;
    this.home = team;               // the side it was placed on; `team` changes while charmed
    this.charm = 0; this.charmCool = 0; this.inspired = 0; this.dance = 0;
  }
  get P() { return this.body.pts[J.PELVIS]; }
}

function nearestEnemy(u, units) {
  const p = u.P;
  let best = null, bd = Infinity;
  for (const e of units) {
    if (!e.alive || e.team === u.team) continue;
    // Scarecrows are irresistible: they count as much closer than they are.
    const dx = e.P.x - p.x, dz = e.P.z - p.z, d = (dx * dx + dz * dz) * (e.t.taunt ? 0.2 : 1);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// Healers pick the ally who most needs it, weighing distance against missing health.
function healTarget(u, units) {
  const p = u.P;
  let best = null, bs = Infinity;
  for (const a of units) {
    if (!a.alive || a.team !== u.team || a === u || a.hp >= a.t.hp) continue;
    const dx = a.P.x - p.x, dz = a.P.z - p.z;
    const score = Math.sqrt(dx * dx + dz * dz) + (a.hp / a.t.hp) * 200;
    if (score < bs) { bs = score; best = a; }
  }
  return best;
}

function nearestAlly(u, units) {
  const p = u.P;
  let best = null, bd = Infinity;
  for (const a of units) {
    if (!a.alive || a.team !== u.team || a === u) continue;
    const dx = a.P.x - p.x, dz = a.P.z - p.z, d = dx * dx + dz * dz;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

function turnToward(u, dx, dz, k) {
  let fx = u.fx + (dx - u.fx) * k, fz = u.fz + (dz - u.fz) * k;
  const L = Math.sqrt(fx * fx + fz * fz) || 1;
  u.fx = fx / L; u.fz = fz / L;
}

function updateUnit(u, W, active) {
  if (u.hitFlash > 0) u.hitFlash -= DT;
  if (!u.alive) return;
  if (u.stun > 0) {
    u.stun -= DT; u.act = 'idle';
    if (u.stun <= 0) u.recover = 0;
  } else if (u.recover < 1) u.recover = Math.min(1, u.recover + DT / 0.7);
  const m = u.stun > 0 ? 0.04 : 0.15 + 0.85 * u.recover;
  if (u.charm > 0) {
    u.charm -= DT;
    if (u.charm <= 0 && u.team !== u.home) { u.team = u.home; u.target = null; u.retarget = 0; u.charmCool = 5; }
  } else if (u.charmCool > 0) u.charmCool -= DT;
  if (u.dance > 0) { u.dance -= DT; u.act = 'idle'; }
  if (u.inspired > 0) u.inspired -= DT;
  u.cdT -= DT * (u.inspired > 0 ? 1.7 : 1);

  let moving = false;
  const cheer = active && W.over;
  if (active) {
    u.retarget -= DT;
    if (!u.target || !u.target.alive || u.retarget <= 0) {
      u.target = u.t.heal ? healTarget(u, W.units) || nearestAlly(u, W.units) : u.t.support ? nearestAlly(u, W.units) : nearestEnemy(u, W.units);
      u.retarget = 0.35 + R() * 0.2;
    }
  } else u.target = null;

  const T = u.target, pel = u.P;
  if (T && u.stun <= 0 && !cheer && !(u.dance > 0)) {
    const tp = T.P, dx = tp.x - pel.x, dz = tp.z - pel.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    turnToward(u, dx / d, dz / d, 0.12);
    if (u.t.heal || u.t.support) {
      // Stay close to the army; walk up to whoever is hurt (healers) or just play (bards).
      const needs = u.t.heal ? T.hp < T.t.hp : true;
      if (u.act !== 'attack') {
        if (d > (needs && u.t.heal ? u.t.range * 0.9 : 90)) moving = true;
        else if (needs && u.cdT <= 0 && u.recover > 0.6) startAttack(u);
      }
    } else {
      const ranged = !!u.t.range;
      const reach = ranged ? u.t.range : u.t.reach + T.r;
      if (u.act !== 'attack') {
        if (d > reach * (ranged ? 1 : 0.85)) moving = true;
        else if (u.cdT <= 0 && u.recover > 0.6) startAttack(u);
      }
    }
    const st = u.t.style;
    if (u.act === 'attack' && (st === 'bow' || st === 'gun' || st === 'laser')) {
      const ch = u.body.pts[J.CHEST], tc = T.body.pts[J.CHEST];
      const P0 = st === 'laser' ? null : PROJ[u.t.proj || DEFAULT_PROJ[st]];
      const v = P0 ? aim(ch, tc, P0.speed, GRAV * P0.g, false) : { x: tc.x - ch.x, y: tc.y - ch.y, z: tc.z - ch.z };
      const h = Math.sqrt(v.x * v.x + v.z * v.z) || 1;
      u.aimY = clamp(v.y / h, -0.3, 1.4);
    }
  } else if (!active) {
    turnToward(u, u.team === 0 ? 1 : -1, 0, 0.05);
  }

  if (u.act === 'attack') {
    u.actT += DT / u.t.anim;
    if (!u.fired && u.actT >= HIT_T[u.t.style]) { u.fired = true; strike(u, W); }
    if (u.actT >= 1) u.act = 'idle';
  }
  musclePose(u, moving, m, cheer && W.over, W);
}

function startAttack(u) {
  u.act = 'attack'; u.actT = 0; u.fired = false; u.alt = !u.alt;
  if (u.t.style === 'pounce') {
    // A short leap at the target.
    for (const j of [J.PELVIS, J.CHEST, J.HEAD]) addVel(u.body.pts[j], u.fx * 150, 170, u.fz * 150);
  }
  u.cdT = u.t.cd * (0.85 + R() * 0.3);
}

// ---------- poses ----------
// Arm keyframes, relative to the chest in the unit's own frame, in units of S:
// [forward, up, right, dirForward, dirUp, dirRight]. Negative "right" is the left arm.
const GUARD_R = [8, -6, 6, 0.6, 0.8, 0];
const LEVEL_R = [6, -4, 6, 1, 0.25, 0];
const HANG_R = [1, -18, 6, 0.1, -1, 0];
const HANG_L = [1, -18, -6, 0.1, -1, 0];
const SHIELD_L = [10, -4, -5, 1, 0, 0];
const mirror = a => [a[0], a[1], -a[2], a[3], a[4], -a[5]];
const GUARD_L = mirror(GUARD_R);

const THRUST = [[0, LEVEL_R], [0.45, [-5, -1, 6, 1, 0.08, 0]], [0.58, [21, -1, 4, 1, -0.05, 0]], [1, LEVEL_R]];
const CHOP = [[0, GUARD_R], [0.42, [-3, 13, 6, -0.5, 1, 0]], [0.58, [17, -5, 5, 1, -0.7, 0]], [1, GUARD_R]];
const CHOP_L = CHOP.map(([t, a]) => [t, mirror(a)]);
const PUNCH_REST = [6, -6, 7, 1, 0, 0];
const PUNCH = [[0, PUNCH_REST], [0.45, [-4, 2, 8, 1, 0.1, 0]], [0.6, [24, 0, 5, 1, 0, 0]], [1, PUNCH_REST]];
const PUNCH_L = PUNCH.map(([t, a]) => [t, mirror(a)]);
const THROW_R = [[0, [4, -10, 5, 0, -1, 0]], [0.45, [-4, 17, 3, -0.3, 1, 0]], [0.55, [-5, 18, 3, -0.3, 1, 0]], [0.66, [16, 6, 3, 1, 0.2, 0]], [1, [4, -10, 5, 0, -1, 0]]];
const THROW_L = THROW_R.map(([t, a]) => [t, mirror(a)]);
const STAFF_R = [8, -5, 6, 0.15, 1, 0];
const CAST_R = [[0, STAFF_R], [0.5, [12, 8, 5, 0.6, 1, 0]], [0.62, [18, 4, 5, 1, 0.3, 0]], [1, STAFF_R]];
const CAST_L = [[0, HANG_L], [0.5, [10, 10, -5, 0.5, 1, 0]], [0.62, [16, 6, -5, 1, 0.3, 0]], [1, HANG_L]];

function keyf(frames, t) {
  for (let i = 1; i < frames.length; i++) {
    if (t <= frames[i][0]) {
      const [t0, a] = frames[i - 1], [t1, b] = frames[i];
      const k = smooth(clamp((t - t0) / (t1 - t0), 0, 1));
      return a.map((v, j) => v + (b[j] - v) * k);
    }
  }
  return frames[frames.length - 1][1];
}

// Arms up, arms down, swapping sides on the beat.
function dancePose(u, time) {
  return dsin(time * 5 + u.phase) > 0
    ? { r: [4, 16, 7, 0.3, 1, 0], l: [10, -10, -6, 0.6, -1, 0] }
    : { r: [10, -10, 6, 0.6, -1, 0], l: [4, 16, -7, 0.3, 1, 0] };
}

function armPose(u, moving, cheer, time) {
  const st = u.t.style, att = u.act === 'attack', t = u.actT;
  const sw = moving ? dsin(u.phase) * 3 : 0;
  const swing = (a, s) => [a[0] + s, a[1], a[2], a[3], a[4], a[5]];
  if (u.dance > 0 || u.t.aura === 'disco') return dancePose(u, time);
  if (cheer) {
    const b = dsin(time * 9 + u.phase) * 2;
    return { r: [4, 16 + b, 7, 0.2, 1, 0], l: [4, 16 - b, -7, 0.2, 1, 0] };
  }
  switch (st) {
    case 'thrust': {
      const r = att ? keyf(THRUST, t) : (u.t.weapon === 'spear' ? LEVEL_R : GUARD_R);
      return { r, l: u.t.shield ? SHIELD_L : null }; // null: two-handed grip on the shaft
    }
    case 'chop': return { r: att ? keyf(CHOP, t) : GUARD_R, l: SHIELD_L };
    case 'dual':
      return { r: att && !u.alt ? keyf(CHOP, t) : GUARD_R, l: att && u.alt ? keyf(CHOP_L, t) : GUARD_L };
    case 'punch':
      return { r: att && !u.alt ? keyf(PUNCH, t) : swing(PUNCH_REST, sw), l: att && u.alt ? keyf(PUNCH_L, t) : swing(mirror(PUNCH_REST), -sw) };
    case 'bow': {
      const e = u.aimY;
      if (!att) return { r: swing(HANG_R, sw), l: [6, -10, -5, 0.8, -0.3, 0] };
      const l = [17, 3, -1, 1, e, 0];
      const r = keyf([[0, [15, 3, 0, 1, e, 0]], [0.75, [1, 3, 1, 1, e, 0]], [0.8, [1, 3, 1, 1, e, 0]], [0.86, [-2, 4, 2, 1, e, 0]], [1, [8, -6, 5, 0.3, -1, 0]]], t);
      return { r, l };
    }
    case 'throw':
      return att ? { r: keyf(THROW_R, t), l: keyf(THROW_L, t) } : { r: [6, 2, 5, 0, 1, 0], l: [6, 2, -5, 0, 1, 0] };
    case 'cast':
      return att ? { r: keyf(CAST_R, t), l: keyf(CAST_L, t) } : { r: STAFF_R, l: swing(HANG_L, -sw) };
    case 'gun': {
      const e = u.aimY, rest = [6, -4, 5, 0.5, 0.8, 0], aimP = [4, 4, 3, 1, e, 0];
      const r = att ? keyf([[0, rest], [0.25, aimP], [0.5, aimP], [0.58, [-1, 6, 3, 1, e + 0.5, 0]], [0.72, aimP], [1, rest]], t) : rest;
      return { r, l: null };
    }
    case 'bomb':
      return { r: [6, 9, 4, 0, 1, 0], l: [6, 9, -4, 0, 1, 0] };
    case 'heal': {
      const up = [12, 10, 5, 0.5, 1, 0];
      return att ? { r: keyf([[0, STAFF_R], [0.4, up], [0.7, up], [1, STAFF_R]], t), l: keyf([[0, HANG_L], [0.4, [8, 8, -5, 0.4, 1, 0]], [0.7, [8, 8, -5, 0.4, 1, 0]], [1, HANG_L]], t) }
        : { r: STAFF_R, l: swing(HANG_L, -sw) };
    }
    case 'lob': {
      const rest = [8, -2, 6, 0.6, 0.6, 0];
      const r = att ? keyf([[0, rest], [0.4, [-6, 12, 6, -0.4, 1, 0]], [0.55, [16, 10, 5, 1, 0.5, 0]], [0.7, [18, 2, 5, 1, -0.4, 0]], [1, rest]], t) : rest;
      return { r, l: swing(HANG_L, -sw) };
    }
    case 'aura': {
      // Bard: left hand on the lute's neck, right hand strumming.
      const strum = att ? dsin(t * 40) * 2 : 0;
      return { r: [7, -6 + strum, 3, 0.1, -1, 0], l: [13, 2, -3, 1, 0.5, 0] };
    }
    case 'laser':
      return { r: att ? [16, 4, 3, 1, u.aimY, 0] : [10, -2, 5, 1, 0.1, 0], l: swing(HANG_L, -sw) };
    case 'pounce': {
      const rest = [6, -4, 5, 1, 0.2, 0];
      const frames = [[0, rest], [0.3, [2, 4, 6, 1, 0.5, 0]], [0.5, [16, 0, 4, 1, -0.2, 0]], [1, rest]];
      return att ? { r: keyf(frames, t), l: mirror(keyf(frames, t)) } : { r: rest, l: mirror(rest) };
    }
    case 'hoops': {
      const hold = [10, 0, 4, 1, 0, 0];
      const frames = [[0, hold], [0.35, [2, 16, 4, 0, 1, 0]], [0.55, [16, 12, 3, 1, 0.6, 0]], [0.7, [18, 4, 3, 1, -0.3, 0]], [1, hold]];
      return att ? { r: keyf(frames, t), l: mirror(keyf(frames, t)) } : { r: swing(hold, sw * 0.5), l: swing(mirror(hold), sw * 0.5) };
    }
    case 'shove': {
      const rest = [8, -2, 9, 1, 0, 0], frames = [[0, rest], [0.45, [0, 2, 10, 1, 0.1, 0]], [0.6, [24, 2, 8, 1, 0, 0]], [1, rest]];
      return att ? { r: keyf(frames, t), l: mirror(keyf(frames, t)) } : { r: swing(rest, sw), l: swing(mirror(rest), -sw) };
    }
  }
  return { r: HANG_R, l: HANG_L };
}

function musclePose(u, moving, m, cheer, W) {
  const pts = u.body.pts, S = u.S, pel = pts[J.PELVIS];
  const fx = u.fx, fz = u.fz, sx = -fz, sz = fx; // (sx, sz) points to the unit's right
  const vp = { x: pel.x - pel.px, y: pel.y - pel.py, z: pel.z - pel.pz };
  const hipH = (BONES.thigh + BONES.shin) * S * 0.92;
  const footY = Math.min(pts[J.LFOOT].y, pts[J.RFOOT].y);
  const grounded = footY < 6 * S || pel.y < 20 * S;

  if (grounded && m > 0.3) {
    // Standing units hold their own weight; stunned or airborne ones get the full force of gravity.
    const gc = GRAV * DT * DT * m;
    for (let i = 0; i < pts.length; i++) if (i !== J.LFOOT && i !== J.RFOOT) pts[i].py -= gc;
    const sp = moving ? u.t.speed * DT * (u.inspired > 0 ? 1.35 : 1) : 0;
    const k = 0.18 * m * ENV.traction;
    vp.x += (fx * sp - vp.x) * k;
    vp.z += (fz * sp - vp.z) * k;
    const hop = cheer ? Math.max(0, dsin(W.time * 9 + u.phase)) * 6 * S : 0;
    vp.y += (0 - vp.y) * 0.25 * m + (hipH + hop - pel.y) * 0.12 * m;
    pel.px = pel.x - vp.x; pel.py = pel.y - vp.y; pel.pz = pel.z - vp.z;
  }
  if (m <= 0) return;
  u.phase += Math.sqrt(vp.x * vp.x + vp.z * vp.z) / (S * 6);

  const lean = ((moving ? 4 : 1.5) + (u.act === 'attack' ? 2 : 0)) * S;
  const cx = pel.x + fx * lean, cy = pel.y + BONES.torso * S, cz = pel.z + fz * lean;
  drive(pts[J.CHEST], cx, cy, cz, 0.25 * m, 0.3 * m, vp, pel);
  drive(pts[J.HEAD], cx + fx * 1.5 * S, cy + BONES.neck * S, cz + fz * 1.5 * S, 0.2 * m, 0.25 * m, vp, pts[J.CHEST]);

  const stride = moving ? 7 * S : 0, lift = moving ? 5 * S : 0;
  const drop = Math.max(0, pel.y - hipH);
  for (const side of [-1, 1]) {
    const ph = u.phase + (side < 0 ? 0 : PI);
    const fo = dsin(ph) * stride, ly = Math.max(0, dcos(ph)) * lift + drop;
    const tx = pel.x + fx * fo + sx * side * 4 * S, tz = pel.z + fz * fo + sz * side * 4 * S;
    drive(pts[side < 0 ? J.LFOOT : J.RFOOT], tx, ly, tz, 0.3 * m, 0.3 * m, vp, pel);
    drive(pts[side < 0 ? J.LKNEE : J.RKNEE], (pel.x + tx) / 2 + fx * 5 * S, (pel.y + ly) / 2, (pel.z + tz) / 2 + fz * 5 * S, 0.12 * m, 0.2 * m, vp, pel);
  }

  const A = armPose(u, moving, cheer, W.time);
  const toWorld = (a, b, c) => [fx * a + sx * c, b, fz * a + sz * c];
  const setArm = (pose, hand, elbow) => {
    const h = toWorld(pose[0] * S, pose[1] * S, pose[2] * S);
    const d = toWorld(pose[3], pose[4], pose[5]);
    const dl = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) || 1;
    const hx = cx + h[0], hy = cy + h[1], hz = cz + h[2];
    const e = BONES.fore * S / dl;
    drive(pts[hand], hx, hy, hz, 0.3 * m, 0.3 * m, vp, pts[J.CHEST]);
    drive(pts[elbow], hx - d[0] * e, hy - d[1] * e, hz - d[2] * e, 0.15 * m, 0.25 * m, vp, pts[J.CHEST]);
    return [hx, hy, hz, d[0] / dl, d[1] / dl, d[2] / dl];
  };
  const r = setArm(A.r, J.RHAND, J.RELB);
  if (A.l) setArm(A.l, J.LHAND, J.LELB);
  else {
    // Two-handed grip: the left hand holds the shaft a little further up.
    const g = 10 * S;
    drive(pts[J.LHAND], r[0] + r[3] * g, r[1] + r[4] * g, r[2] + r[5] * g, 0.25 * m, 0.3 * m, vp, pts[J.CHEST]);
    drive(pts[J.LELB], (cx + r[0]) / 2 - sx * 6 * S, (cy + r[1]) / 2 - 3 * S, (cz + r[2]) / 2 - sz * 6 * S, 0.12 * m, 0.25 * m, vp, pts[J.CHEST]);
  }
}

// ---------- combat ----------
function aim(from, to, speed, g, high) {
  const dx = to.x - from.x, dz = to.z - from.z, dy = to.y - from.y;
  if (g <= 0) {
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    return { x: dx / L * speed, y: dy / L * speed, z: dz / L * speed, t: L / speed };
  }
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  const v2 = speed * speed, disc = v2 * v2 - g * (g * d * d + 2 * dy * v2);
  const tan = disc < 0 ? 1 : (v2 + (high ? 1 : -1) * Math.sqrt(disc)) / (g * d);
  const cos = 1 / Math.sqrt(1 + tan * tan), h = cos * speed;
  return { x: dx / d * h, y: tan * cos * speed, z: dz / d * h, t: d / h };
}

function lead(u, T, speed, g, high) {
  const from = u.body.pts[J.CHEST], tc = T.body.pts[J.CHEST], tp = T.P;
  const first = aim(from, tc, speed, g, high);
  const t = Math.min(first.t, 2);
  const to = { x: tc.x + (tp.x - tp.px) / DT * t * 0.7, y: tc.y, z: tc.z + (tp.z - tp.pz) / DT * t * 0.7 };
  return aim(from, to, speed, g, high);
}

function strike(u, W) {
  const st = u.t.style, pts = u.body.pts;
  if (st === 'heal') {
    const T = u.target;
    if (!T || !T.alive || T.team !== u.team) return;
    T.hp = Math.min(T.t.hp, T.hp + u.t.heal);
    W.beams.push({ a: u, b: T, life: 0.4 });
    const c = T.body.pts[J.CHEST];
    puff(W, c.x, c.y, c.z, 6, '#9be8a0', 50, 3 * T.S);
    SFX.play('chime');
    return;
  }
  if (st === 'bomb') {
    const c = pts[J.CHEST];
    explode(W, c.x, c.y, c.z, u.t.dmg, u.t.knock, 100, u);
    return;
  }
  if (st === 'aura') {
    const pel = u.P, R0 = u.t.auraR;
    for (const e of W.units) {
      if (!e.alive || e === u) continue;
      const dx = e.P.x - pel.x, dz = e.P.z - pel.z;
      if (dx * dx + dz * dz > R0 * R0) continue;
      if (u.t.aura === 'inspire' && e.team === u.team) e.inspired = 4.5;
      else if (u.t.aura === 'disco' && e.team !== u.team && e.stun <= 0) {
        e.dance = 1.8; e.act = 'idle';
        addVel(e.body.pts[J.CHEST], 0, 110 / e.mass, 0);
      }
    }
    const c = pts[J.HEAD];
    if (u.t.aura === 'disco') {
      glowBits(W, c.x, c.y + 20, c.z, 16, ['#ff5fd2', '#5fe3ff', '#ffe45f', '#8cff6b'], 140, 3);
      W.flashes.push({ x: pel.x, y: 4, z: pel.z, life: 0.4, max: 0.4, r: R0, disco: true });
      SFX.play('disco');
    } else {
      glowBits(W, c.x, c.y, c.z, 8, ['#ffd166', '#fff3c4'], 40, 2.5);
      SFX.play('strum');
    }
    return;
  }
  if (st === 'laser') {
    const T = u.target;
    if (!T || !T.alive) return;
    const pel = u.P, c = T.body.pts[J.CHEST], dx = c.x - pel.x, dz = c.z - pel.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d > u.t.range * 1.1) return;
    const k = u.t.knock;
    hurt(T, u.t.dmg * (0.9 + R() * 0.2), dx / d * k, k * 0.3, dz / d * k, pel, W, u);
    W.beams.push({ a: u, b: T, life: 0.15, laser: true });
    sparks(W, c.x, c.y, c.z, 5);
    SFX.play('pew');
    return;
  }
  if (DEFAULT_PROJ[st] || st === 'lob') {
    const T = u.target && u.target.alive ? u.target : nearestEnemy(u, W.units);
    if (!T) return;
    const pel = u.P, tx = T.P.x - pel.x, tz = T.P.z - pel.z;
    if (st === 'hoops' && tx * tx + tz * tz < (50 * u.S + T.r) ** 2) {
      // Slam dunk: everyone close in front goes up in the air.
      for (const e of W.units) {
        if (!e.alive || e.team === u.team) continue;
        const dx = e.P.x - pel.x, dz = e.P.z - pel.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
        if (d > 50 * u.S + e.r) continue;
        const k = u.t.knock * 1.2;
        hurt(e, u.t.dmg * 1.3, dx / d * k * 0.6, k, dz / d * k * 0.6, pel, W, u);
      }
      W.shake = Math.max(W.shake, 6);
      puff(W, pel.x + u.fx * 20, 0, pel.z + u.fz * 20, 8, '#cdbb98', 90, 7);
      SFX.play('thud');
      return;
    }
    if (st === 'cast' && u.t.chain) { chainLightning(u, T, W); return; }
    const kind = u.t.proj || DEFAULT_PROJ[st], P0 = PROJ[kind];
    const a = pts[J.LHAND], b = pts[J.RHAND], S = u.S;
    const from = st === 'bow' || st === 'gun' ? a
      : st === 'throw' || st === 'hoops' ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (st === 'throw' ? 6 : 4) * S, z: (a.z + b.z) / 2 }
      : st === 'cast' ? { x: b.x, y: b.y + 14 * S, z: b.z } : b;
    // Banana peels are aimed at the ground just ahead of the target, everything else at the target.
    const v = kind === 'peel'
      ? aim(from, { x: T.P.x + T.fx * 35, y: 0, z: T.P.z + T.fz * 35 }, P0.speed, GRAV * P0.g, false)
      : lead(u, T, P0.speed, GRAV * P0.g, false);
    spawnProj(W, kind, from, jitter(v, SPREAD[kind]), u);
    if (st === 'gun') {
      puff(W, a.x, a.y, a.z, kind === 'cannon' ? 12 : 7, '#e9e4dc', 70, kind === 'cannon' ? 7 : 5);
      SFX.play(kind === 'cannon' ? 'boom' : 'bang');
    } else SFX.play(st === 'bow' ? 'twang' : 'whoosh');
    return;
  }
  const pel = u.P, victims = [];
  for (const e of W.units) {
    if (!e.alive || e.team === u.team) continue;
    const dx = e.P.x - pel.x, dz = e.P.z - pel.z, d = Math.sqrt(dx * dx + dz * dz);
    if (d > u.t.reach * 1.15 + e.r) continue;
    if ((dx * u.fx + dz * u.fz) / (d || 1) < 0.25) continue;
    victims.push({ d, e });
  }
  if (!victims.length) return;
  let hit = victims;
  if (!u.t.aoe) {
    const t = victims.find(v => v.e === u.target);
    hit = [t || victims.reduce((a, b) => (b.d < a.d ? b : a))];
  }
  const up = st === 'punch' ? 0.75 : st === 'shove' ? 0.5 : st === 'thrust' || st === 'pounce' ? 0.25 : 0.4;
  for (const { e } of hit) {
    const k = u.t.knock * (0.8 + R() * 0.4);
    hurt(e, u.t.dmg * (0.8 + R() * 0.4), u.fx * k, up * k, u.fz * k, pel, W, u);
  }
  if (st === 'punch' || st === 'shove') { W.shake = Math.max(W.shake, 5); SFX.play('thud'); } else SFX.play('hit');
}

// Strikes the target, then jumps to the nearest enemy not yet struck, up to t.chain times.
function chainLightning(u, T, W) {
  const s = u.body.pts[J.RHAND];
  let from = { x: s.x, y: s.y + 22 * u.S, z: s.z }, cur = T;
  const struck = [];
  for (let i = 0; i < u.t.chain && cur; i++) {
    struck.push(cur.id);
    const c = cur.body.pts[J.CHEST];
    W.bolts.push(boltPath(from, c));
    const dx = c.x - from.x, dz = c.z - from.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
    const k = u.t.knock * (1 - i * 0.15);
    hurt(cur, u.t.dmg * (1 - i * 0.2), dx / d * k, k * 0.5, dz / d * k, null, W, u);
    sparks(W, c.x, c.y, c.z, 8);
    from = { x: c.x, y: c.y, z: c.z };
    let next = null, bd = 140 * 140;
    for (const e of W.units) {
      if (!e.alive || e.team === u.team || struck.includes(e.id)) continue;
      const ex = e.P.x - c.x, ez = e.P.z - c.z, d2 = ex * ex + ez * ez;
      if (d2 < bd) { bd = d2; next = e; }
    }
    cur = next;
  }
  W.flashes.push({ x: from.x, y: from.y, z: from.z, life: 0.2, max: 0.2, r: 30, bolt: true });
  SFX.play('zap');
}

// Cupid's arrows: the unit fights for `team` until the charm wears off.
function charm(e, team, dur, W) {
  if (e.charmCool > 0 && e.team === e.home) return;   // just came to its senses: immune for a few seconds
  if (e.team !== team) { e.team = team; e.target = null; e.retarget = 0; e.act = 'idle'; }
  e.charm = Math.max(e.charm, dur);
  const h = e.body.pts[J.HEAD];
  glowBits(W, h.x, h.y + 10, h.z, 6, ['#ff6fa8', '#ffc2da'], 30, 3);
  SFX.play('love');
}

// The Witch's hex: whatever it was, it is now a chicken on the same side.
function polymorph(e, W) {
  if (!e.alive) return;
  const p = e.P, c = e.body.pts[J.CHEST];
  glowBits(W, c.x, c.y, c.z, 14, ['#b56cff', '#e3c2ff', '#ffffff'], 70, 3.5);
  puff(W, c.x, c.y, c.z, 8, '#d8c2ff', 60, 6);
  const t = TYPES.chicken;
  e.key = 'chicken'; e.t = t; e.S = t.S;
  e.body = buildBody(p.x, p.z, e.S, e.fx >= 0 ? 1 : -1);
  e.hp = t.hp; e.mass = e.S * e.S; e.r = 9 * e.S;
  e.act = 'idle'; e.stun = 0; e.recover = 0.3; e.target = null; e.retarget = 0; e.cdT = 0.5; e.inspired = 0; e.dance = 0;
  SFX.play('poof');
}

// A jagged line for the renderer. Visual only, so Math.random is fine.
function boltPath(a, b) {
  const pts = [[a.x, a.y, a.z]];
  for (let i = 1; i < 7; i++) {
    const t = i / 7, j = 10 * Math.sin(t * PI);
    pts.push([lerp(a.x, b.x, t) + rand(-j, j), lerp(a.y, b.y, t) + rand(-j, j), lerp(a.z, b.z, t) + rand(-j, j)]);
  }
  pts.push([b.x, b.y, b.z]);
  return { pts, life: 0.28 };
}

function jitter(v, a) {
  return { x: v.x * (1 + RR(-a, a)), y: v.y * (1 + RR(-a, a)), z: v.z + RR(-a, a) * 60 };
}

// from: where the blow came from ({x, z}), or null for blasts and lightning, which shields and dodges can't stop.
// src: the unit to credit. Returns HIT, BLOCKED or DODGED.
const HIT = 0, BLOCKED = 1, DODGED = 2;
function hurt(e, dmg, ix, iy, iz, from, W, src) {
  let res = HIT;
  if (e.alive && from && e.stun <= 0) {
    if (e.t.dodge && R() < e.t.dodge) {
      // Sidestep: a quick hop to one side and no damage.
      const side = R() < 0.5 ? -1 : 1;
      for (const j of [J.PELVIS, J.CHEST]) addVel(e.body.pts[j], -e.fz * side * 160, 60, e.fx * side * 160);
      return DODGED;
    }
    if (e.t.block) {
      const dx = from.x - e.P.x, dz = from.z - e.P.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
      if ((dx * e.fx + dz * e.fz) / d > 0.3 && R() < e.t.block) {
        res = BLOCKED; dmg *= 0.15; ix *= 0.4; iy *= 0.4; iz *= 0.4;
        const h = e.body.pts[J.LHAND];
        sparks(W, h.x, h.y, h.z, 6);
        SFX.play('clank');
      }
    }
  }
  const inv = 1 / e.mass, pts = e.body.pts;
  for (let i = 0; i < pts.length; i++) {
    const w = i === J.CHEST || i === J.HEAD ? 1 : i === J.PELVIS ? 0.75 : 0.5;
    addVel(pts[i], ix * inv * w, iy * inv * w, iz * inv * w);
  }
  if (!e.alive) return res;
  const mag = Math.sqrt(ix * ix + iy * iy + iz * iz) * inv;
  e.hp -= dmg; e.hitFlash = 0.12;
  if (mag > 320) { e.stun = Math.max(e.stun, Math.min(2.2, mag / 700)); e.act = 'idle'; }
  const c = pts[J.CHEST];
  if (res === HIT && dmg > 0) puff(W, c.x, c.y, c.z, 3, '#f4efe4', 40, 3 * e.S);
  if (e.hp <= 0) kill(e, W, src);
  return res;
}

function kill(e, W, src) {
  e.alive = false; e.hp = 0; e.act = 'dead';
  W.lost[e.home]++;
  if (src) src.kills++;
  if (e.t.style === 'bomb' && !e.fired) {
    const c = e.body.pts[J.CHEST];
    e.fired = true; explode(W, c.x, c.y, c.z, e.t.dmg, e.t.knock, 100, e);
  }
}

// Volcano map: anyone standing in the lava around the field hops about and burns.
function lavaBurn(W) {
  if (!ENV.lava) return;
  for (const u of W.units) {
    if (!u.alive) continue;
    const p = u.P, pts = u.body.pts;
    let rate = Math.abs(p.x) < FIELD_X + 60 && p.z > -60 && p.z < FIELD_Z + 60 ? 0 : 160;
    if (!rate && ENV.pools) for (const [x, z, r] of ENV.pools) if ((p.x - x) ** 2 + (p.z - z) ** 2 < r * r) { rate = 60; break; }
    if (!rate) continue;
    if (Math.min(pts[J.LFOOT].y, pts[J.RFOOT].y) > 4 && p.y > 12 * u.S) continue;
    u.hp -= rate * DT; u.hitFlash = 0.05;
    for (const j of [J.LFOOT, J.RFOOT]) addVel(pts[j], 0, 70, 0);
    if (Math.random() < 0.3) W.parts.push({ kind: 'fire', x: p.x + rand(-6, 6), y: 2, z: p.z + rand(-6, 6), vx: 0, vy: rand(30, 90), vz: 0, life: 0.4, max: 0.4, size: rand(3, 6) });
    if (u.hp <= 0) { kill(u, W, null); SFX.play('sizzle'); }
  }
}

function separate(units) {
  const a = units.filter(u => u.alive).sort((p, q) => p.P.x - q.P.x);
  for (let i = 0; i < a.length; i++) {
    const u = a[i], p = u.P;
    for (let j = i + 1; j < a.length; j++) {
      const v = a[j], q = v.P;
      const rr = u.r + v.r;
      if (q.x - p.x > 50) break;
      const dx = q.x - p.x, dz = q.z - p.z, d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 === 0) continue;
      const d = Math.sqrt(d2), push = (rr - d) / d * 0.5;
      const wu = v.mass / (u.mass + v.mass), wv = 1 - wu;
      for (const k of [J.PELVIS, J.CHEST]) {
        const P1 = u.body.pts[k], P2 = v.body.pts[k];
        P1.x -= dx * push * wu; P1.z -= dz * push * wu;
        P2.x += dx * push * wv; P2.z += dz * push * wv;
      }
    }
  }
}
