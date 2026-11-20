'use strict';
// The Showa Ultra Brothers: Ultraseven (1967), Ultraman Jack (1971), Ultraman Ace (1972), Ultraman Taro (1973)
// and Ultraman Leo (1974). Smaller than the original giant Ultraman; each fights hand to hand between five
// signature techniques from the TV shows. Seven also carries his Capsule Monsters. Simulation only.

(() => {
  // ---------- small helpers ----------
  // Calls fn(i) now and then every dt seconds, n times in all; fn returning false stops it early.
  const every = (W, dt, n, fn) => {
    let i = 0;
    const go = () => { if (fn(i) === false) return; if (++i < n) later(W, dt, go); };
    go();
  };
  const liftable = e => e.alive && !e.t.colossal && !e.t.fly && e.mass < 20 && !e.burrow;
  const dirTo = (u, T) => {
    const dx = T.P.x - u.P.x, dz = T.P.z - u.P.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
    return { x: dx / d, z: dz / d, d };
  };
  const launch = (e, vx, vy, vz) => { for (const q of e.body.pts) addVel(q, vx, vy, vz); };
  const feetUp = u => {
    const pts = u.body.pts, a = pts[J.LFOOT], b = pts[J.RFOOT];
    return Math.min(a.y - groundH(a.x, a.z), b.y - groundH(b.x, b.z));
  };
  const alive = T => T && T.alive;
  const pick = (u, W, T) => (alive(T) ? T : nearestEnemy(u, W.units));
  const headLamp = u => {
    const h = u.body.pts[J.HEAD], S = u.S;
    return { x: h.x + u.fx * 7 * S, y: h.y + 3 * S, z: h.z + u.fz * 7 * S };
  };
  // Enemy projectiles in flight within r of u and heading its way.
  const incoming = (u, W, r) => {
    let n = 0;
    for (const p of W.projs) {
      if (p.dead || p.stuck || p.team === u.team || p.team < 0) continue;
      const dx = u.P.x - p.x, dz = u.P.z - p.z;
      if (dx * dx + dz * dz < r * r && dx * p.vx + dz * p.vz > 0) n++;
    }
    return n;
  };
  // Sends enemy projectiles near u back the way they came (Ultra Defender, Ultra Mant), or destroys them.
  const guardFrom = (u, W, secs, R0, mode, cx, cz) => every(W, DT * 2, Math.round(secs / DT / 2), () => {
    if (!u.alive && mode !== 'destroy') return false;
    const x = cx != null ? cx : u.P.x, z = cx != null ? cz : u.P.z;
    for (const p of W.projs) {
      if (p.dead || p.stuck || p.team === u.team || p.team < 0) continue;
      const dx = p.x - x, dz = p.z - z;
      if (dx * dx + dz * dz > R0 * R0) continue;
      if (mode === 'destroy') { p.dead = true; glowBits(W, p.x, p.y, p.z, 4, ['#9fe8ff', '#ffffff'], 40, 2.5); continue; }
      if (dx * p.vx + dz * p.vz > 0) continue;            // already going away
      p.vx = -p.vx; p.vz = -p.vz; p.vy = Math.abs(p.vy) * 0.5 + 60;
      p.team = u.team; p.owner = u; p.hits = [];
      sparks(W, p.x, p.y, p.z, 5);
      SFX.play('clank');
    }
  });
  // A rainbow: extra thin beams of other colours beside a main beam, for Metallium and Storium.
  const rainbow = (W, u, cols) => {
    const b = W.beams[W.beams.length - 1];
    if (!b || !b.specium) return;
    const sx = -u.fz, sz = u.fx;
    cols.forEach((c, i) => {
      const o = (i - (cols.length - 1) / 2) * 7 * u.S;
      W.beams.push({ a: u, specium: true, color: c, width: 0.35, life: b.life,
        from: { x: b.from.x + sx * o, y: b.from.y + (i % 2 ? 3 : -3), z: b.from.z + sz * o },
        end: { x: b.end.x + sx * o * 0.3, y: b.end.y, z: b.end.z + sz * o * 0.3 } });
    });
  };
  // Waits for a jumping Ultra to come down, then calls land().
  const onLanding = (u, W, minT, land) => every(W, DT, 240, i => {
    if (!u.alive) return false;
    if (i * DT < minT) return;
    if (feetUp(u) < 3 * u.S || i === 239) { land(); return false; }
  });
  const jumpAt = (u, x, z, flight) => {
    const dx = x - u.P.x, dz = z - u.P.z;
    const vy = GRAV * flight / 2;
    launch(u, dx / flight, vy, dz / flight);
  };

  // Pikon pikon: the Color Timer starts to flash when an Ultra is close to the end.
  HURT_HOOKS.ultra = (e, dmg, from, W, src, flags) => {
    if (e.shieldUntil > W.time) {
      // Ultra Defender: a shield on the bracelet arm stops almost everything from the front.
      const fr = from ? ((from.x - e.P.x) * e.fx + (from.z - e.P.z) * e.fz) > 0 : true;
      if (fr) { dmg *= from ? 0.15 : 0.5; const h = e.body.pts[J.LHAND]; sparks(W, h.x, h.y, h.z, 4); }
    }
    if (e.mantUntil > W.time) dmg *= 0.3;
    if (e.alive && !e.pikon && e.hp - dmg < e.t.hp * 0.3) {
      e.pikon = true;
      callout(W, e, 'PIKON PIKON!', '#ff6a6a');
      SFX.play('pikon');
    }
    return dmg;
  };

  // ---------- poses ----------
  CAST_POSES.rush = (u, k) => (Math.floor(k * 14) % 2
    ? { r: [24, 2, 4, 1, 0, 0], l: [6, -2, -6, 1, 0.3, 0] }
    : { r: [6, -2, 6, 1, 0.3, 0], l: [24, 2, -4, 1, 0, 0] });
  CAST_POSES.spin = (u, k, t) => {
    const a = t * 14;
    return { r: [4 + Math.cos(a) * 6, 18, 5 + Math.sin(a) * 6, 0.1, 1, 0], l: [4 - Math.cos(a) * 6, 18, -5 - Math.sin(a) * 6, 0.1, 1, 0] };
  };
  CAST_POSES.stormium = (u, k) => (k < 0.5
    ? { r: [2, 18, 5, 0, 1, 0], l: [2, 18, -5, 0, 1, 0] }                 // arms up, gathering
    : { r: [10, 6, 2, 0, 1, 0], l: [10, -2, -8, 0, 0, 1] });              // the T
  CAST_POSES.metallium = (u, k) => (k < 0.45
    ? { r: [4, 4, -10, 0.2, 0, -1], l: [4, 2, -14, 0.2, 0, -1] }          // swing both arms out to the left
    : { r: [8, 10, 6, 0, 1, 0], l: [10, 2, -2, 0, 0, 1] });                // then the L
  CAST_POSES.mant = () => ({ r: [8, 8, 12, 0.2, 0.4, 1], l: [8, 8, -12, 0.2, 0.4, -1] });

  // ---------- projectiles ----------
  Object.assign(PROJ, {
    slugger: { speed: 600, g: 0, r: 7, life: 2.6 },
    spark: { speed: 640, g: 0, r: 7, life: 3 },
    lance: { speed: 950, g: 0.2, r: 5, life: 2 },
    vblade: { speed: 780, g: 0, r: 12, life: 0.75 },
    gring: { speed: 520, g: 0, r: 7, life: 3 },
  });
  const steer = (p, tx, ty, tz, speed, k) => {
    let dx = tx - p.x, dy = ty - p.y, dz = tz - p.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    dx = dx / d * speed; dy = dy / d * speed; dz = dz / d * speed;
    p.vx += (dx - p.vx) * k; p.vy += (dy - p.vy) * k; p.vz += (dz - p.vz) * k;
    return d;
  };
  // Eye Slugger and Ultra Spark fly out, cut whatever they pass, then come home.
  const homing = (flag, home) => ({
    tick(p, W) {
      const o = p.owner;
      p.t = (p.t || 0) + DT;
      if (p.life <= DT * 1.5) o[flag] = false;
      if (!p.back && (p.t > p.outT || (p.maxHits && p.hits.length >= p.maxHits))) { p.back = true; p.hits = []; }
      if (!p.back && p.target && p.target.alive) {
        const c = p.target.body.pts[J.CHEST];
        steer(p, c.x, c.y, c.z, PROJ[p.kind].speed, 0.12);
      }
      if (p.back) {
        if (!o.alive) { p.dead = true; o[flag] = false; return; }
        const h = o.body.pts[home];
        if (steer(p, h.x, h.y, h.z, PROJ[p.kind].speed * 1.1, 0.25) < 22) { p.dead = true; o[flag] = false; }
      }
    },
    hit(p, e, W, nx, ny, nz) {
      hurt(e, p.dmg, nx * p.knock, 160, nz * p.knock, null, W, p.owner, PIERCE);
      const c = e.body.pts[J.CHEST];
      sparks(W, c.x, c.y, c.z, 8);
      SFX.play('clank');
      return false;
    },
    ground(p, W, y) { p.y = y + p.r; if (p.vy < 0) p.vy = -p.vy * 0.3; },
    wall() { return true; },
  });
  PROJ_HOOKS.slugger = homing('sluggerOut', J.HEAD);
  PROJ_HOOKS.spark = homing('braceletOut', J.LHAND);
  PROJ_HOOKS.lance = {
    hit(p, e, W, nx, ny, nz) {
      hurt(e, p.dmg, nx * p.knock, 260, nz * p.knock, null, W, p.owner, PIERCE);
      const c = e.body.pts[J.CHEST];
      sparks(W, c.x, c.y, c.z, 12);
      SFX.play('thunk');
      p.dead = true;
      return true;
    },
    ground(p, W, y) { p.dead = true; puff(W, p.x, y, p.z, 6, '#cdbb98', 70, 6); },
  };
  PROJ_HOOKS.vblade = {
    hit(p, e, W, nx, ny, nz) {
      hurt(e, p.dmg, nx * p.knock, 200, nz * p.knock, null, W, p.owner, PIERCE);
      const c = e.body.pts[J.CHEST];
      glowBits(W, c.x, c.y, c.z, 8, ['#ffe066', '#ffffff'], 70, 3);
      SFX.play('hit');
      return false;
    },
    ground(p, W, y) { p.y = y + 30; p.vy = 0; },
    wall() { return true; },
  };
  PROJ_HOOKS.gring = {
    tick(p) {
      if (p.target && p.target.alive) { const c = p.target.body.pts[J.CHEST]; steer(p, c.x, c.y, c.z, PROJ.gring.speed, 0.15); }
    },
    hit(p, e, W, nx, ny, nz) {
      hurt(e, p.dmg, nx * p.knock, 150, nz * p.knock, null, W, p.owner, PIERCE);
      const c = e.body.pts[J.CHEST];
      glowBits(W, c.x, c.y, c.z, 8, ['#ffd166', '#ffffff'], 70, 3);
      SFX.play('hit');
      if (e === p.target) { p.dead = true; return true; }
      return false;
    },
    ground(p, W, y) { p.y = y + 10; if (p.vy < 0) p.vy = 0; },
    wall() { return true; },
  };
  // Throws one of these at T from point `from`, with damage and knock.
  const throwAt = (W, kind, u, T, from, dmg, knock, extra) => {
    const c = T.body.pts[J.CHEST], sp = PROJ[kind].speed;
    let dx = c.x - from.x, dy = c.y - from.y, dz = c.z - from.z;
    const L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const p = spawnProj(W, kind, from, { x: dx / L * sp, y: dy / L * sp + (PROJ[kind].g ? GRAV * PROJ[kind].g * L / sp / 2 : 0), z: dz / L * sp }, u);
    p.dmg = dmg; p.knock = knock;
    Object.assign(p, extra || {});
    return p;
  };

  // ---------- the techniques ----------
  Object.assign(SKILLS, {
    // ===== Ultraseven =====
    eyeSlugger: {
      when: u => !u.sluggerOut,
      cast(u, W, T, d) {
        later(W, 0.3, () => {
          if (!u.alive || !alive(T)) return;
          const h = u.body.pts[J.HEAD];
          const p = throwAt(W, 'slugger', u, T, { x: h.x, y: h.y + 6 * u.S, z: h.z }, 55, 380, { target: T, outT: d / 600 + 0.25 });
          u.sluggerOut = true;
          SFX.play('whoosh');
        });
      },
    },
    emerium: {
      cast(u, W, T) {
        later(W, 0.25, () => {
          if (!u.alive) return;
          const t = pick(u, W, T);
          if (!t) return;
          fireBeam(u, W, t, { dmg: 60, knock: 300, width: 16, extra: 120, color: '#6dff8a', beamW: 0.45, from: headLamp(u), flashR: 50, shake: 3 });
          SFX.play('zap');
        });
      },
    },
    wideShot: {
      cast(u, W, T) {
        later(W, 0.5, () => {
          if (!u.alive) return;
          const t = pick(u, W, T);
          if (!t) return;
          fireBeam(u, W, t, { dmg: 140, knock: 520, width: 40, extra: 320, color: '#ffd84a', beamW: 1.7, flashR: 170, shake: 11 });
          SFX.play('specium');
        });
      },
    },
    capsule: {
      cast(u, W) {
        later(W, 0.45, () => {
          if (!u.alive) return;
          const kinds = ['windom', 'miclas', 'agira'], key = kinds[Math.floor(R() * 3)];
          const x = u.P.x + u.fx * 70, z = u.P.z + u.fz * 70;
          spawnUnit(W, key, x, z, u);
          W.flashes.push({ x, y: 20, z, life: 0.45, max: 0.45, r: 70, bolt: true });
          puff(W, x, 20, z, 18, '#f4f4f4', 100, 9);
          callout(W, u, 'GO, ' + TYPES[key].name.toUpperCase() + '!', '#ffb347');
          SFX.play('poof'); SFX.play('roar');
        });
      },
    },
    nenriki: {
      when: (u, W, T) => liftable(T),
      cast(u, W, T) {
        const vic = [T];
        for (const e of enemiesNear(u, W, T.P.x, T.P.z, 70)) if (e !== T && vic.length < 3 && liftable(e)) vic.push(e);
        for (const e of vic) {
          e.stun = Math.max(e.stun, 2); e.act = 'idle';
          if (e.held) { e.held.grabbed = null; e.held = null; }
          W.fx.push({ kind: 'nenriki', e, life: 1.0 });
        }
        // Up into the air...
        every(W, DT, 45, () => {
          for (const e of vic) {
            if (!e.alive) continue;
            for (const q of e.body.pts) { q.px = q.x - (q.x - q.px) * 0.6; q.py = q.y - 3.2; q.pz = q.z - (q.z - q.pz) * 0.6; }
          }
        });
        // ...and down, hard.
        later(W, 0.8, () => {
          for (const e of vic) {
            if (!e.alive) continue;
            launch(e, 0, -950, 0);
            hurt(e, 50, 0, 0, 0, null, W, u);
            if (e.alive) e.stun = Math.max(e.stun, 1.2);
          }
          SFX.play('slam');
          W.shake = Math.max(W.shake, 5);
        });
        SFX.play('zap');
      },
    },

    // ===== Ultraman Jack =====
    jackSpecium: {
      cast(u, W, T) {
        later(W, 0.3, () => {
          if (!u.alive) return;
          const t = pick(u, W, T);
          if (t) fireBeam(u, W, t, { dmg: 80, knock: 420, width: 24, extra: 220, flashR: 100, shake: 6 });
          SFX.play('specium');
        });
      },
    },
    ultraSpark: {
      when: u => !u.braceletOut,
      cast(u, W, T, d) {
        later(W, 0.25, () => {
          if (!u.alive || !alive(T)) return;
          const h = u.body.pts[J.LHAND];
          throwAt(W, 'spark', u, T, { x: h.x, y: h.y, z: h.z }, 45, 300, { target: T, outT: d / 640 + 0.6, maxHits: 3 });
          u.braceletOut = true;
          SFX.play('whoosh');
        });
      },
    },
    ultraLance: {
      when: u => !u.braceletOut,
      cast(u, W, T) {
        u.lanceUntil = W.time + 0.5;
        later(W, 0.4, () => {
          if (!u.alive || !alive(T)) return;
          const h = u.body.pts[J.RHAND];
          throwAt(W, 'lance', u, T, { x: h.x, y: h.y + 4, z: h.z }, 110, 900);
          SFX.play('twang');
        });
      },
    },
    defender: {
      when: (u, W) => incoming(u, W, 300) >= 1 || u.hp < u.t.hp * 0.7,
      cast(u, W) {
        u.shieldUntil = W.time + 3.5;
        guardFrom(u, W, 3.5, 34 * u.S, 'reflect');
        SFX.play('clank');
      },
    },
    hurricane: {
      when: (u, W, T) => liftable(T),
      cast(u, W, T) {
        T.stun = Math.max(T.stun, 2.6); T.act = 'idle';
        // Lifted and spun round overhead like a top...
        every(W, DT, 36, () => {
          if (!T.alive) return false;
          const c = T.P, h = u.body.pts[J.HEAD], ty = h.y + 20 * u.S;
          for (const q of T.body.pts) {
            const rx = q.x - c.x, rz = q.z - c.z;
            q.px = q.x + rz * 0.22 - (h.x + u.fx * 10 - c.x) * 0.08;
            q.pz = q.z - rx * 0.22 - (h.z + u.fz * 10 - c.z) * 0.08;
            q.py = q.y - (ty - c.y) * 0.08;
          }
        });
        // ...then hurled into the sky, and finished with a Specium Ray on the way down.
        later(W, 0.62, () => {
          if (!T.alive) return;
          launch(T, u.fx * 260, 700, u.fz * 260);
          hurt(T, 60, 0, 0, 0, null, W, u);
          SFX.play('whoosh');
        });
        later(W, 1.05, () => {
          if (!u.alive || !alive(T)) return;
          fireBeam(u, W, T, { dmg: 50, knock: 300, width: 22, extra: 120, flashR: 80 });
          SFX.play('specium');
        });
      },
    },

    // ===== Ultraman Ace =====
    metallium: {
      cast(u, W, T) {
        later(W, 0.45, () => {
          if (!u.alive) return;
          const t = pick(u, W, T);
          if (!t) return;
          fireBeam(u, W, t, { dmg: 90, knock: 450, width: 26, extra: 240, color: '#ff9b4a', beamW: 1.1, flashR: 110, shake: 7 });
          rainbow(W, u, ['#5fd0ff', '#ffe14a', '#ff5fd2']);
          SFX.play('specium');
        });
      },
    },
    vGuillotine: {
      cast(u, W, T) {
        later(W, 0.3, () => {
          if (!u.alive || !alive(T)) return;
          const h = u.body.pts[J.HEAD], c = T.body.pts[J.CHEST];
          let dx = c.x - h.x, dz = c.z - h.z;
          const L = Math.sqrt(dx * dx + dz * dz) || 1;
          const p = spawnProj(W, 'vblade', { x: h.x, y: c.y, z: h.z }, { x: dx / L * 780, y: 0, z: dz / L * 780 }, u);
          p.dmg = 70; p.knock = 380;
          SFX.play('whoosh');
        });
      },
    },
    circular: {
      cast(u, W, T) {
        later(W, 0.4, () => {
          if (!u.alive) return;
          const foes = W.units.filter(e => e.alive && e.team !== u.team && !e.burrow)
            .map(e => ({ e, d: (e.P.x - u.P.x) ** 2 + (e.P.z - u.P.z) ** 2 }))
            .filter(o => o.d < 480 * 480).sort((a, b) => a.d - b.d).slice(0, 3);
          const h = u.body.pts[J.HEAD];
          foes.forEach(({ e }, i) => {
            const from = { x: h.x + (i - 1) * 14, y: h.y + 16 * u.S, z: h.z };
            throwAt(W, 'gring', u, e, from, 55, 300, { target: e });
          });
          SFX.play('whoosh');
        });
      },
    },
    punchLaser: {
      cast(u, W, T) {
        every(W, 0.1, 3, i => {
          if (!u.alive) return false;
          const t = pick(u, W, T);
          if (!t) return false;
          fireBeam(u, W, t, { dmg: 18, knock: 120, width: 10, extra: 40, color: '#ffe066', beamW: 0.3, from: headLamp(u), flash: false, shake: 1, life: 0.18 });
          SFX.play('pew');
        });
      },
    },
    aceBarrier: {
      when: (u, W) => u.hp < u.t.hp * 0.75 || incoming(u, W, 320) >= 2 || alliesNear(u, W, u.P.x, u.P.z, 120).some(a => a.hp < a.t.hp * 0.5),
      cast(u, W) {
        const x = u.P.x, z = u.P.z, R0 = 130;
        for (const a of [u, ...alliesNear(u, W, x, z, R0)]) a.ward = Math.max(a.ward, 4.5);
        guardFrom(u, W, 4.5, R0, 'destroy', x, z);
        W.fx.push({ kind: 'barrier', x, z, y: groundH(x, z), R: R0, life: 4.5, max: 4.5 });
        SFX.play('chime');
      },
    },

    // ===== Ultraman Taro =====
    storium: {
      cast(u, W, T) {
        later(W, 0.6, () => {
          if (!u.alive) return;
          const t = pick(u, W, T);
          if (!t) return;
          fireBeam(u, W, t, { dmg: 110, knock: 520, width: 30, extra: 260, color: '#ffcf5a', beamW: 1.35, flashR: 140, shake: 9 });
          rainbow(W, u, ['#ff5f5f', '#5fd0ff', '#8cff6b', '#c38bff']);
          SFX.play('specium');
        });
      },
    },
    dynamite: {
      cast(u, W) {
        // Taro bursts into flame and throws himself into the enemy, then reforms from the pieces.
        u.hard = 2.6; u.dynamiteUntil = W.time + 0.6;
        W.fx.push({ kind: 'dynamite', u, life: 0.6 });
        later(W, 0.55, () => {
          if (!u.alive) return;
          const c = u.body.pts[J.CHEST];
          explode(W, c.x, c.y, c.z, 170, 1000, 150, u, 0, true);
          W.shake = Math.max(W.shake, 14);
          u.hp = Math.max(1, u.hp * 0.3);
          u.reformUntil = W.time + 1.8;
        });
        later(W, 2.3, () => {
          if (!u.alive) return;
          u.hp = Math.max(u.hp, u.t.hp * 0.55);
          const c = u.body.pts[J.CHEST];
          glowBits(W, c.x, c.y, c.z, 24, ['#ffffff', '#ffd166', '#ff8a5a'], 90, 4);
          callout(W, u, 'TARO REFORMS!', '#ffd166');
          SFX.play('chime');
        });
        SFX.play('sizzle');
      },
    },
    shower: {
      cast(u, W) {
        const sx = u.fx, sz = u.fz, x = u.P.x, z = u.P.z;
        every(W, DT * 2, 18, i => {
          if (!u.alive) return false;
          const h = u.body.pts[J.RHAND];
          for (let k = 0; k < 4; k++) {
            W.parts.push({ kind: 'glow', x: h.x, y: h.y, z: h.z, vx: sx * rand(380, 520) + rand(-60, 60), vy: rand(-40, 80), vz: sz * rand(380, 520) + rand(-60, 60), life: 0.6, max: 0.6, size: rand(3, 5), color: Math.random() < 0.5 ? '#7fd6ff' : '#e6f8ff' });
          }
          if (i !== 4) return;
          for (const e of W.units) {
            if (!e.alive || e.team === u.team || e.burrow) continue;
            const dx = e.P.x - x, dz = e.P.z - z, dd = Math.sqrt(dx * dx + dz * dz) || 1;
            if (dd > 300 + e.r || (dx * sx + dz * sz) / dd < 0.72) continue;
            hurt(e, 15, sx * 520, 140, sz * 520, null, W, u);
            e.slow = Math.max(e.slow, 3);
          }
          SFX.play('bubble');
        });
      },
    },
    hornCharge: {
      cast(u, W, T) {
        const hit = [];
        const dir = dirTo(u, T);
        every(W, DT, 28, () => {
          if (!u.alive) return false;
          for (const j of [J.PELVIS, J.CHEST, J.HEAD]) {
            const q = u.body.pts[j];
            q.px = q.x - dir.x * 560 * DT; q.pz = q.z - dir.z * 560 * DT;
          }
          const h = u.body.pts[J.HEAD];
          for (const e of enemiesNear(u, W, h.x, h.z, 30 * u.S)) {
            if (hit.includes(e)) continue;
            hit.push(e);
            hurt(e, 55, dir.x * 700, 600, dir.z * 700, null, W, u);
            W.shake = Math.max(W.shake, 4);
            SFX.play('thud');
          }
        });
        SFX.play('roar');
      },
    },
    swallowKick: {
      cast(u, W, T, d) {
        const dir = dirTo(u, T);
        jumpAt(u, T.P.x - dir.x * 30, T.P.z - dir.z * 30, 0.7);
        W.fx.push({ kind: 'kickfire', u, life: 0.8, color: '#ffd166' });
        onLanding(u, W, 0.3, () => {
          for (const e of enemiesNear(u, W, u.P.x, u.P.z, 75)) shove(e, u.P.x - u.fx * 20, u.P.z - u.fz * 20, 800, 450, W, u, 80);
          W.flashes.push({ x: u.P.x, y: 6, z: u.P.z, life: 0.3, max: 0.3, r: 80 });
          W.shake = Math.max(W.shake, 6);
          SFX.play('slam');
        });
        SFX.play('whoosh');
      },
    },

    // ===== Ultraman Leo =====
    leoKick: {
      cast(u, W, T) {
        const dir = dirTo(u, T), tx = T.P.x - dir.x * 18, tz = T.P.z - dir.z * 18;
        jumpAt(u, tx, tz, 1.0);
        W.fx.push({ kind: 'kickfire', u, life: 1.1, color: '#ff6a2a' });
        every(W, DT, 60, () => {
          // The kicking leg out straight in front, burning.
          if (!u.alive) return false;
          const pts = u.body.pts, pel = pts[J.PELVIS], S = u.S;
          drive(pts[J.RFOOT], pel.x + u.fx * 24 * S, pel.y - 6 * S, pel.z + u.fz * 24 * S, 0.4, 0.4, { x: pel.x - pel.px, y: pel.y - pel.py, z: pel.z - pel.pz }, pel);
        });
        onLanding(u, W, 0.4, () => {
          const fx = u.body.pts[J.RFOOT];
          for (const e of enemiesNear(u, W, fx.x, fx.z, 95)) {
            const main = e === T || (fx.x - e.P.x) ** 2 + (fx.z - e.P.z) ** 2 < (40 + e.r) ** 2;
            shove(e, u.P.x - u.fx * 30, u.P.z - u.fz * 30, main ? 1000 : 600, main ? 600 : 350, W, u, main ? 170 : 60, main ? PIERCE : 0);
          }
          for (let i = 0; i < 16; i++) W.parts.push({ kind: 'fire', x: fx.x, y: fx.y + 4, z: fx.z, vx: rand(-200, 200), vy: rand(60, 260), vz: rand(-120, 120), life: rand(0.3, 0.6), max: 0.6, size: rand(5, 10) });
          W.flashes.push({ x: fx.x, y: 6, z: fx.z, life: 0.35, max: 0.35, r: 100 });
          W.shake = Math.max(W.shake, 9);
          SFX.play('boom');
        });
        SFX.play('whoosh');
      },
    },
    leoChop: {
      cast(u, W, T) {
        later(W, 0.2, () => {
          if (!u.alive || !alive(T)) return;
          const dir = dirTo(u, T);
          if (dir.d > u.t.reach + T.r + 25) return;
          hurt(T, 70, u.fx * 520, 300, u.fz * 520, u.P, W, u, PIERCE);
          const h = u.body.pts[J.RHAND];
          glowBits(W, h.x, h.y, h.z, 10, ['#ffffff', '#ffd166'], 70, 3);
          SFX.play('clank');
        });
      },
    },
    leoRush: {
      cast(u, W, T) {
        every(W, 0.11, 8, i => {
          if (!u.alive || !alive(T)) return false;
          const dir = dirTo(u, T);
          if (dir.d > u.t.reach + T.r + 30) return;
          const last = i === 7, k = last ? 850 : 90;
          hurt(T, last ? 45 : 14, u.fx * k, last ? 450 : 40, u.fz * k, u.P, W, u);
          SFX.play(last ? 'thud' : 'hit');
        });
      },
    },
    mant: {
      when: (u, W) => incoming(u, W, 300) >= 2 || u.hp < u.t.hp * 0.65 || enemiesNear(u, W, u.P.x, u.P.z, 90).length >= 3,
      cast(u, W) {
        u.mantUntil = W.time + 4;
        guardFrom(u, W, 4, 36 * u.S, 'reflect');
        // The cape whips round and knocks back anyone close.
        for (const e of enemiesNear(u, W, u.P.x, u.P.z, 60)) shove(e, u.P.x, u.P.z, 520, 260, W, u, 25);
        SFX.play('whoosh');
      },
    },
    shootingBeam: {
      cast(u, W, T) {
        later(W, 0.2, () => {
          if (!u.alive) return;
          const t = pick(u, W, T);
          if (t) fireBeam(u, W, t, { dmg: 45, knock: 260, width: 14, extra: 100, color: '#ff8a5a', beamW: 0.5, flashR: 60, shake: 3 });
          SFX.play('zap');
        });
      },
    },
  });

  // ---------- the Ultras ----------
  const ultra = { weapon: 'none', block: 0, ultra: true, body: 'ultra', onHurt: 'ultra', heavy: 1.2, anim: 0.55 };
  Object.assign(TYPES, {
    ultraseven: Object.assign({}, ultra, {
      name: 'Ultraseven', cost: 1900, hp: 850, S: 2.3, speed: 72, reach: 55, dmg: 34, cd: 1.2, knock: 480, style: 'chop', scheme: 'seven',
      skills: [
        { id: 'eyeSlugger', cd: 8, first: 1.5, range: 420, lock: 0.5, pose: 'head', call: 'EYE SLUGGER!', color: '#e6edf5' },
        { id: 'emerium', cd: 6, first: 3, range: 450, lock: 0.45, pose: 'head', call: 'EMERIUM RAY!', color: '#7dff9a' },
        { id: 'wideShot', cd: 18, first: 9, range: 520, crowd: 2, crowdR: 120, lock: 0.9, pose: 'L', call: 'WIDE SHOT!', color: '#ffd84a' },
        { id: 'capsule', cd: 1, first: 0.5, once: true, lock: 0.7, pose: 'throw' },
        { id: 'nenriki', cd: 13, first: 6, range: 340, lock: 1.0, pose: 'both', call: 'ULTRA NENRIKI!', color: '#c9a0ff' },
      ],
      blurb: 'The Ultra Warrior of Nebula M78, from 1967. Eye Slugger, Emerium Ray, Wide Shot, Ultra Nenriki, and a Capsule Monster to fight beside him.' }),
    ultrajack: Object.assign({}, ultra, {
      name: 'Ultraman Jack', cost: 1700, hp: 900, S: 2.3, speed: 72, reach: 55, dmg: 34, cd: 1.15, knock: 460, style: 'punch', scheme: 'jack',
      skills: [
        { id: 'jackSpecium', cd: 8, first: 3, range: 460, lock: 0.55, pose: 'cross', call: 'SPECIUM RAY!', color: '#c9f6ff' },
        { id: 'ultraSpark', cd: 9, first: 1.5, range: 400, lock: 0.45, pose: 'throw', call: 'ULTRA SPARK!', color: '#ffe066' },
        { id: 'ultraLance', cd: 10, first: 5, range: 440, min: 120, lock: 0.6, pose: 'throw', call: 'ULTRA LANCE!', color: '#e6edf5' },
        { id: 'defender', cd: 13, first: 2, lock: 0.4, pose: 'guard', call: 'ULTRA DEFENDER!', color: '#9fe8ff' },
        { id: 'hurricane', cd: 12, first: 4, range: 85, lock: 1.15, pose: 'spin', call: 'ULTRA HURRICANE!', color: '#9fe8ff' },
      ],
      blurb: 'The Return of Ultraman, 1971. Specium Ray, and an Ultra Bracelet that becomes a cutter, a lance or a shield. Spins monsters into the sky.' }),
    ultraace: Object.assign({}, ultra, {
      name: 'Ultraman Ace', cost: 1900, hp: 800, S: 2.3, speed: 70, reach: 55, dmg: 32, cd: 1.2, knock: 440, style: 'chop', scheme: 'ace',
      skills: [
        { id: 'metallium', cd: 10, first: 4, range: 470, lock: 0.8, pose: 'metallium', call: 'METALLIUM RAY!', color: '#ff9b4a' },
        { id: 'vGuillotine', cd: 8, first: 2, range: 440, lock: 0.5, pose: 'head', call: 'VERTICAL GUILLOTINE!', color: '#ffe066' },
        { id: 'circular', cd: 13, first: 6, range: 460, crowd: 2, crowdR: 200, lock: 0.7, pose: 'raise', call: 'CIRCULAR GUILLOTINE!', color: '#ffd166' },
        { id: 'punchLaser', cd: 4.5, first: 1, range: 400, lock: 0.4, pose: 'head', call: 'PUNCH LASER!', color: '#ffe066' },
        { id: 'aceBarrier', cd: 18, first: 3, lock: 0.6, pose: 'raise', call: 'ACE BARRIER!', color: '#9fe8ff' },
      ],
      blurb: 'Ultraman Ace, 1972: the Master of Cutters. Guillotines that cut through anything, the Metallium Ray, and a barrier over his friends.' }),
    ultrataro: Object.assign({}, ultra, {
      name: 'Ultraman Taro', cost: 2100, hp: 1150, S: 2.45, speed: 66, reach: 58, dmg: 40, cd: 1.35, knock: 520, style: 'punch', scheme: 'taro',
      skills: [
        { id: 'storium', cd: 11, first: 4, range: 480, lock: 1.0, pose: 'stormium', call: 'STORIUM RAY!', color: '#ffcf5a' },
        { id: 'dynamite', cd: 1, once: true, hp: 0.3, range: 140, lock: 2.3, pose: 'raise', call: 'ULTRA DYNAMITE!', color: '#ff6a2a' },
        { id: 'shower', cd: 11, first: 2, range: 280, lock: 0.7, pose: 'both', call: 'ULTRA SHOWER!', color: '#7fd6ff' },
        { id: 'hornCharge', cd: 9, first: 5, range: 260, min: 70, lock: 0.55, pose: 'crouch', call: 'ULTRA HORN!', color: '#e6edf5' },
        { id: 'swallowKick', cd: 10, first: 7, range: 320, min: 110, lock: 0.8, pose: 'raise', call: 'SWALLOW KICK!', color: '#ffd166' },
      ],
      blurb: 'Ultraman Taro, 1973, son of the Father and Mother of Ultra. Storium Ray, Ultra Shower, and Ultra Dynamite: he explodes, then reforms.' }),
    ultraleo: Object.assign({}, ultra, {
      name: 'Ultraman Leo', cost: 1600, hp: 850, S: 2.2, speed: 82, reach: 55, dmg: 40, cd: 0.95, knock: 470, style: 'punch', scheme: 'leo', dodge: 0.2,
      skills: [
        { id: 'leoKick', cd: 11, first: 3, range: 400, min: 100, lock: 1.1, pose: 'raise', call: 'LEO KICK!', color: '#ff7a3a' },
        { id: 'leoChop', cd: 4.5, first: 1, range: 72, lock: 0.45, pose: 'chop', call: 'LEO CHOP!', color: '#ffd166' },
        { id: 'leoRush', cd: 8, first: 4, range: 75, lock: 0.95, pose: 'rush', call: 'LEO PUNCH!', color: '#ffd166' },
        { id: 'mant', cd: 16, first: 2, lock: 0.5, pose: 'mant', call: 'ULTRA MANT!', color: '#ff5f5f' },
        { id: 'shootingBeam', cd: 7, first: 5, range: 420, min: 90, lock: 0.35, pose: 'point', call: 'SHOOTING BEAM!', color: '#ff8a5a' },
      ],
      blurb: 'Ultraman Leo, 1974, a karate master from Nebula L77. Leo Kick, Leo Chop, flurries of punches, and the Ultra Mant cape that turns blows aside.' }),

    // Ultraseven's Capsule Monsters (not for sale).
    windom: { name: 'Windom', cost: 0, hp: 380, S: 1.5, speed: 50, range: 280, dmg: 24, cd: 1.3, knock: 200, style: 'laser', anim: 0.5, weapon: 'none', hat: 'windom', block: 0, heavy: 1.4,
      blurb: 'A Capsule Monster: a robot from the Metal Planet with a beam lamp for a head.' },
    miclas: { name: 'Miclas', cost: 0, hp: 520, S: 1.7, speed: 55, reach: 45, dmg: 45, cd: 1.3, knock: 650, style: 'punch', anim: 0.7, weapon: 'none', hat: 'miclas', block: 0, heavy: 1.5,
      blurb: 'A Capsule Monster: a big-hearted red bull from the planet Bull Star.' },
    agira: { name: 'Agira', cost: 0, hp: 420, S: 1.6, speed: 90, reach: 40, dmg: 36, cd: 0.9, knock: 520, style: 'shove', anim: 0.55, weapon: 'none', hat: 'agira', block: 0, heavy: 1.3, leap: true, leapMax: 260, leapFlight: 0.6, slam: 60, slamR: 60,
      blurb: 'A Capsule Monster: a horned, armoured charger from the planet Animal.' },
  });
  // The original Ultraman gets the Color Timer warning too.
  TYPES.ultraman.onHurt = 'ultra';
  TYPES.ultraman.ultra = true;
  ORDER.push('ultraseven', 'ultrajack', 'ultraace', 'ultrataro', 'ultraleo');
})();
