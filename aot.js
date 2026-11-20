'use strict';
// Attack on Titan: the Survey Corps, the Garrison, Marley and its Warriors, the Nine Titans and their holders,
// and Eren's war in three stages. Simulation only; paint_aot.js draws all of it.

// ---------- who's who ----------
// Zeke's scream turns people into Titans: soldiers, yes; robots, ducks and Ackermans, no.
const NOT_HUMAN = new Set(['robot', 'minibot', 'treant', 'scarecrow', 'chicken', 'squirrel', 'monkey', 'fish', 'brick', 'tung', 'armadillo',
  'bigbird', 'duck', 'minion', 'gpu', 'dragon', 'mystery', 'ultraman', 'megaknight', 'sumo', 'giant', 'narutoclone', 'actor', 'witch']);
// Shifters (who already hold a Titan) and Ackermans can't be turned.
const isHuman = e => !e.t.shift && !e.t.immune && !e.shifted && (!!e.t.human || (!e.t.titan && !e.t.body && !e.t.fly && !e.t.colossal && !e.t.skills && e.S >= 0.7 && e.S <= 1.3 && !NOT_HUMAN.has(e.key)));
const sideSign = u => (u.home === 0 ? -1 : 1);

// ---------- projectiles ----------
Object.assign(PROJ, {
  tspear: { speed: 620, g: 0.25, r: 3, life: 3 },
  rock: { speed: 760, g: 1, r: 5, life: 6 },
  bigrock: { speed: 760, g: 1, r: 13, life: 8 },
  shell: { speed: 950, g: 0.45, r: 5, life: 6 },
  bomb: { speed: 10, g: 1, r: 6, life: 8 },
  grenade: { speed: 420, g: 1, r: 3, life: 5 },
  atrifle: { speed: 2400, g: 0.02, r: 2, life: 1.5 },
  firearrow: { speed: 720, g: 1, r: 2, life: 8 },
  flare: { speed: 520, g: 0.6, r: 3, life: 3 },
});
Object.assign(SPREAD, { tspear: 0.02, rock: 0.06, bigrock: 0.04, shell: 0.02, bomb: 0, grenade: 0.05, atrifle: 0.005, firearrow: 0.04, flare: 0.05 });
// Thunder spears bite in, then go off a moment later: through hardening and armour plates alike.
PROJ_HOOKS.tspear = {
  hit(p, e, W, nx, ny, nz, from, j) {
    const q = e.body.pts[j];
    p.stuck = { unit: e, j, ox: p.x - q.x, oy: p.y - q.y, oz: p.z - q.z };
    p.life = 0.6;
    SFX.play('thunk');
    later(W, 0.4, () => { p.dead = true; explode(W, p.x, p.y, p.z, p.dmg, p.knock, 55, p.owner, PIERCE, true); });
    return true;
  },
  ground(p, W, y) { p.dead = true; explode(W, p.x, y, p.z, p.dmg * 0.7, p.knock, 55, p.owner, PIERCE, true); },
  tick(p) { if (Math.random() < 0.5) p.trail = true; },
};
// Crushed rock from the Beast Titan: each shard a cannonball.
PROJ_HOOKS.rock = {
  hit(p, e, W, nx, ny, nz, from) {
    hurt(e, p.dmg * RR(0.8, 1.2), nx * p.knock, 220, nz * p.knock, from, W, p.owner);
    p.dead = true;
    return true;
  },
  ground(p, W, y) { p.dead = true; puff(W, p.x, y + 2, p.z, 3, '#a89a84', 50, 5); },
};
PROJ_HOOKS.bigrock = {
  hit(p, e, W, nx, ny, nz) { p.dead = true; rockLand(p, W, p.y); return true; },
  ground(p, W, y) { p.dead = true; rockLand(p, W, y); },
};
function rockLand(p, W, y) {
  for (const e of W.units) {
    if (!e.alive || e.team === p.team || e.burrow) continue;
    const dx = e.P.x - p.x, dz = e.P.z - p.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d > 45 + e.r) continue;
    hurt(e, p.dmg * (1 - d / (90 + e.r)), dx / d * p.knock, p.knock * 0.6, dz / d * p.knock, null, W, p.owner);
  }
  W.shake = Math.max(W.shake, 6);
  puff(W, p.x, y + 4, p.z, 14, '#a89a84', 110, 10);
  SFX.play('thud');
}
for (const k of ['shell', 'bomb', 'grenade']) {
  const R0 = k === 'shell' ? 60 : k === 'bomb' ? 75 : 55, fl = k === 'shell' ? PIERCE : 0;
  PROJ_HOOKS[k] = {
    hit(p, e, W) { p.dead = true; explode(W, p.x, p.y, p.z, p.dmg, p.knock, R0, p.owner, fl); return true; },
    ground(p, W, y) { p.dead = true; explode(W, p.x, y, p.z, p.dmg, p.knock, R0, p.owner, fl); },
  };
}
// Gabi's anti-Titan rifle: one round, straight through hardening, and it knocks a Titan off its feet.
PROJ_HOOKS.atrifle = {
  hit(p, e, W, nx, ny, nz, from) {
    hurt(e, p.dmg, nx * p.knock, 200, nz * p.knock, from, W, p.owner, PIERCE);
    if (e.alive && e.t.titan && !e.t.colossal) { e.stun = Math.max(e.stun, 1.2); e.act = 'idle'; }
    sparks(W, p.x, p.y, p.z, 10);
    p.dead = true;
    return true;
  },
  ground(p, W, y) { p.dead = true; puff(W, p.x, y, p.z, 3, '#cdbb98', 40, 3); },
};
PROJ_HOOKS.firearrow = {
  tick(p, W) { flame(W, p.x, p.y, p.z); },
  hit(p, e, W, nx, ny, nz, from) { hurt(e, p.dmg, nx * p.knock, 60, nz * p.knock, from, W, p.owner); flame(W, p.x, p.y, p.z); p.dead = true; return true; },
  ground(p, W, y) { p.dead = true; flame(W, p.x, y + 2, p.z); },
};
// Signal flares: coloured smoke, no damage.
PROJ_HOOKS.flare = {
  tick(p, W) { if (Math.random() < 0.8) W.parts.push({ kind: 'puff', x: p.x, y: p.y, z: p.z, vx: rand(-8, 8), vy: rand(4, 16), vz: rand(-8, 8), life: 2.6, max: 2.6, size: rand(6, 10), color: p.color || '#5fbf5a' }); },
  hit() { return false; },
  ground(p) { p.dead = true; },
};

// ---------- abilities ----------
// The aot tick runs every unit's ongoing moves: ODM spins, Armoured charges, steam, flames, dives.
TICKS.aot = (u, W, active) => {
  if (!active || !u.alive) return;
  const pts = u.body.pts, pel = u.P;
  if (u.spinT > 0) {
    // ODM spin: a whirl of blades through everything in reach.
    u.spinT -= DT;
    if ((u.spinTick = (u.spinTick || 0) - DT) <= 0) {
      u.spinTick = 0.08;
      for (const e of enemiesNear(u, W, pel.x, pel.z, 42 * u.S)) {
        if (u.spinHit.includes(e.id) || Math.abs(e.P.y - pel.y) > 80 * e.S) continue;
        u.spinHit.push(e.id);
        hurt(e, u.spinDmg, u.fx * 180, 120, u.fz * 180, null, W, u);
        SFX.play('hit');
      }
    }
    if (W.fx) W.fx.push({ kind: 'spin', x: pel.x, y: pel.y, z: pel.z, r: 30 * u.S, life: 0.12, max: 0.12, a: u.spinT * 30 });
  }
  if (u.chargeT > 0) {
    // The Armoured Titan's charge: nothing in the way stays standing.
    u.chargeT -= DT;
    const sp = u.chargeSp * DT;
    for (const j of [J.PELVIS, J.CHEST, J.HEAD]) { const q = pts[j]; q.px = q.x - u.chargeX * sp; q.pz = q.z - u.chargeZ * sp; }
    u.fx = u.chargeX; u.fz = u.chargeZ;
    for (const e of enemiesNear(u, W, pel.x + u.chargeX * 20 * u.S, pel.z + u.chargeZ * 20 * u.S, 26 * u.S)) {
      if (u.chargeHit.includes(e.id)) continue;
      u.chargeHit.push(e.id);
      const k = u.chargeKnock;
      hurt(e, u.chargeDmg, u.chargeX * k, k * 0.55, u.chargeZ * k, null, W, u);
      W.shake = Math.max(W.shake, 4);
      SFX.play('thud');
    }
    if (Math.random() < 0.5) puff(W, pel.x, groundH(pel.x, pel.z) + 2, pel.z, 2, '#cdbb98', 60, 7);
  }
  if (u.steamT > 0) {
    // Steam release: scalding, and it blows away anyone close; it costs the Titan its own flesh.
    u.steamT -= DT;
    u.hp -= u.t.hp * 0.012 * DT;
    if ((u.steamTick = (u.steamTick || 0) - DT) <= 0) {
      u.steamTick = 0.25;
      const R0 = 34 * u.S;
      for (const e of W.units) {
        if (!e.alive || e === u || e.burrow || e.t.colossal) continue;
        const dx = e.P.x - pel.x, dz = e.P.z - pel.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
        if (d > R0 + e.r) continue;
        const k = e.team === u.team ? 0 : 420;
        hurt(e, e.team === u.team ? 0 : 12, dx / d * k, k * 0.6, dz / d * k, null, W, u);
      }
    }
    if (u.hp <= 0) kill(u, W, null);
  }
  if (u.burnT > 0) {
    // Hange's last stand: ablaze, still fighting.
    u.burnT -= DT;
    if ((u.burnTick = (u.burnTick || 0) - DT) <= 0) {
      u.burnTick = 0.3;
      for (const e of enemiesNear(u, W, pel.x, pel.z, 55)) hurt(e, 8, 0, 0, 0, null, W, u);
    }
    flame(W, pel.x + rand(-6, 6), pel.y + rand(0, 30), pel.z + rand(-6, 6));
  }
  if (u.diveT > 0) {
    // Falco's dive: down onto the target, then back up.
    u.diveT -= DT;
    const T = u.diveTarget;
    if (T && T.alive) {
      const h = T.body.pts[J.CHEST], c = pts[J.CHEST], dx = h.x - c.x, dy = h.y - c.y, dz = h.z - c.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      for (const q of pts) { q.px = q.x - dx / L * 9; q.py = q.y - dy / L * 9; q.pz = q.z - dz / L * 9; }
      if (L < 30 * u.S + T.r) {
        hurt(T, u.diveDmg, dx / L * 600, 300, dz / L * 600, null, W, u, PIERCE);
        if (T.hard > 0) T.hard = 0;
        u.diveT = 0;
        SFX.play('thud');
      }
    } else u.diveT = 0;
  }
};

