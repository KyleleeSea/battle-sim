'use strict';
// Projectiles and ground hazards (simulation) and particles (visual only).

// Launch speed, gravity (as a share of GRAV), radius and lifetime for each kind of projectile.
const PROJ = {
  arrow:   { speed: 680, g: 1, r: 1.5, life: 9 },
  heart:   { speed: 680, g: 1, r: 1.5, life: 9 },
  bullet:  { speed: 1700, g: 0.1, r: 1.5, life: 2 },
  cannon:  { speed: 900, g: 0.5, r: 6, life: 8 },
  boulder: { speed: 560, g: 1, r: 9, life: 10 },
  ball:    { speed: 600, g: 1, r: 6.5, life: 7 },
  fire:    { speed: 380, g: 0.35, r: 7, life: 10 },
  hex:     { speed: 330, g: 0.3, r: 5, life: 8 },
  pie:     { speed: 520, g: 1, r: 4, life: 6 },
  peel:    { speed: 450, g: 1, r: 3, life: 6 },
};

function spawnProj(W, kind, from, vel, u) {
  const P0 = PROJ[kind];
  W.projs.push({
    kind, x: from.x, y: from.y, z: from.z, vx: vel.x, vy: vel.y, vz: vel.z,
    team: u.team, owner: u, dmg: u.t.dmg, knock: u.t.knock,
    g: GRAV * P0.g, r: P0.r, life: P0.life, stuck: null, hits: [], dead: false,
  });
}

const HIT_JOINTS = [J.HEAD, J.CHEST, J.PELVIS];

function projHitsUnit(p, e, ox, oy, oz) {
  const pts = e.body.pts;
  if (Math.abs(pts[J.PELVIS].x - p.x) > 70 * e.S) return -1;
  for (const j of HIT_JOINTS) {
    const q = pts[j];
    const rad = (j === J.HEAD ? 8 : 9) * e.S + p.r;
    if (segDist(ox, oy, oz, p.x, p.y, p.z, q.x, q.y, q.z) < rad) return j;
  }
  // The belly, between chest and pelvis.
  const a = pts[J.CHEST], b = pts[J.PELVIS];
  if (segDist(ox, oy, oz, p.x, p.y, p.z, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2) < 9 * e.S + p.r) return J.CHEST;
  return -1;
}

const ROLLS = { boulder: 0.35, cannon: 0.35, ball: 0.72 };   // ground bounciness of things that roll