// ODM gear spin (Levi, Mikasa): a fast whirling dash through the target's line.
SKILLS.spin = {
  cast(u, W, T, d, s) {
    const dx = (T.P.x - u.P.x) / d, dz = (T.P.z - u.P.z) / d, v = Math.min(700, d * 2.6 + 200);
    for (const q of u.body.pts) addVel(q, dx * v, 160, dz * v);
    u.spinT = 0.55; u.spinHit = []; u.spinDmg = s.dmg; u.spinTick = 0;
    SFX.play('whoosh');
  },
};
// Straight for the back of a Titan's neck.
SKILLS.nape = {
  when: (u, W, T) => !!T.t.titan,
  cast(u, W, T, d, s) {
    const h = T.body.pts[J.HEAD], c = u.body.pts[J.CHEST], tt = 0.4;
    const nx = h.x - T.fx * 12 * T.S, nz = h.z - T.fz * 12 * T.S;
    for (const q of u.body.pts) addVel(q, (nx - c.x) / tt - (q.x - q.px) / DT, (h.y - c.y) / tt + GRAV * tt / 2 - (q.y - q.py) / DT, (nz - c.z) / tt - (q.z - q.pz) / DT);
    u.leaping = true; u.leapT = 0;
    later(W, tt, () => {
      if (!u.alive || !T.alive) return;
      const a = u.body.pts[J.CHEST], b = T.body.pts[J.HEAD];
      if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 > (40 * T.S) ** 2) return;
      hurt(T, s.dmg, 0, 0, 0, null, W, u);
      if (W.fx) W.fx.push({ kind: 'slash', x: b.x, y: b.y - 6 * T.S, z: b.z, r: 14 * T.S, life: 0.4, max: 0.4, fx: T.fx, fz: T.fz });
      sparks(W, b.x, b.y, b.z, 10);
      SFX.play('hit');
    });
    SFX.play('whoosh');
  },
};
// Thunder spears: one, or a pair.
SKILLS.tspear = {
  cast(u, W, T, d, s) {
    const fire = () => {
      if (!u.alive || !T.alive) return;
      const h = u.body.pts[J.RHAND], from = { x: h.x, y: h.y + 4, z: h.z };
      const p = spawnProj(W, 'tspear', from, lead(u, T, PROJ.tspear.speed, GRAV * PROJ.tspear.g, false), u);
      p.dmg = s.dmg || 140; p.knock = 650;
      SFX.play('launch');
    };
    fire();
    for (let i = 1; i < (s.n || 1); i++) later(W, 0.22 * i, fire);
  },
};
SKILLS.awaken = {
  cast(u, W) {
    u.buff = 8; u.hp = Math.min(u.t.hp, u.hp + u.t.hp * 0.3);
    const c = u.body.pts[J.CHEST];
    glowBits(W, c.x, c.y, c.z, 14, ['#ff4d4d', '#ffffff'], 60, 3);
    SFX.play('chime');
  },
};
SKILLS.sasageyo = {
  cast(u, W) {
    for (const a of alliesNear(u, W, u.P.x, u.P.z, 520)) {
      a.inspired = 7;
      a.hp = Math.min(a.t.hp, a.hp + a.t.hp * 0.1);
      if (a.recover < 1) a.recover = 1;
    }
    u.inspired = 7;
    const c = u.body.pts[J.CHEST];
    glowBits(W, c.x, c.y + 20, c.z, 24, ['#ffd166', '#ffffff', '#5fbf5a'], 90, 3.5);
    W.flashes.push({ x: u.P.x, y: 4, z: u.P.z, life: 0.6, max: 0.6, r: 260, heal: true });
    SFX.play('horn');
  },
};
// A signal flare at the target: every ally nearby switches to it.
SKILLS.flare = {
  cast(u, W, T, d, s) {
    const h = u.body.pts[J.RHAND];
    const p = spawnProj(W, 'flare', { x: h.x, y: h.y + 6, z: h.z }, aim(h, { x: T.P.x, y: T.P.y + 120, z: T.P.z }, 520, GRAV * 0.6, true), u);
    p.color = s.smoke || '#5fbf5a';
    for (const a of alliesNear(u, W, u.P.x, u.P.z, 520)) if (!a.t.support && !a.t.heal) { a.target = T; a.retarget = 5; }
    SFX.play('pew');
  },
};
SKILLS.charge = {
  cast(u, W, T, d, s) {
    u.chargeX = (T.P.x - u.P.x) / d; u.chargeZ = (T.P.z - u.P.z) / d;
    u.chargeT = Math.min(1.2, (d + 80) / (s.speed || 520)); u.chargeSp = s.speed || 520;
    u.chargeHit = []; u.chargeDmg = s.dmg; u.chargeKnock = s.knock || 1100;
    SFX.play('roar');
  },
};
SKILLS.harden = {
  cast(u, W, T, d, s) {
    u.hard = s.dur || 3;
    if (s.heal) u.hp = Math.min(u.t.hp, u.hp + u.t.hp * s.heal);
    const c = u.body.pts[J.CHEST];
    glowBits(W, c.x, c.y, c.z, 18, ['#bfe9ff', '#ffffff', '#9fd8ef'], 80, 4 * u.S);
    SFX.play('freeze');
  },
};
// A crystal-hardened fist: through armour, through hardening.
SKILLS.hardpunch = {
  cast(u, W, T, d, s) {
    later(W, (s.lock || 0.5) * 0.5, () => {
      if (!u.alive || !T.alive) return;
      const dx = T.P.x - u.P.x, dz = T.P.z - u.P.z, dd = Math.sqrt(dx * dx + dz * dz) || 1;
      if (dd > (u.t.reach + 30) * u.S * 0.6 + T.r + 40) return;
      const k = s.knock || 1100;
      hurt(T, s.dmg, dx / dd * k, k * 0.5, dz / dd * k, u.P, W, u, PIERCE);
      if (T.hard > 0) T.hard = 0;
      const c = T.body.pts[J.CHEST];
      glowBits(W, c.x, c.y, c.z, 12, ['#bfe9ff', '#ffffff'], 90, 3 * u.S);
      W.shake = Math.max(W.shake, 6);
      SFX.play('thud');
    });
  },
};
// Annie's roundhouse kick: everyone in the arc in front goes flying.
SKILLS.kick = {
  cast(u, W, T, d, s) {
    later(W, 0.25, () => {
      if (!u.alive) return;
      const R0 = (s.r || 60) * u.S * 0.5 + 40;
      for (const e of enemiesNear(u, W, u.P.x + u.fx * R0 * 0.6, u.P.z + u.fz * R0 * 0.6, R0)) {
        const k = s.knock || 1300;
        hurt(e, s.dmg, u.fx * k, k * 0.8, u.fz * k, u.P, W, u, PIERCE);
      }
      if (W.fx) W.fx.push({ kind: 'arc', x: u.P.x, y: u.P.y, z: u.P.z, fx: u.fx, fz: u.fz, r: R0, life: 0.3, max: 0.3, color: '#ffffff' });
      W.shake = Math.max(W.shake, 6);
      SFX.play('thud');
    });
  },
};
SKILLS.crystal = {
  cast(u, W, T, d, s) {
    u.hard = s.dur || 5; u.casting = s.dur || 5; u.crystalT = s.dur || 5;
    later(W, (s.dur || 5) * 0.9, () => { if (u.alive) u.hp = Math.min(u.t.hp, u.hp + u.t.hp * (s.heal || 0.4)); });
    SFX.play('freeze');
  },
};
// Annie's scream: Pure Titans come running from the edge of the field.
SKILLS.scream = {
  cast(u, W, T, d, s) {
    const sg = sideSign(u);
    for (let i = 0; i < (s.n || 2); i++) spawnUnit(W, 'puretitan', sg * (FIELD_X - 40), 80 + R() * (FIELD_Z - 160), u);
    for (const e of enemiesNear(u, W, u.P.x, u.P.z, 160)) if (!e.t.titan) { e.stun = Math.max(e.stun, 0.8); e.act = 'idle'; }
    W.shake = Math.max(W.shake, 5);
    SFX.play('roar');
  },
};
// The Beast Titan's pitch: a whole handful of crushed rock across the enemy lines.
SKILLS.barrage = {
  cast(u, W, T, d, s) {
    later(W, 0.55, () => {
      if (!u.alive) return;
      const h = u.body.pts[J.RHAND], from = { x: h.x, y: h.y + 6 * u.S, z: h.z };
      for (let i = 0; i < (s.n || 14); i++) {
        const tx = T.P.x + RR(-s.spread, s.spread), tz = T.P.z + RR(-s.spread, s.spread);
        const p = spawnProj(W, 'rock', from, aim(from, { x: tx, y: 0, z: tz }, PROJ.rock.speed * RR(0.9, 1.1), GRAV, false), u);
        p.dmg = s.dmg; p.knock = 450;
      }
      W.shake = Math.max(W.shake, 5);
      SFX.play('whoosh'); SFX.play('boom');
    });
  },
};
SKILLS.fastball = {
  cast(u, W, T, d, s) {
    later(W, 0.5, () => {
      if (!u.alive || !T.alive) return;
      const h = u.body.pts[J.RHAND], from = { x: h.x, y: h.y + 6 * u.S, z: h.z };
      const p = spawnProj(W, 'bigrock', from, lead(u, T, PROJ.bigrock.speed, GRAV, false), u);
      p.dmg = s.dmg; p.knock = 800;
      SFX.play('whoosh');
    });
  },
};
// Zeke's scream: people nearby turn into Pure Titans, on his side.
SKILLS.zscream = {
  when: (u, W) => W.units.some(e => e.alive && e.team !== u.team && isHuman(e) && !e.t.immune && (e.P.x - u.P.x) ** 2 + (e.P.z - u.P.z) ** 2 < 600 * 600),
  cast(u, W, T, d, s) {
    later(W, 0.6, () => {
      if (!u.alive) return;
      const near = W.units.filter(e => e.alive && e.team !== u.team && isHuman(e) && !e.t.immune)
        .map(e => ({ e, d: (e.P.x - u.P.x) ** 2 + (e.P.z - u.P.z) ** 2 })).filter(o => o.d < 600 * 600)
        .sort((a, b) => a.d - b.d).slice(0, s.n || 3);
      near.forEach((o, i) => later(W, 0.25 * i, () => { if (o.e.alive) titanize(o.e, u, W); }));
      W.shake = Math.max(W.shake, 6);
      SFX.play('roar');
    });
  },
};
// A person becomes a Pure Titan in a flash of lightning and fights for whoever made it.
function titanize(e, u, W) {
  const x = e.P.x, z = e.P.z, g = groundH(x, z);
  W.bolts.push(boltPath({ x, y: 700, z }, { x, y: g, z }));
  W.flashes.push({ x, y: g + 20, z, life: 0.4, max: 0.4, r: 90, bolt: true });
  W.lost[e.home]++;
  becomeType(e, 'puretitan', W);
  e.home = u.team; e.team = u.team; e.charm = 0; e.owner = u;
  W.total[u.team]++;
  puff(W, x, g + 30, z, 14, '#f4f4f4', 90, 9);
  SFX.play('zap');
}
// Swaps a unit's type in place (no blast): used for Pure Titans and the past Titans.
function becomeType(u, key, W) {
  const t = TYPES[key], x = u.P.x, z = u.P.z;
  if (u.held) dropVictim(u);
  u.key = key; u.t = t; u.S = t.S;
  u.body = standBody(x, z, u.S, u.fx >= 0 ? 1 : -1, t);
  u.hp = t.hp; u.mass = u.S * u.S * (t.heavy || 1); u.r = 9 * u.S * Math.sqrt(t.fat || 1);
  u.armorHP = t.armorHP || 0; u.armorOff = false; u.skT = null; u.lives = t.lives || 0;
  Object.assign(u, { act: 'idle', stun: 0, recover: 0.3, cdT: 0.6, leaping: false, anchored: false, target: null, retarget: 0, casting: 0, hidden: false });
}
// The Cart Titan's panzer unit: a burst of machine-gun fire, or the anti-Titan cannon.
SKILLS.mg = {
  cast(u, W, T, d, s) {
    for (let i = 0; i < (s.n || 10); i++) later(W, 0.09 * i, () => {
      if (!u.alive || !T.alive) return;
      const c = u.body.pts[J.CHEST], from = { x: c.x, y: c.y + 8 * u.S, z: c.z };
      const p = spawnProj(W, 'bullet', from, jitter(lead(u, T, PROJ.bullet.speed, GRAV * PROJ.bullet.g, false), 0.04), u);
      p.dmg = s.dmg || 10; p.knock = 120;
      SFX.play('bang');
    });
  },
};
SKILLS.cannon = {
  cast(u, W, T, d, s) {
    later(W, s.delay || 0.3, () => {
      if (!u.alive || !T.alive) return;
      const c = u.body.pts[J.CHEST], from = { x: c.x + u.fx * 10 * u.S, y: c.y + 10 * u.S, z: c.z + u.fz * 10 * u.S };
      const p = spawnProj(W, 'shell', from, lead(u, T, PROJ.shell.speed, GRAV * PROJ.shell.g, false), u);
      p.dmg = s.dmg || 140; p.knock = 900;
      puff(W, from.x, from.y, from.z, 10, '#e9e4dc', 90, 8);
      SFX.play('boom');
    });
  },
};
// The Jaw: teeth that crack hardened crystal.
SKILLS.crunch = {
  cast(u, W, T, d, s) {
    later(W, 0.22, () => {
      if (!u.alive || !T.alive) return;
      const dx = T.P.x - u.P.x, dz = T.P.z - u.P.z, dd = Math.sqrt(dx * dx + dz * dz) || 1;
      if (dd > u.t.reach * 1.6 + T.r + 20) return;
      hurt(T, s.dmg, dx / dd * 500, 250, dz / dd * 500, u.P, W, u, PIERCE);
      if (T.hard > 0) { T.hard = 0; const c = T.body.pts[J.CHEST]; glowBits(W, c.x, c.y, c.z, 14, ['#bfe9ff', '#ffffff'], 100, 3); }
      if (T.t.armor && !T.armorOff) { T.armorHP -= s.dmg; if (T.armorHP <= 0 && T.alive) breakArmor(T, W); }
      SFX.play('clank');
    });
  },
};
SKILLS.claws = {
  cast(u, W, T, d, s) {
    for (let i = 0; i < 3; i++) later(W, 0.12 + i * 0.13, () => {
      if (!u.alive) return;
      for (const e of enemiesNear(u, W, u.P.x + u.fx * 18 * u.S, u.P.z + u.fz * 18 * u.S, 18 * u.S + 10)) {
        hurt(e, s.dmg, u.fx * 260, 120, u.fz * 260, u.P, W, u);
      }
      SFX.play('hit');
    });
  },
};
SKILLS.dive = {
  cast(u, W, T, d, s) { u.diveT = 1.2; u.diveTarget = T; u.diveDmg = s.dmg; SFX.play('whoosh'); },
};
// War Hammer constructs: a line of crystal spikes bursting out of the ground.
SKILLS.spikes = {
  cast(u, W, T, d, s) {
    const dx = (T.P.x - u.P.x) / d, dz = (T.P.z - u.P.z) / d, n = s.n || 8, step = (d + 60) / n;
    for (let i = 1; i <= n; i++) later(W, 0.25 + i * 0.06, () => {
      if (!u.alive) return;
      const x = u.P.x + dx * step * i, z = u.P.z + dz * step * i, g = groundH(x, z);
      for (const e of enemiesNear(u, W, x, z, 26)) hurt(e, s.dmg, dx * 200, s.knock || 900, dz * 200, null, W, u);
      if (W.fx) W.fx.push({ kind: 'spike', x, y: g, z, h: 70 + R() * 50, tilt: RR(-0.3, 0.3), life: 2.4, max: 2.4 });
      W.shake = Math.max(W.shake, 3);
      if (i % 2) SFX.play('clank');
    });
  },
};
SKILLS.whammer = {
  cast(u, W, T, d, s) {
    if (W.fx) W.fx.push({ kind: 'hammer', u, life: 0.9, max: 0.9 });
    later(W, 0.45, () => {
      if (!u.alive) return;
      const R0 = 30 * u.S, cx = u.P.x + u.fx * 34 * u.S, cz = u.P.z + u.fz * 34 * u.S;
      for (const e of enemiesNear(u, W, cx, cz, R0)) shove(e, u.P.x, u.P.z, s.knock || 1100, (s.knock || 1100) * 0.6, W, u, s.dmg, PIERCE);
      W.flashes.push({ x: cx, y: groundH(cx, cz) + 4, z: cz, life: 0.4, max: 0.4, r: R0 * 1.2, bolt: true });
      puff(W, cx, groundH(cx, cz) + 4, cz, 16, '#cfe7f5', 120, 9);
      W.shake = Math.max(W.shake, 9);
      SFX.play('slam'); SFX.play('clank');
    });
  },
};
// A crystal crossbow the size of a house; the bolt goes through a whole line.
SKILLS.crossbow = {
  cast(u, W, T, d, s) {
    const dx = (T.P.x - u.P.x) / d, dz = (T.P.z - u.P.z) / d;
    if (W.fx) W.fx.push({ kind: 'crossbow', u, dx, dz, life: s.lock || 1.4, max: s.lock || 1.4 });
    later(W, (s.lock || 1.4) * 0.72, () => {
      if (!u.alive) return;
      const c = u.body.pts[J.CHEST];
      for (const e of enemiesOnLine(u, W, u.P.x, u.P.z, dx, dz, 800, 22)) hurt(e, s.dmg, dx * 900, 250, dz * 900, null, W, u, PIERCE);
      if (W.fx) W.fx.push({ kind: 'bolt', x: c.x, y: c.y, z: c.z, dx, dz, life: 0.5, max: 0.5 });
      W.shake = Math.max(W.shake, 6);
      SFX.play('twang'); SFX.play('clank');
    });
  },
};
// The Colossal Titan of 845: gone as suddenly as it came.
SKILLS.vanish = {
  cast(u, W) {
    const c = u.body.pts[J.CHEST];
    puff(W, c.x, c.y, c.z, 40, '#f4f4f4', 260, 30);
    puff(W, u.P.x, 60, u.P.z, 20, '#f4f4f4', 200, 26);
    callout(W, u, 'IT VANISHED...', '#d8d4cc');
    u.vanished = true;
    kill(u, W, null);
    SFX.play('sizzle');
  },
};
SKILLS.steam = {
  cast(u, W, T, d, s) { u.steamT = s.dur || 3; u.steamTick = 0; SFX.play('sizzle'); },
};
SKILLS.sweep = {
  cast(u, W, T, d, s) {
    later(W, (s.lock || 1.2) * 0.5, () => {
      if (!u.alive) return;
      const R0 = 50 * u.S * 0.6;
      for (const e of enemiesNear(u, W, u.P.x + u.fx * R0 * 0.6, u.P.z + u.fz * R0 * 0.6, R0)) shove(e, u.P.x, u.P.z, s.knock || 1300, 700, W, u, s.dmg);
      W.shake = Math.max(W.shake, 10);
      SFX.play('whoosh'); SFX.play('thud');
    });
  },
};
// Bertholdt kicks in the gate: a shower of rubble over the enemy's back lines.
SKILLS.gatekick = {
  cast(u, W, T, d, s) {
    later(W, 0.5, () => {
      if (!u.alive) return;
      const f = u.body.pts[J.RFOOT], from = { x: f.x + u.fx * 20 * u.S, y: f.y + 30 * u.S, z: f.z + u.fz * 20 * u.S };
      for (let i = 0; i < (s.n || 8); i++) {
        const tx = T.P.x + RR(-180, 180), tz = T.P.z + RR(-160, 160);
        const p = spawnProj(W, 'bigrock', from, aim(from, { x: tx, y: 0, z: tz }, (s.speed || PROJ.bigrock.speed) * RR(0.85, 1.15), GRAV, true), u);
        p.dmg = s.dmg; p.knock = 600;
      }
      W.shake = Math.max(W.shake, 12);
      SFX.play('boom');
    });
  },
};
// Armin's second transformation: the whole Titan goes off again.
SKILLS.renuke = {
  cast(u, W, T, d, s) {
    const x = u.P.x, z = u.P.z, g = groundH(x, z), R0 = s.r || 260;
    W.bolts.push(boltPath({ x, y: 1400, z }, { x, y: g, z }));
    W.flashes.push({ x, y: g + 40, z, life: 1, max: 1, r: R0 * 1.6, bolt: true });
    for (const e of W.units) {
      if (!e.alive || e === u || e.burrow) continue;
      const dx = e.P.x - x, dz = e.P.z - z, dd = Math.sqrt(dx * dx + dz * dz) || 1;
      if (dd > R0 + e.r) continue;
      const f = 1 - dd / (R0 + e.r) * 0.6;
      hurt(e, s.dmg * f, dx / dd * 1400 * f, 800 * f, dz / dd * 1400 * f, null, W, u, BLAST);
    }
    u.hp = Math.min(u.t.hp, u.hp + u.t.hp * 0.3);
    W.shake = Math.max(W.shake, 26);
    puff(W, x, g + 60, z, 40, '#f4f4f4', 300, 22);
    SFX.play('boom'); SFX.play('specium');
  },
};
// The Founder: the Rumbling, the past Titans, bone Titans, and command over Titans themselves.
SKILLS.rumbling = {
  when: (u, W) => W_count(u, W, 'walltitan') < 2,
  cast(u, W, T, d, s) {
    const sg = sideSign(u);
    for (let i = 0; i < (s.n || 2); i++) spawnUnit(W, 'walltitan', sg * (FIELD_X + 20), Math.max(40, Math.min(FIELD_Z - 40, T.P.z + (i - 0.5) * 220 + RR(-40, 40))), u);
    W.shake = Math.max(W.shake, 14);
    SFX.play('roar');
  },
};
SKILLS.pastcall = {
  when: (u, W) => W_count(u, W, null, true) < 2,
  cast(u, W, T, d, s) {
    for (let i = 0; i < (s.n || 2); i++) {
      const a = R() * TAU, x = u.P.x + dcos(a) * 160, z = clamp(u.P.z + dsin(a) * 160, 30, FIELD_Z - 30);
      const n = spawnUnit(W, PAST_FORMS[Math.floor(R() * PAST_FORMS.length)], x, z, u);
      W.bolts.push(boltPath({ x, y: 600, z }, { x, y: groundH(x, z), z }));
      puff(W, x, 40, z, 14, '#dfe8ff', 80, 10);
      n.recover = 0.4;
    }
    SFX.play('zap');
  },
};
SKILLS.bonecall = {
  when: (u, W) => W_count(u, W, 'bonetitan') < 4,
  cast(u, W, T, d, s) {
    for (let i = 0; i < (s.n || 3); i++) {
      const a = R() * TAU, x = u.P.x + dcos(a) * 120, z = clamp(u.P.z + dsin(a) * 120, 30, FIELD_Z - 30);
      spawnUnit(W, 'bonetitan', x, z, u);
      puff(W, x, 10, z, 10, '#e8e2d4', 70, 8);
    }
    SFX.play('clank');
  },
};
// The Coordinate: mindless Titans near the Founder fight for him for a while. (The Nine's holders keep their own minds.)
const mindless = e => e.t.titan && !e.t.colossal && !e.shifted && !e.t.skills;
SKILLS.coordinate = {
  when: (u, W) => W.units.some(e => e.alive && e.team !== u.team && mindless(e) && (e.P.x - u.P.x) ** 2 + (e.P.z - u.P.z) ** 2 < 700 * 700),
  cast(u, W, T, d, s) {
    const near = W.units.filter(e => e.alive && e.team !== u.team && mindless(e))
      .map(e => ({ e, d: (e.P.x - u.P.x) ** 2 + (e.P.z - u.P.z) ** 2 })).filter(o => o.d < 700 * 700).sort((a, b) => a.d - b.d).slice(0, s.n || 2);
    for (const o of near) {
      o.e.charmCool = 0; charm(o.e, u.team, s.dur || 7, W);
      const h = o.e.body.pts[J.HEAD];
      W.bolts.push(boltPath({ x: u.P.x, y: u.body.pts[J.HEAD].y, z: u.P.z }, h));
    }
    SFX.play('zap');
  },
};
SKILLS.pathsheal = {
  cast(u, W) {
    for (const e of W.units) {
      if (!e.alive || e.team !== u.team || !e.t.titan) continue;
      e.hp = Math.min(e.t.hp, e.hp + e.t.hp * (e === u ? 0.04 : 0.25));
      const c = e.body.pts[J.CHEST];
      puff(W, c.x, c.y, c.z, 6, '#f4f4f4', 50, 5 * e.S);
    }
    glowBits(W, u.P.x, u.body.pts[J.HEAD].y, u.P.z, 30, ['#dfe8ff', '#9fd8ef', '#ffffff'], 140, 6);
    SFX.play('chime');
  },
};
// How many of u's summons of a kind are still standing.
function W_count(u, W, key, past) {
  let n = 0;
  for (const e of W.units) if (e.alive && e.owner === u && (past ? e.t.past : e.key === key)) n++;
  return n;
}
// Airships: a bomb run over the target, or paratroopers.
SKILLS.bombrun = {
  walk: true,
  cast(u, W, T, d, s) {
    for (let i = 0; i < (s.n || 6); i++) later(W, 0.15 * i, () => {
      if (!u.alive) return;
      const c = u.body.pts[J.PELVIS];
      const p = spawnProj(W, 'bomb', { x: c.x + RR(-15, 15), y: c.y - 20 * u.S, z: c.z + RR(-15, 15) }, { x: (c.x - c.px) / DT, y: -40, z: (c.z - c.pz) / DT }, u);
      p.dmg = s.dmg || 80; p.knock = 650;
      SFX.play('whoosh');
    });
  },
};
SKILLS.paradrop = {
  cast(u, W, T, d, s) {
    for (let i = 0; i < (s.n || 4); i++) later(W, 0.3 * i, () => {
      if (!u.alive) return;
      const c = u.body.pts[J.PELVIS];
      // Paratroopers from the airship's own side: Survey Corps with thunder spears, or Marleyan riflemen.
      const corps = W.units.some(e => e.alive && e.team === u.team && (e.t.odm || e.key === 'erenwh' || e.key === 'eren'));
      const n = spawnUnit(W, corps ? 'thunder' : 'marley', c.x + RR(-20, 20), c.z + RR(-20, 20), u);
      const lift = c.y - 30 * u.S - groundH(n.P.x, n.P.z);
      for (const q of n.body.pts) { q.y += lift; q.py += lift; }
      n.recover = 0;
      SFX.play('whoosh');
    });
  },
};
SKILLS.potato = {
  cast(u) { u.hp = Math.min(u.t.hp, u.hp + u.t.hp * 0.45); SFX.play('splat'); },
};
SKILLS.firevolley = {
  cast(u, W, T, d, s) {
    for (let i = 0; i < (s.n || 3); i++) later(W, 0.15 * i, () => {
      if (!u.alive || !T.alive) return;
      const a = u.body.pts[J.LHAND];
      const p = spawnProj(W, 'firearrow', a, jitter(lead(u, T, PROJ.firearrow.speed, GRAV, false), 0.05), u);
      p.dmg = s.dmg || 30; p.knock = 200;
      SFX.play('twang');
    });
  },
};
SKILLS.atrifle = {
  when: (u, W, T) => !!T.t.titan,
  cast(u, W, T, d, s) {
    later(W, 0.45, () => {
      if (!u.alive || !T.alive) return;
      const h = u.body.pts[J.LHAND], th = T.body.pts[J.HEAD];
      const v = aim(h, th, PROJ.atrifle.speed, GRAV * PROJ.atrifle.g, false);
      const p = spawnProj(W, 'atrifle', h, v, u);
      p.dmg = s.dmg || 150; p.knock = 400;
      puff(W, h.x, h.y, h.z, 6, '#e9e4dc', 60, 5);
      SFX.play('boom');
    });
  },
};
SKILLS.grenade = {
  cast(u, W, T, d, s) {
    later(W, 0.35, () => {
      if (!u.alive || !T.alive) return;
      const h = u.body.pts[J.RHAND];
      const p = spawnProj(W, 'grenade', h, aim(h, T.P, PROJ.grenade.speed, GRAV, true), u);
      p.dmg = s.dmg || 70; p.knock = 600;
      SFX.play('whoosh');
    });
  },
};
// Speeches: Willy Tybur's declaration of war, Pixis, Jean.
SKILLS.speech = {
  cast(u, W, T, d, s) {
    for (const a of alliesNear(u, W, u.P.x, u.P.z, s.r || 500)) {
      a.inspired = Math.max(a.inspired, s.dur || 8);
      if (s.heal) a.hp = Math.min(a.t.hp, a.hp + a.t.hp * s.heal);
    }
    const c = u.body.pts[J.CHEST];
    glowBits(W, c.x, c.y + 20, c.z, 18, ['#ffd166', '#ffffff'], 80, 3);
    SFX.play(s.sound || 'horn');
  },
};
SKILLS.roar = {
  cast(u, W) {
    for (const e of enemiesNear(u, W, u.P.x, u.P.z, 60 * u.S)) if (!e.t.titan && !e.t.steadfast) { e.stun = Math.max(e.stun, 0.9); e.act = 'idle'; }
    W.shake = Math.max(W.shake, 8);
    W.flashes.push({ x: u.P.x, y: 6, z: u.P.z, life: 0.35, max: 0.35, r: 60 * u.S });
    SFX.play('roar');
  },
};
SKILLS.rage = {
  cast(u, W) { u.buff = 8; const h = u.body.pts[J.HEAD]; puff(W, h.x, h.y, h.z, 16, '#f4f4f4', 90, 6 * u.S); SFX.play('roar'); },
};
// Abnormals: sudden lunges at whoever they fancy.
SKILLS.deviant = {
  cast(u, W) {
    const opts = W.units.filter(e => e.alive && e.team !== u.team && !e.burrow && (e.P.x - u.P.x) ** 2 + (e.P.z - u.P.z) ** 2 < 500 * 500);
    if (!opts.length) return;
    const T = opts[Math.floor(R() * opts.length)];
    u.target = T; u.retarget = 3;
    const d = Math.sqrt((T.P.x - u.P.x) ** 2 + (T.P.z - u.P.z) ** 2);
    if (d > 90 && d < 450 && !u.leaping) leap(u, T, d);
  },
};
// Hange: harpoon nets pin a Titan in place; and when it comes to it, her last stand.
SKILLS.net = {
  when: (u, W, T) => !!T.t.titan && !T.t.colossal,
  cast(u, W, T, d, s) {
    later(W, 0.3, () => {
      if (!T.alive) return;
      T.frozen = Math.max(T.frozen, s.dur || 3);
      if (W.fx) W.fx.push({ kind: 'net', T, life: s.dur || 3, max: s.dur || 3 });
      SFX.play('clack');
    });
  },
};
SKILLS.laststand = {
  cast(u, W) { u.buff = 12; u.burnT = 12; u.hp = Math.min(u.t.hp, u.hp + u.t.hp * 0.3); SFX.play('roar'); },
};

// ---------- death and start hooks ----------
// Reiner always seems to survive: the Armoured Titan falls, and Reiner climbs out of the nape.
DEATHS.eject = (e, W) => {
  if (e.vanished) return;
  const n = spawnUnit(W, 'reinerhuman', e.P.x - e.fx * 30, e.P.z - e.fz * 30, e);
  W.total[e.home]--;   // still the same Reiner
  n.owner = null; n.recover = 0; n.stun = 1;
  callout(W, n, '...STILL ALIVE', '#d8d4cc');
};
// Lara Tybur's real body sleeps in a crystal under the stage; while it lasts, the War Hammer Titan re-forms once.
STARTS.lara = (u, W) => {
  const c = spawnUnit(W, 'lcocoon', u.P.x - u.fx * 150, clamp(u.P.z - u.fz * 150, 30, FIELD_Z - 30), u);
  W.total[u.home]--;
  u.cocoon = c;
};
DEATHS.warhammer = (e, W) => {
  const c = e.cocoon;
  if (!c || !c.alive || e.lives <= 0) return;
  e.lives--;
  later(W, 2.2, () => {
    if (!c.alive) return;
    W.lost[e.home]--;
    e.alive = true; e.act = 'idle'; e.vanished = false;
    becomeType(e, e.key, W);
    e.hp = e.t.hp * 0.6; e.lives = 0;
    W.bolts.push(boltPath({ x: c.P.x, y: 10, z: c.P.z }, e.body.pts[J.CHEST]));
    glowBits(W, e.P.x, 60, e.P.z, 24, ['#bfe9ff', '#ffffff'], 100, 5);
    callout(W, e, 'THE WAR HAMMER REFORMS', '#bfe9ff');
    SFX.play('freeze');
  });
};
// When the Founder falls, the Rumbling stops: every Wall Titan, bone Titan and past Titan on his side crumbles.
DEATHS.founder = (e, W) => {
  callout(W, e, 'THE RUMBLING STOPS', '#ffd9a0', true);
  W.shake = Math.max(W.shake, 20);
  let i = 0;
  for (const u of W.units) {
    if (!u.alive || u.home !== e.home || !(u.key === 'walltitan' || u.key === 'bonetitan' || u.t.past)) continue;
    later(W, 0.4 + 0.25 * i++, () => {
      if (!u.alive) return;
      const c = u.body.pts[J.CHEST];
      puff(W, c.x, c.y, c.z, 22, '#f4f4f4', 160, 12 * u.S);
      u.vanished = true;
      kill(u, W, null);
    });
  }
  SFX.play('sizzle');
};
DEATHS.willy = (e, W) => {
  for (const a of alliesNear(e, W, e.P.x, e.P.z, 700)) a.inspired = Math.max(a.inspired, 10);
};
DEATHS.bones = (e, W) => {
  const c = e.body.pts[J.CHEST];
  puff(W, c.x, c.y, c.z, 14, '#e8e2d4', 90, 6 * e.S);
};
// A purchased Past Titan is one of the Nine, picked at random from the Paths.
STARTS.past = (u, W) => {
  becomeType(u, PAST_FORMS[Math.floor(R() * PAST_FORMS.length)], W);
  W.bolts.push(boltPath({ x: u.P.x, y: 600, z: u.P.z }, { x: u.P.x, y: groundH(u.P.x, u.P.z), z: u.P.z }));
};