function updateProjectiles(W) {
  for (const p of W.projs) {
    p.life -= DT;
    if (p.life <= 0) { p.dead = true; continue; }
    if (p.stuck) {
      if (p.stuck.unit) {
        const q = p.stuck.unit.body.pts[p.stuck.j];
        p.x = q.x + p.stuck.ox; p.y = q.y + p.stuck.oy; p.z = q.z + p.stuck.oz;
      }
      continue;
    }
    const ox = p.x, oy = p.y, oz = p.z;
    p.vy -= p.g * DT;
    p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT;
    if (p.kind === 'fire') flame(W, p.x, p.y, p.z);
    else if (p.kind === 'hex') glowBits(W, p.x, p.y, p.z, 1, ['#b56cff', '#e3c2ff'], 20, 2.5);

    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
    const rolls = ROLLS[p.kind] !== undefined;
    for (const e of W.units) {
      if (p.kind === 'peel') break;              // peels sail over heads and land
      if (e.team === p.team) continue;
      if (!rolls && !e.alive) continue;
      if (p.hits.includes(e.id)) continue;
      const j = projHitsUnit(p, e, ox, oy, oz);
      if (j < 0) continue;
      p.hits.push(e.id);
      const nx = p.vx / (speed || 1), ny = p.vy / (speed || 1), nz = p.vz / (speed || 1);
      const from = { x: ox, z: oz };
      if (p.kind === 'arrow' || p.kind === 'heart' || p.kind === 'bullet') {
        const res = hurt(e, p.dmg * RR(0.85, 1.15), nx * p.knock, ny * p.knock + 40, nz * p.knock, from, W, p.owner);
        if (res === DODGED) continue;
        if (p.kind === 'bullet') { p.dead = true; break; }
        if (res === BLOCKED) {
          // Glances off the shield and drops.
          p.vx *= -0.25; p.vz *= -0.25; p.vy = 120; p.team = -1;
        } else {
          if (p.kind === 'heart' && e.alive) charm(e, p.team, 6, W);
          const q = e.body.pts[j];
          p.stuck = { unit: e, j, ox: p.x - q.x, oy: p.y - q.y, oz: p.z - q.z };
          p.life = 12;
          SFX.play('thunk');
        }
        break;
      } else if (rolls) {
        if (speed < (p.kind === 'ball' ? 100 : 140)) continue;
        const f = Math.min(1, speed / 500), k = p.knock * f;
        hurt(e, p.dmg * f, nx * k, p.kind === 'ball' ? k * 0.5 : ny * k * 0.5 + k * 0.45, nz * k, from, W, p.owner);
        if (p.kind === 'ball') {
          // Basketballs bounce off whoever they hit and keep going.
          p.vx *= -0.45; p.vz *= -0.45; p.vy = Math.abs(p.vy) * 0.4 + 180;
          SFX.play('boing');
        } else { p.vx *= 0.6; p.vy *= 0.6; p.vz *= 0.6; SFX.play('thud'); }
      } else if (p.kind === 'pie') {
        const res = hurt(e, p.dmg, nx * p.knock, 60, nz * p.knock, from, W, p.owner);
        if (res === DODGED) continue;
        if (res === HIT && e.alive) { e.stun = Math.max(e.stun, 1.5); e.act = 'idle'; }
        splat(W, p.x, p.y, p.z);
        p.dead = true;
        break;
      } else if (p.kind === 'hex') {
        if (e.key === 'chicken') hurt(e, 15, nx * 100, 80, nz * 100, null, W, p.owner);
        else polymorph(e, W);
        p.dead = true;
        break;
      } else {
        explode(W, p.x, p.y, p.z, p.dmg, p.knock, 85, p.owner);
        p.dead = true;
        break;
      }
    }
    if (p.dead || p.stuck) continue;

    if (p.y <= p.r * 0.6) {
      if (rolls) {
        p.y = p.r * 0.6;
        if (p.kind === 'ball') { if (p.vy < -120) SFX.play('boing'); }
        else if (p.vy < -160) { puff(W, p.x, 0, p.z, 5, '#cdbb98', 60, 6); SFX.play('thud'); }
        p.vy = p.vy < -60 ? -p.vy * ROLLS[p.kind] : 0;
        const fr = p.kind === 'ball' ? 0.985 : 0.97;
        p.vx *= fr; p.vz *= fr;
      } else if (p.kind === 'arrow' || p.kind === 'heart') {
        p.y = 0; p.stuck = { unit: null }; p.life = 6;
      } else if (p.kind === 'bullet') {
        p.dead = true; puff(W, p.x, 0, p.z, 3, '#cdbb98', 40, 3);
      } else if (p.kind === 'pie') {
        p.dead = true; splat(W, p.x, 1, p.z);
      } else if (p.kind === 'hex') {
        p.dead = true; glowBits(W, p.x, 2, p.z, 10, ['#b56cff', '#e3c2ff'], 60, 3);
      } else if (p.kind === 'peel') {
        p.dead = true;
        W.hazards.push({ x: p.x, z: p.z, team: p.team, life: 25, spin: rand(0, TAU) });
      } else {
        explode(W, p.x, 0, p.z, p.dmg, p.knock, 85, p.owner);
        p.dead = true;
      }
    }
  }
  W.projs = W.projs.filter(p => !p.dead);
  // Keep the count bounded: oldest stuck arrows go first.
  if (W.projs.length > 600) {
    let extra = W.projs.length - 600;
    W.projs = W.projs.filter(p => !(extra > 0 && p.stuck && extra-- > 0));
  }
  updateHazards(W);
}

// Banana peels: the first enemy to step on one slips over backwards.
function updateHazards(W) {
  for (const h of W.hazards) {
    h.life -= DT;
    for (const u of W.units) {
      if (!u.alive || u.team === h.team || u.stun > 0) continue;
      const p = u.P, dx = p.x - h.x, dz = p.z - h.z, rr = 8 + u.r * 0.6;
      if (dx * dx + dz * dz > rr * rr) continue;
      const pts = u.body.pts;
      if (Math.min(pts[J.LFOOT].y, pts[J.RFOOT].y) > 6 * u.S) continue;
      const k = 1 / u.mass;
      for (const j of [J.LFOOT, J.RFOOT, J.LKNEE, J.RKNEE]) addVel(pts[j], u.fx * 380 * k, 240 * k, u.fz * 380 * k);
      for (const j of [J.HEAD, J.CHEST]) addVel(pts[j], -u.fx * 140 * k, 60 * k, -u.fz * 140 * k);
      u.stun = Math.max(u.stun, 1.6); u.act = 'idle';
      h.life = 0;
      SFX.play('slip');
      break;
    }
  }
  W.hazards = W.hazards.filter(h => h.life > 0);
}