// ---------- units ----------
const ODM = { leap: true, leapMax: 380, leapFlight: 0.6, slam: 30, slamR: 45, odm: true, climb: 140, human: true, tick: 'aot' };
const SHIFTER = { titan: true, tick: 'aot' };
const T_ = (o, ...mix) => Object.assign({ block: 0, weapon: 'none', anim: 0.6 }, ...mix, o);
Object.assign(TYPES, {
  // ----- Paradis: Survey Corps, Garrison -----
  garrison: T_({ name: 'Garrison Soldier', cost: 140, hp: 100, S: 1, speed: 54, reach: 32, dmg: 22, cd: 0.9, knock: 200, style: 'dual', weapon: 'blades', hat: 'garrison', dodge: 0.1, slayer: 2, leapMax: 300,
    blurb: 'Wall Rose Garrison. ODM gear and blades; better on the walls than in a fight, but they hold the line.' }, ODM),
  thunder: T_({ name: 'Thunder Spear Trooper', cost: 300, hp: 110, S: 1, speed: 56, range: 320, dmg: 150, cd: 4.5, knock: 650, slayer: 2, dodge: 0.25, style: 'throw', proj: 'tspear', weapon: 'tspear', hat: 'thunder', anim: 0.8, leap: false,
    blurb: 'Survey Corps, year 854. Thunder spears: a harpoon that bites in and then explodes, straight through armour and hardening.' }, ODM),
  levi: T_({ name: 'Levi Ackerman', cost: 1300, hp: 230, hunter: true, S: 0.95, speed: 72, reach: 34, dmg: 34, cd: 0.55, knock: 220, style: 'dual', weapon: 'blades', hat: 'levi', dodge: 0.45, slayer: 4, immune: true, leapMax: 440,
    skills: [{ id: 'spin', cd: 6, range: 260, min: 40, lock: 0.5, dmg: 55 }, { id: 'nape', cd: 7, range: 320, dmg: 140, lock: 0.45 }, { id: 'tspear', cd: 14, first: 4, range: 380, min: 80, lock: 0.4, pose: 'point', dmg: 150 }],
    blurb: 'Humanity\'s strongest soldier. Spinning ODM strikes, straight for the nape, quadruple damage to Titans; dodges almost everything.' }, ODM),
  mikasa: T_({ name: 'Mikasa Ackerman', cost: 1100, hp: 190, hunter: true, S: 0.97, speed: 70, reach: 34, dmg: 30, cd: 0.6, knock: 220, style: 'dual', weapon: 'blades', hat: 'mikasa', dodge: 0.35, slayer: 3.5, immune: true, buffDmg: 1.6, buffSpeed: 1.3,
    skills: [{ id: 'spin', cd: 7, range: 240, min: 40, lock: 0.5, dmg: 45 }, { id: 'tspear', cd: 11, first: 3, range: 360, min: 80, lock: 0.5, pose: 'point', n: 2, dmg: 140 }, { id: 'awaken', hp: 0.5, once: true, lock: 0.3, call: 'I CAN FIGHT!', color: '#ff6b6b' }],
    blurb: 'An Ackerman. Spins, thunder spears, and when she\'s hurt, her strength awakens.' }, ODM),
  hange: T_({ name: 'Hange Zoë', cost: 650, hp: 140, hunter: true, S: 1, speed: 62, reach: 32, dmg: 22, cd: 0.8, knock: 200, style: 'dual', weapon: 'blades', hat: 'hange', slayer: 3, buffDmg: 2,
    skills: [{ id: 'net', cd: 14, first: 3, range: 300, lock: 0.5, pose: 'point', dur: 3, call: 'CAPTURE!', color: '#ffd166' }, { id: 'tspear', cd: 12, range: 340, min: 80, lock: 0.5, pose: 'point', n: 2, dmg: 120 },
      { id: 'laststand', hp: 0.35, once: true, lock: 0.4, call: 'THE 14TH COMMANDER!', color: '#ffb347' }],
    blurb: 'Commander and mad scientist: harpoon nets pin Titans in place. Her last stand sets her alight, still fighting.' }, ODM),
  erwin: T_({ name: 'Erwin Smith', cost: 900, hp: 170, S: 1.05, speed: 95, reach: 40, dmg: 30, cd: 0.9, knock: 300, style: 'chop', weapon: 'sword', hat: 'erwin', mount: true, horse: true, oneArm: true, human: true, tick: 'aot',
    skills: [{ id: 'sasageyo', cd: 16, first: 1.5, lock: 0.8, pose: 'raise', call: 'SASAGEYO!', color: '#ffd166', big: true }, { id: 'flare', cd: 10, first: 3, range: 600, lock: 0.4, pose: 'raise', smoke: '#5fbf5a' }],
    blurb: 'Thirteenth Commander, one arm, on horseback. "Dedicate your hearts!": the whole army fights harder; signal flares make everyone focus one target.' }),
  jean: T_({ name: 'Jean Kirstein', cost: 420, hp: 130, S: 1, speed: 60, reach: 32, dmg: 26, cd: 0.75, knock: 200, style: 'dual', weapon: 'blades', hat: 'jean', slayer: 3,
    skills: [{ id: 'tspear', cd: 12, first: 5, range: 340, min: 80, lock: 0.5, pose: 'point', dmg: 130 }, { id: 'speech', cd: 18, first: 2, lock: 0.5, pose: 'raise', r: 250, dur: 5, call: 'FOLLOW ME!', color: '#9fe8ff' }],
    blurb: 'Not a hero, a leader: rallies the soldiers around him. Thunder spears in a pinch.' }, ODM),
  connie: T_({ name: 'Connie Springer', cost: 360, hp: 115, S: 0.95, speed: 64, reach: 32, dmg: 25, cd: 0.7, knock: 200, style: 'dual', weapon: 'blades', hat: 'connie', dodge: 0.3, slayer: 3,
    skills: [{ id: 'tspear', cd: 12, first: 4, range: 340, min: 80, lock: 0.5, pose: 'point', dmg: 130 }],
    blurb: 'Quick, scrappy and hard to hit.' }, ODM),
  sasha: T_({ name: 'Sasha Braus', cost: 420, hp: 105, S: 0.97, speed: 60, range: 420, dmg: 26, cd: 1.8, knock: 160, style: 'bow', weapon: 'bow', hat: 'sasha', dodge: 0.2, leap: false,
    skills: [{ id: 'firevolley', cd: 9, range: 440, min: 60, lock: 0.6, pose: 'point', n: 3, dmg: 34 }, { id: 'potato', hp: 0.5, once: true, lock: 0.8, pose: 'head', call: 'POTATO!', color: '#e8c98f' }],
    blurb: 'The Survey Corps\' best shot: fire-arrow volleys from the rooftops, and a potato for emergencies.' }, ODM),
  pixis: T_({ name: 'Commander Pixis', cost: 450, hp: 120, S: 1.05, speed: 46, auraR: 220, dmg: 0, cd: 4, knock: 0, style: 'aura', aura: 'inspire', support: true, hat: 'pixis', human: true, tick: 'aot',
    skills: [{ id: 'speech', cd: 20, first: 1, lock: 1, pose: 'raise', r: 600, dur: 8, heal: 0.15, call: 'THOSE WHO WISH TO LEAVE, LEAVE!', color: '#ffd166' }],
    blurb: 'Commander of the Southern Garrison. His speech keeps the whole army in the fight.' }),
  cannon: T_({ name: 'Wall Cannon', cost: 380, hp: 260, S: 1, speed: 0, range: 650, dmg: 70, cd: 3.4, knock: 700, style: 'gun', proj: 'cannon', body: 'cannon', heavy: 5, steadfast: true,
    blurb: 'A Garrison cannon on a carriage. Slow, long range, can\'t move.' }),
  // ----- Marley -----
  marley: T_({ name: 'Marleyan Soldier', cost: 80, hp: 60, S: 1, speed: 50, range: 380, dmg: 18, cd: 2.2, knock: 140, style: 'gun', proj: 'bullet', weapon: 'rifle', hat: 'marley', human: true,
    blurb: 'Rifle, helmet, bayonet. Cheap, and there are always more.' }),
  gabi: T_({ name: 'Gabi Braun', cost: 380, hp: 75, S: 0.78, speed: 62, range: 400, dmg: 22, cd: 1.6, knock: 160, style: 'gun', proj: 'bullet', weapon: 'rifle', hat: 'gabi', dodge: 0.25, human: true, tick: 'aot',
    skills: [{ id: 'atrifle', cd: 8, first: 3, range: 520, lock: 0.7, pose: 'point', dmg: 160 }, { id: 'grenade', cd: 9, range: 260, min: 60, lock: 0.5, pose: 'throw', dmg: 70 }],
    blurb: 'Warrior candidate. Her anti-Titan rifle knocks Titans off their feet; grenades for everyone else.' }),
  willy: T_({ name: 'Willy Tybur', cost: 300, hp: 80, S: 1.02, speed: 44, auraR: 180, dmg: 0, cd: 3, knock: 0, style: 'aura', aura: 'inspire', support: true, hat: 'willy', human: true, onDeath: 'willy', tick: 'aot',
    skills: [{ id: 'speech', cd: 30, first: 1, lock: 1.4, pose: 'raise', r: 700, dur: 10, call: 'I DECLARE WAR!', color: '#ff6b6b', sound: 'horn' }],
    blurb: 'The Tybur family\'s head. Declares war on Paradis; if he falls, all of Marley fights harder.' }),
  artillery: T_({ name: 'Anti-Titan Artillery', cost: 650, hp: 320, S: 1.1, speed: 0, range: 820, dmg: 150, cd: 4.6, knock: 900, style: 'gun', proj: 'shell', body: 'artillery', heavy: 6, steadfast: true,
    blurb: 'Marley\'s big gun. Armour-piercing shells from across the field; can\'t move.' }),
  airship: T_({ name: 'Airship', cost: 1500, hp: 900, S: 2.6, speed: 70, range: 60, dmg: 0, cd: 99, knock: 0, style: 'none', body: 'airship', fly: 230, heavy: 3, steadfast: true, tick: 'aot',
    skills: [{ id: 'bombrun', cd: 5, range: 80, lock: 0.9, n: 6, dmg: 85, walk: true }, { id: 'paradrop', cd: 18, first: 2, range: 260, lock: 1.2, n: 4, unit: 'marley', call: 'DROP!', color: '#d8d4cc' }],
    blurb: 'A Marleyan airship. Only rifles, spears, arrows and ODM can reach it; it bombs from above and drops paratroopers.' }),
  // ----- the Nine Titans' holders (they shift when the fight starts) -----
  reiner: T_({ name: 'Reiner Braun', cost: 1500, hp: 120, S: 1.05, speed: 54, reach: 30, dmg: 22, cd: 0.9, knock: 220, style: 'punch', hat: 'reiner', human: true, shift: 'armored', shiftNow: true, shiftDelay: 1.5, shiftCall: 'I\'M THE ARMORED TITAN', shiftColor: '#e8e2cf', tick: 'aot',
    blurb: 'Marley\'s Warrior. Becomes the Armoured Titan: plates that shrug off blades (only thunder spears, jaws and hardened fists break them), a battering-ram charge, and he always crawls out of the nape alive.' }),
  bertholdt: T_({ name: 'Bertholdt Hoover', cost: 1900, hp: 100, S: 1.15, speed: 52, reach: 30, dmg: 20, cd: 1, knock: 200, style: 'punch', hat: 'bertholdt', human: true, shift: 'colossalB', shiftNow: true, shiftDelay: 1, shiftCall: null, tick: 'aot',
    blurb: 'Becomes the Colossal Titan: 60 metres tall. The transformation is a blast that levels everything nearby, friend or foe; then steam, sweeping arms, and the kick that broke the gate.' }),
  kicker: T_({ name: 'Colossal Titan (845)', cost: 900, hp: 100, S: 1.15, speed: 52, reach: 30, dmg: 20, cd: 1, knock: 200, style: 'punch', hat: 'bertholdt', human: true, shift: 'colossalK', shiftNow: true, shiftDelay: 0.6, shiftCall: null, tick: 'aot',
    blurb: 'The day the Wall fell: the Colossal Titan appears in a bolt of lightning, kicks in the gate (a hail of rubble across the whole enemy army), then vanishes in steam.' }),
  armin: T_({ name: 'Armin Arlert', cost: 2100, hp: 90, S: 0.95, speed: 54, reach: 28, dmg: 16, cd: 1, knock: 160, style: 'punch', hat: 'armin', human: true, shift: 'colossalA', shiftNow: true, shiftDelay: 1.2, shiftCall: null, tick: 'aot',
    blurb: 'Year 854: the Colossal Titan, and the biggest transformation blast of all (it took out Marley\'s fleet). When his Titan is nearly gone, he goes off a second time.' }),
  annie: T_({ name: 'Annie Leonhart', cost: 1400, hp: 120, S: 0.92, speed: 60, reach: 28, dmg: 26, cd: 0.7, knock: 300, style: 'punch', hat: 'annie', human: true, dodge: 0.3, shift: 'female', shiftNow: true, shiftDelay: 2, shiftCall: null, tick: 'aot',
    blurb: 'Becomes the Female Titan: fast, martial-arts kicks with hardened shins, a scream that calls Pure Titans, and a crystal cocoon when it\'s all going wrong.' }),
  zeke: T_({ name: 'Zeke Yeager', cost: 2000, hp: 110, S: 1.05, speed: 50, range: 300, dmg: 20, cd: 1.5, knock: 300, style: 'throw', proj: 'boulder', hat: 'zeke', human: true, shift: 'beast', shiftNow: true, shiftDelay: 1, shiftCall: null, tick: 'aot',
    blurb: 'The Beast Titan: a huge ape with a pitcher\'s arm. Crushed rock across the whole field, fastballs, and a scream that turns people into Pure Titans on his side.' }),
  pieck: T_({ name: 'Pieck Finger', cost: 1150, hp: 100, S: 0.95, speed: 50, range: 300, dmg: 16, cd: 1.6, knock: 120, style: 'gun', proj: 'bullet', weapon: 'rifle', hat: 'pieck', human: true, shift: 'cart', shiftNow: true, shiftDelay: 1.5, shiftCall: null, tick: 'aot',
    blurb: 'The Cart Titan: four legs, tireless, with Marley\'s panzer unit on its back: machine guns and an anti-Titan cannon.' }),
  porco: T_({ name: 'Porco Galliard', cost: 1050, hp: 110, S: 1, speed: 56, reach: 30, dmg: 22, cd: 0.8, knock: 220, style: 'punch', hat: 'porco', human: true, shift: 'jaw', shiftNow: true, shiftDelay: 1.5, shiftCall: null, tick: 'aot',
    blurb: 'The Jaw Titan: small, very fast, and its bite cracks hardened crystal and armour plates.' }),
  falco: T_({ name: 'Falco Grice', cost: 1300, hp: 80, S: 0.8, speed: 60, reach: 26, dmg: 16, cd: 0.9, knock: 160, style: 'punch', hat: 'falco', human: true, shift: 'jawbird', shiftNow: true, shiftDelay: 1.5, shiftCall: null, tick: 'aot',
    blurb: 'Falco\'s Jaw Titan has wings: it flies over everything and dives on its prey.' }),
  // ----- Eren, in three stages -----
  erenwh: T_({ name: 'Eren (War Hammer)', cost: 2600, hp: 140, S: 1, speed: 52, reach: 30, dmg: 22, cd: 0.9, knock: 220, style: 'punch', hat: 'eren4', human: true, shift: 'attackwh', shiftNow: true, shiftDelay: 1.2, shiftCall: 'MY WAR', shiftColor: '#bfe9ff', tick: 'aot',
    blurb: 'Year 854. The Attack Titan with the War Hammer\'s crystal: spikes from the ground, a crystal crossbow, a hammer, hardened fists, and a crystal shell.' }),
  erenfounder: T_({ name: 'Eren (Founder)', cost: 4800, hp: 140, S: 1, speed: 52, reach: 30, dmg: 22, cd: 0.9, knock: 220, style: 'punch', hat: 'eren4', human: true, shift: 'founder', shiftNow: true, shiftDelay: 1.5, shiftCall: 'THE RUMBLING', shiftColor: '#ffb347', tick: 'aot',
    blurb: 'The Founding Titan: a skeleton of a giant. Calls the Wall Titans, the past Titans and bone Titans, takes control of enemy Titans, and heals his own. Kill him and the Rumbling stops: all of them crumble.' }),
  // ----- Titan forms (from shifting, summoning and the Paths) -----
  armored: T_({ name: 'Armored Titan', cost: 0, hp: 1500, S: 2.9, speed: 105, reach: 52, dmg: 75, cd: 1.3, knock: 850, style: 'punch', hat: 'armored', aoe: true, heavy: 2, steadfast: true, regen: 5,
    armor: 0.65, armorHP: 380, onDeath: 'eject', lives: 1,
    skills: [{ id: 'charge', cd: 9, first: 2, range: 520, min: 110, lock: 1.1, pose: 'guard', dmg: 70, knock: 1100, speed: 540 }, { id: 'harden', cd: 16, hp: 0.6, lock: 0.6, pose: 'guard', dur: 3, heal: 0.1 }, { id: 'hardpunch', cd: 7, range: 100, lock: 0.6, pose: 'chop', dmg: 140, knock: 1100 }],
    blurb: 'Armour plates all over.' }, SHIFTER),
  colossalB: T_({ name: 'Colossal Titan', cost: 0, hp: 3800, S: 6.5, speed: 38, reach: 110, dmg: 140, cd: 3, knock: 1300, style: 'punch', hat: 'colossal', aoe: true, colossal: true, stomp: true, stompDmg: 70, fat: 1.1, heavy: 1.2,
    blast: [260, 170, 1300, true],
    skills: [{ id: 'steam', cd: 13, range: 260, lock: 0.6, dur: 3 }, { id: 'sweep', cd: 7, range: 220, lock: 1.2, pose: 'chop', dmg: 140, knock: 1300 }, { id: 'gatekick', cd: 15, first: 4, range: 950, min: 250, lock: 1, n: 8, dmg: 90 }],
    blurb: 'Sixty metres of skinless muscle and steam.' }, SHIFTER),
  colossalK: T_({ name: 'Colossal Titan', cost: 0, hp: 3800, S: 6.5, speed: 20, reach: 110, dmg: 140, cd: 3, knock: 1300, style: 'punch', hat: 'colossal', aoe: true, colossal: true, fat: 1.1, heavy: 1.2,
    blast: [240, 150, 1200, true],
    skills: [{ id: 'gatekick', first: 1.4, cd: 99, once: true, lock: 1.2, n: 14, dmg: 90, speed: 1150 }, { id: 'vanish', first: 7, cd: 99, once: true, lock: 0.3 }],
    blurb: 'Sixty metres of steam, for a moment.' }, SHIFTER),
  colossalA: T_({ name: 'Colossal Titan (Armin)', cost: 0, hp: 3200, S: 6.2, speed: 40, reach: 110, dmg: 130, cd: 3, knock: 1300, style: 'punch', hat: 'colossalA', aoe: true, colossal: true, stomp: true, stompDmg: 70, fat: 0.8, heavy: 1.1,
    blast: [320, 210, 1500, true],
    skills: [{ id: 'steam', cd: 12, range: 280, lock: 0.6, dur: 3.5 }, { id: 'sweep', cd: 7, range: 220, lock: 1.2, pose: 'chop', dmg: 130, knock: 1300 }, { id: 'renuke', hp: 0.35, once: true, lock: 1.2, pose: 'raise', r: 270, dmg: 240 }],
    blurb: 'Armin\'s Colossal: thinner, and even more explosive.' }, SHIFTER),
  female: T_({ name: 'Female Titan', cost: 0, hp: 1500, S: 2.7, speed: 135, reach: 50, dmg: 60, cd: 0.85, knock: 900, style: 'punch', hat: 'female', dodge: 0.3, regen: 8,
    skills: [{ id: 'kick', cd: 5, range: 120, lock: 0.5, pose: 'guard', dmg: 120, knock: 1300, r: 70 }, { id: 'hardpunch', cd: 7, range: 90, lock: 0.5, pose: 'chop', dmg: 130 },
      { id: 'crystal', hp: 0.25, once: true, lock: 5, pose: 'crouch', dur: 5, heal: 0.45, call: 'CRYSTAL', color: '#bfe9ff' }, { id: 'scream', cd: 25, first: 7, lock: 1.2, pose: 'roar', n: 2, call: 'KYAAAAAAAH!', color: '#ffffff' }],
    blurb: 'Fast and precise.' }, SHIFTER),
  beast: T_({ name: 'Beast Titan', cost: 0, hp: 2000, S: 3.4, speed: 70, range: 560, dmg: 55, cd: 2.8, knock: 600, style: 'throw', proj: 'rock', hat: 'beast', fat: 1.15, heavy: 1.3, regen: 6,
    skills: [{ id: 'barrage', cd: 11, first: 3, range: 640, min: 120, crowd: 3, crowdR: 130, lock: 1.3, pose: 'throw', n: 14, spread: 110, dmg: 45 }, { id: 'fastball', cd: 6, range: 660, min: 100, lock: 1, pose: 'throw', dmg: 180 },
      { id: 'zscream', cd: 22, first: 6, lock: 1.2, pose: 'roar', n: 3, call: 'AAAAAAAAAH!', color: '#ffe14a', big: true }],
    blurb: 'Seventeen metres of fur, with a pitcher\'s arm.' }, SHIFTER),
  cart: T_({ name: 'Cart Titan', cost: 0, hp: 1100, S: 2.0, speed: 150, range: 420, dmg: 12, cd: 0.35, knock: 110, style: 'gun', proj: 'bullet', body: 'cart', regen: 6, armor: 0.3, armorHP: 300,
    skills: [{ id: 'cannon', cd: 6, first: 2, range: 620, min: 100, lock: 0.6, dmg: 150 }, { id: 'mg', cd: 7, range: 420, lock: 1, n: 12, dmg: 11 }],
    blurb: 'Panzer unit aboard.' }, SHIFTER),
  jaw: T_({ name: 'Jaw Titan', cost: 0, hp: 850, S: 1.9, speed: 175, reach: 28, dmg: 55, cd: 0.7, knock: 400, style: 'pounce', hat: 'jaw', regen: 8, dodge: 0.25, pierce: true, leap: true, leapMax: 380, leapFlight: 0.55, slam: 60, slamR: 50,
    skills: [{ id: 'crunch', cd: 6, range: 70, lock: 0.45, pose: 'crouch', dmg: 190, call: 'CRUNCH', color: '#ffffff' }, { id: 'claws', cd: 5, range: 60, lock: 0.5, dmg: 30 }],
    blurb: 'Small, fast, and that jaw.' }, SHIFTER),
  jawbird: T_({ name: 'Jaw Titan (Falco)', cost: 0, hp: 700, S: 2.0, speed: 160, reach: 28, dmg: 40, cd: 0.8, knock: 300, style: 'pounce', hat: 'jawbird', fly: 140, regen: 3, pierce: true,
    skills: [{ id: 'dive', cd: 3.5, first: 1, range: 420, lock: 1.1, dmg: 150, walk: false }],
    blurb: 'Winged.' }, SHIFTER),
  attackwh: T_({ name: 'Attack Titan (War Hammer)', cost: 0, hp: 1900, S: 2.8, speed: 115, reach: 56, dmg: 85, cd: 1.2, knock: 950, style: 'punch', hat: 'attackwh', aoe: true, regen: 8, heavy: 1.3,
    skills: [{ id: 'spikes', cd: 9, first: 2, range: 380, min: 70, lock: 0.8, pose: 'slam', dmg: 75, knock: 900, call: 'WAR HAMMER', color: '#bfe9ff' }, { id: 'crossbow', cd: 14, first: 5, range: 700, min: 160, lock: 1.4, pose: 'point', dmg: 220 },
      { id: 'whammer', cd: 8, range: 150, lock: 0.9, pose: 'slam', dmg: 150, knock: 1150 }, { id: 'hardpunch', cd: 6, range: 100, lock: 0.5, pose: 'chop', dmg: 150 },
      { id: 'crystal', hp: 0.35, once: true, lock: 4, pose: 'guard', dur: 4, heal: 0.35, call: 'CRYSTAL SHELL', color: '#bfe9ff' }],
    blurb: 'The Attack Titan, armed by the War Hammer.' }, SHIFTER),
  founder: T_({ name: 'Founding Titan', cost: 0, hp: 6500, onDeath: 'founder', S: 7.4, speed: 24, reach: 150, dmg: 160, cd: 3.2, knock: 1500, style: 'punch', body: 'founder', aoe: true, colossal: true, stomp: true, stompDmg: 50, stompR: 5, quake: 0.4, regen: 0, heavy: 1.5,
    skills: [{ id: 'rumbling', cd: 24, first: 4, lock: 1.2, pose: 'roar', n: 1, call: 'THE RUMBLING', color: '#ffb347', big: true }, { id: 'pastcall', cd: 16, first: 8, lock: 1, pose: 'raise', n: 1, call: 'THE PAST TITANS', color: '#dfe8ff' },
      { id: 'bonecall', cd: 14, first: 6, lock: 0.8, n: 2 }, { id: 'coordinate', cd: 16, first: 8, lock: 1, pose: 'raise', n: 2, dur: 7, call: 'COORDINATE', color: '#9fd8ef' },
      { id: 'pathsheal', cd: 18, first: 10, lock: 1, call: 'PATHS', color: '#dfe8ff' }],
    blurb: 'The Founder.' }, SHIFTER),
  walltitan: T_({ name: 'Wall Titan', cost: 1600, hp: 2200, S: 5.2, speed: 42, reach: 90, dmg: 100, cd: 3, knock: 1200, style: 'punch', hat: 'colossal', aoe: true, colossal: true, march: true, stomp: true, stompDmg: 100, stompR: 6, quake: 0.45, fat: 1.05, heavy: 1.2,
    blurb: 'One of the millions of Colossal Titans that stood inside the Walls. It walks, and doesn\'t stop; its footsteps knock everyone off their feet.' }, SHIFTER),
  bonetitan: T_({ name: 'Bone Titan', cost: 350, hp: 450, S: 2.4, speed: 120, reach: 38, dmg: 36, cd: 0.9, knock: 500, style: 'punch', body: 'bone', onDeath: 'bones',
    skills: [{ id: 'claws', cd: 4, range: 70, lock: 0.5, dmg: 26 }],
    blurb: 'Grown from the Founding Titan\'s bones to fight for Eren. Fast, and all claws.' }, SHIFTER),
  pasttitan: T_({ name: 'Past Titan', cost: 900, hp: 900, S: 2.6, speed: 100, reach: 50, dmg: 60, cd: 1.2, knock: 800, style: 'punch', hat: 'attacktitan', onStart: 'past', past: true,
    blurb: 'A Titan of a past holder, called back through the Paths: one of the Nine, at random.' }, SHIFTER),
  titan: Object.assign(TYPES.titan, { speed: 55, regen: 3 }),
  abnormal: T_({ name: 'Abnormal Titan', cost: 750, hp: 900, S: 2.3, speed: 140, reach: 46, dmg: 60, cd: 1.6, knock: 600, style: 'grab', hat: 'abnormal', anim: 1.2, leap: true, leapMax: 450, leapFlight: 0.7, slam: 70,
    skills: [{ id: 'deviant', cd: 3.5 }],
    blurb: 'Doesn\'t do what Titans are supposed to: sprints, leaps, and picks its victims at random.' }, SHIFTER),
  smiling: T_({ name: 'Smiling Titan', cost: 1000, hp: 1500, S: 2.8, speed: 50, reach: 52, dmg: 60, cd: 2.4, knock: 500, style: 'grab', hat: 'smiling', anim: 1.4, fat: 1.05, eats: 300,
    blurb: 'That smile. It doesn\'t throw what it grabs: it swallows it and heals.' }, SHIFTER),
  puretitan: T_({ name: 'Pure Titan', cost: 0, hp: 600, S: 2.1, speed: 70, reach: 44, dmg: 50, cd: 2.2, knock: 500, style: 'grab', hat: 'titan', anim: 1.4,
    blurb: 'Someone who was a person a moment ago.' }, SHIFTER),
  lcocoon: T_({ name: 'Lara\'s Crystal', cost: 0, hp: 450, S: 1, speed: 0, reach: 0, dmg: 0, cd: 99, knock: 0, style: 'none', body: 'cocoon', heavy: 20, steadfast: true, support: true,
    blurb: 'Lara Tybur, sealed in crystal under the stage, linked to her Titan.' }),
  reinerhuman: T_({ name: 'Reiner Braun', cost: 0, hp: 70, S: 1.05, speed: 50, reach: 30, dmg: 20, cd: 1, knock: 200, style: 'punch', hat: 'reiner', human: true,
    blurb: 'Out of the nape again.' }),
});
TYPES.titan.titan = true;
TYPES.attacktitan.speed = 115; TYPES.attacktitan.regen = 6; TYPES.attacktitan.tick = 'aot'; TYPES.attacktitan.buffDmg = 1.5; TYPES.attacktitan.buffSpeed = 1.2;
TYPES.attacktitan.skills = [{ id: 'hardpunch', cd: 6, range: 100, lock: 0.5, pose: 'chop', dmg: 140 }, { id: 'roar', cd: 14, first: 3, range: 200, lock: 0.8, pose: 'roar', call: 'ROAAAR', color: '#ffffff' },
  { id: 'rage', hp: 0.4, once: true, lock: 0.5, pose: 'roar' }];
TYPES.eren.tick = 'aot'; TYPES.scout.tick = 'aot'; TYPES.scout.human = true; TYPES.eren.human = true;
// Lara Tybur fights in her War Hammer Titan from the start; her real body is a crystal behind the lines.
TYPES.warhammer = T_({ name: 'War Hammer Titan', cost: 2200, hp: 1150, S: 2.8, speed: 100, reach: 56, dmg: 70, cd: 1.2, knock: 900, style: 'punch', hat: 'warhammer', onStart: 'lara', onDeath: 'warhammer', lives: 1,
  skills: [{ id: 'spikes', cd: 9, first: 2, range: 380, min: 70, lock: 0.8, pose: 'slam', dmg: 70, knock: 900 }, { id: 'whammer', cd: 8, range: 150, lock: 0.9, pose: 'slam', dmg: 120, knock: 1100 },
    { id: 'crossbow', cd: 13, first: 5, range: 700, min: 160, lock: 1.4, pose: 'point', dmg: 200 }, { id: 'harden', cd: 15, hp: 0.6, lock: 0.5, pose: 'guard', dur: 3 }],
  blurb: 'Lara Tybur. Crystal weapons out of thin air: spikes, a hammer, a crossbow. Her real body is sealed in a crystal behind the lines; while it survives, the Titan re-forms once.' }, SHIFTER);