// Blast damage and knockback fall off with distance and hit every unit in range, friend or foe.
function explode(W, x, y, z, dmg, knock, R0, owner) {
  for (const e of W.units) {
    const c = e.body.pts[J.CHEST];
    const dx = c.x - x, dy = c.y - y, dz = c.z - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > R0 + e.r) continue;
    const f = clamp(1 - d / (R0 + e.r), 0, 1), k = knock * f, n = d || 1;
    hurt(e, e.alive ? dmg * f : 0, dx / n * k, Math.abs(dy) / n * k * 0.4 + k * 0.6, dz / n * k, null, W, owner);
  }
  W.shake = Math.max(W.shake, 8);
  W.flashes.push({ x, y: Math.max(y, 4), z, life: 0.35, max: 0.35, r: R0 });
  for (let i = 0; i < 26; i++) {
    const a = rand(0, TAU), s = rand(60, 260);
    W.parts.push({ kind: 'fire', x, y: Math.max(y, 4), z, vx: Math.cos(a) * s, vy: rand(40, 260), vz: Math.sin(a) * s * 0.6, life: rand(0.3, 0.7), max: 0.7, size: rand(5, 11) });
  }
  puff(W, x, Math.max(y, 2), z, 10, '#5d5866', 90, 9);
  sparks(W, x, Math.max(y, 4), z, 14);
  SFX.play('boom');
}

// ---------- particles (visual only: Math.random is fine here) ----------
function puff(W, x, y, z, n, color, spd, size) {
  for (let i = 0; i < n; i++) {
    W.parts.push({ kind: 'puff', x, y, z, vx: rand(-spd, spd), vy: rand(0, spd * 0.6), vz: rand(-spd, spd) * 0.5, life: rand(0.4, 0.9), max: 0.9, size: size * rand(0.7, 1.3), color });
  }
}

function sparks(W, x, y, z, n) {
  for (let i = 0; i < n; i++) {
    W.parts.push({ kind: 'spark', x, y, z, vx: rand(-220, 220), vy: rand(40, 260), vz: rand(-120, 120), life: rand(0.15, 0.4), max: 0.4, size: 1 });
  }
}

// Small glowing bits that float upward: music notes, hearts, magic, disco sparkle.
function glowBits(W, x, y, z, n, colors, spd, size) {
  for (let i = 0; i < n; i++) {
    W.parts.push({ kind: 'glow', x: x + rand(-4, 4), y: y + rand(-4, 4), z: z + rand(-4, 4), vx: rand(-spd, spd), vy: rand(spd * 0.5, spd * 1.5), vz: rand(-spd, spd) * 0.6, life: rand(0.5, 1.1), max: 1.1, size: size * rand(0.7, 1.3), color: colors[Math.floor(Math.random() * colors.length)] });
  }
}

function splat(W, x, y, z) {
  puff(W, x, y, z, 9, '#fffaf0', 70, 4);
  puff(W, x, y, z, 3, '#e8c98f', 50, 3);
  SFX.play('splat');
}

function flame(W, x, y, z) {
  W.parts.push({ kind: 'fire', x: x + rand(-3, 3), y: y + rand(-3, 3), z, vx: rand(-20, 20), vy: rand(10, 50), vz: 0, life: rand(0.2, 0.4), max: 0.4, size: rand(3, 6) });
}

function updateParticles(W) {
  for (const q of W.parts) {
    q.life -= DT;
    if (q.kind === 'spark') q.vy -= GRAV * 0.6 * DT;
    else { q.vy += (q.kind === 'fire' ? 40 : 15) * DT; q.vx *= 0.95; q.vz *= 0.95; }
    q.x += q.vx * DT; q.y += q.vy * DT; q.z += q.vz * DT;
    if (q.y < 0) { q.y = 0; q.vy *= -0.3; }
  }
  W.parts = W.parts.filter(q => q.life > 0);
  if (W.parts.length > 1500) W.parts.splice(0, W.parts.length - 1500);
  for (const f of W.flashes) f.life -= DT;
  W.flashes = W.flashes.filter(f => f.life > 0);
  for (const b of W.bolts) b.life -= DT;
  W.bolts = W.bolts.filter(b => b.life > 0);
  for (const b of W.beams) b.life -= DT;
  W.beams = W.beams.filter(b => b.life > 0);
}