// The past holders' Titans: lighter versions of the Nine, pale from the Paths.
const PAST_FORMS = ['past_attack', 'past_armored', 'past_female', 'past_jaw', 'past_beast', 'past_hammer'];
Object.assign(TYPES, {
  past_attack: T_({ name: 'Past Attack Titan', cost: 0, hp: 700, S: 2.6, speed: 110, reach: 50, dmg: 65, cd: 1.1, knock: 850, style: 'punch', hat: 'attacktitan', past: true,
    skills: [{ id: 'hardpunch', cd: 7, range: 100, lock: 0.5, pose: 'chop', dmg: 120 }] }, SHIFTER),
  past_armored: T_({ name: 'Past Armored Titan', cost: 0, hp: 770, S: 2.7, speed: 95, reach: 50, dmg: 60, cd: 1.3, knock: 800, style: 'punch', hat: 'armored', past: true, armor: 0.5, armorHP: 250, heavy: 1.8,
    skills: [{ id: 'charge', cd: 10, range: 480, min: 110, lock: 1, pose: 'guard', dmg: 70, knock: 1000, speed: 500 }] }, SHIFTER),
  past_female: T_({ name: 'Past Female Titan', cost: 0, hp: 630, S: 2.6, speed: 125, reach: 48, dmg: 55, cd: 0.9, knock: 850, style: 'punch', hat: 'female', past: true, dodge: 0.25,
    skills: [{ id: 'kick', cd: 5, range: 110, lock: 0.5, pose: 'guard', dmg: 100, knock: 1200, r: 65 }] }, SHIFTER),
  past_jaw: T_({ name: 'Past Jaw Titan', cost: 0, hp: 454, S: 1.9, speed: 170, reach: 28, dmg: 45, cd: 0.75, knock: 380, style: 'pounce', hat: 'jaw', past: true, pierce: true, leap: true, leapMax: 360, leapFlight: 0.55, slam: 50, slamR: 50,
    skills: [{ id: 'crunch', cd: 6, range: 70, lock: 0.45, pose: 'crouch', dmg: 150 }] }, SHIFTER),
  past_beast: T_({ name: 'Past Beast Titan', cost: 0, hp: 770, S: 3.0, speed: 75, range: 500, dmg: 50, cd: 2.6, knock: 600, style: 'throw', proj: 'rock', hat: 'beast', past: true, fat: 1.1,
    skills: [{ id: 'fastball', cd: 6, range: 600, min: 100, lock: 1, pose: 'throw', dmg: 150 }] }, SHIFTER),
  past_hammer: T_({ name: 'Past War Hammer Titan', cost: 0, hp: 630, S: 2.7, speed: 100, reach: 54, dmg: 60, cd: 1.2, knock: 850, style: 'punch', hat: 'warhammer', past: true,
    skills: [{ id: 'spikes', cd: 9, range: 360, min: 70, lock: 0.8, pose: 'slam', dmg: 75, knock: 850 }] }, SHIFTER),
});
for (const k of PAST_FORMS) TYPES[k].blurb = 'A past holder\'s Titan, called back through the Paths.';

ORDER.push('garrison', 'thunder', 'cannon', 'levi', 'mikasa', 'hange', 'erwin', 'jean', 'connie', 'sasha', 'pixis', 'kicker',
  'marley', 'gabi', 'willy', 'artillery', 'airship',
  'reiner', 'bertholdt', 'annie', 'zeke', 'pieck', 'porco', 'falco', 'armin', 'warhammer',
  'erenwh', 'erenfounder', 'abnormal', 'smiling', 'walltitan', 'bonetitan', 'pasttitan');
