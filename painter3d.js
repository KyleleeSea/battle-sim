'use strict';
// Draws ragdolls, weapons, projectiles and effects as a handful of instanced meshes, refilled every frame.
// Visual only: it reads the simulation and never changes it.

const TEAM = [
  { main: '#d9483b', dark: '#972a21', light: '#f08072', name: 'Red' },
  { main: '#3a6fd9', dark: '#22489c', light: '#7ea3f0', name: 'Blue' },
];
const PAL = {
  ink: '#2a2433', skin: '#f3c9a1', giantSkin: '#e3aa82', steel: '#c9d1dc', darkSteel: '#4f5560', wood: '#8a5a33',
  straw: '#e8c766', bronze: '#c9963c', white: '#f6f2ea', pants: '#4a4256', boot: '#2f2a36', ninja: '#2a2733',
  robe: '#f3efe6', gold: '#f4c542', leather: '#6e4b30', stone: '#8d8a86', bomb: '#2b2b30', hair: '#3a2a22',
  purple: '#6b4a8a', storm: '#3b4256', glass: '#9fd8ef',
};
// Per-unit clothing that differs from the default team shirt, team sleeves and grey trousers.
const LOOK = {
  knight: { limbs: 'steel', legs: 'steel', hands: 'steel' },
  ninja: { torso: 'ninja', limbs: 'ninja', legs: 'ninja', head: 'ninja', belt: 'main' },
  sumo: { torso: 'skin', limbs: 'skin', legs: 'skin', belt: 'main' },
  giant: { limbs: 'skin', legs: 'skin', belt: 'dark' },
  healer: { torso: 'robe', limbs: 'robe' },
};

const _colors = new Map();
function C(hex) {
  let c = _colors.get(hex);
  if (!c) { c = new THREE.Color(hex); _colors.set(hex, c); }
  return c;
}

class Batch {
  constructor(scene, geo, mat, max, shadow) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = !!shadow;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, C('#ffffff'));
    this.max = max; this.n = 0;
    scene.add(this.mesh);
  }
  add(m, col) {
    if (this.n >= this.max) return;
    this.mesh.setMatrixAt(this.n, m);
    this.mesh.setColorAt(this.n, col);
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.n = 0;
  }
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _d = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
const V3 = () => new THREE.Vector3();

class Painter {
  constructor(scene, cap) {
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
    const sph = new THREE.SphereGeometry(1, 14, 10);
    const dome = new THREE.SphereGeometry(1, 14, 7, 0, TAU, 0, PI / 2);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cone = new THREE.ConeGeometry(1, 1, 12); cone.translate(0, 0.5, 0);
    const torus = new THREE.TorusGeometry(1, 0.16, 6, 20); torus.rotateX(PI / 2);
    const solid = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const twoSided = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const puff = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    const flash = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    this.cyl = new Batch(scene, cyl, solid, cap * 16 + 1200, true);
    this.sph = new Batch(scene, sph, solid, cap * 16 + 200, true);
    this.dome = new Batch(scene, dome, twoSided, cap * 2, true);
    this.box = new Batch(scene, box, solid, cap * 5, true);
    this.cone = new Batch(scene, cone, solid, cap * 3 + 700, true);
    this.torus = new Batch(scene, torus, solid, Math.max(16, cap >> 2), false);
    this.gsph = new Batch(scene, sph, glow, cap * 2 + 2500, false);
    this.gcyl = new Batch(scene, cyl, glow, 2000, false);
    this.puff = new Batch(scene, sph, puff, 2500, false);
    this.flash = new Batch(scene, sph, flash, 80, false);
    this.all = [this.cyl, this.sph, this.dome, this.box, this.cone, this.torus, this.gsph, this.gcyl, this.puff, this.flash];
    // Scratch vectors for one unit's frame and one weapon's frame.
    this.f = V3(); this.u = V3(); this.r = V3();
    this.wd = V3(); this.wx = V3(); this.wz = V3();
    this.t1 = V3(); this.t2 = V3(); this.t3 = V3();
  }

  end() { for (const b of this.all) b.end(); }

  // ---------- primitives ----------
  seg(b, a, c, r, col) {
    const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 1e-4) return;
    _d.set(dx / L, dy / L, dz / L); _q.setFromUnitVectors(_Y, _d);
    _p.set((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2); _s.set(r, L, r);
    _m.compose(_p, _q, _s); b.add(_m, col);
  }
  ball(b, p, r, col) {
    _p.set(p.x, p.y, p.z); _q.identity(); _s.set(r, r, r);
    _m.compose(_p, _q, _s); b.add(_m, col);
  }
  // A primitive with its own axes (unit, perpendicular), scaled per axis and centred at p.
  axes(b, p, X, Y, Z, sx, sy, sz, col) {
    _m.set(X.x * sx, Y.x * sy, Z.x * sz, p.x, X.y * sx, Y.y * sy, Z.y * sz, p.y, X.z * sx, Y.z * sy, Z.z * sz, p.z, 0, 0, 0, 1);
    b.add(_m, col);
  }
  spike(p, dir, r, h, col) {
    _d.copy(dir).normalize(); _q.setFromUnitVectors(_Y, _d);
    _p.set(p.x, p.y, p.z); _s.set(r, h, r);
    _m.compose(_p, _q, _s); this.cone.add(_m, col);
  }
  // o + a*A + b*B + c*Cv into out.
  at(out, o, A, a, B, b, Cv, c) {
    return out.set(o.x + A.x * a + (B ? B.x * b : 0) + (Cv ? Cv.x * c : 0), o.y + A.y * a + (B ? B.y * b : 0) + (Cv ? Cv.y * c : 0), o.z + A.z * a + (B ? B.z * b : 0) + (Cv ? Cv.z * c : 0));
  }

  // ---------- units ----------
  unit(u) {
    const B = u.body.pts, S = u.S, t = u.t, look = LOOK[u.key] || {}, team = TEAM[u.team];
    const white = u.hitFlash > 0 ? C('#ffffff') : null;
    const col = hex => white || C(hex);
    const fat = t.fat || 1, limbR = Math.sqrt(fat);
    const pe = B[J.PELVIS], ch = B[J.CHEST], hd = B[J.HEAD];
    const f = this.f, up = this.u, r = this.r;
    up.set(ch.x - pe.x, ch.y - pe.y, ch.z - pe.z).normalize();
    f.set(u.fx, 0, u.fz);
    f.addScaledVector(up, -f.dot(up));
    if (f.lengthSq() < 1e-4) f.set(u.fx, 0, u.fz);
    f.normalize();
    r.crossVectors(f, up).normalize();

    const skin = u.key === 'giant' ? PAL.giantSkin : PAL.skin;
    const pick = (k, dflt) => (k === 'steel' ? PAL.steel : k === 'skin' ? skin : k === 'ninja' ? PAL.ninja : k === 'robe' ? PAL.robe : dflt);
    const shirt = col(pick(look.torso, team.main)), sleeve = col(pick(look.limbs, team.light));
    const legs = col(pick(look.legs, PAL.pants)), hand = col(pick(look.hands, skin)), headCol = col(pick(look.head, skin));

    // Torso as a capsule, plus belt.
    this.seg(this.cyl, pe, ch, 7 * S * fat, shirt);
    this.ball(this.sph, ch, 7 * S * fat, shirt);
    this.ball(this.sph, pe, 6.6 * S * fat, look.belt ? col(team[look.belt]) : shirt);
    if (look.belt) this.seg(this.cyl, this.at(this.t1, pe, up, -1 * S), this.at(this.t2, pe, up, 3 * S), 7.1 * S * fat, col(team[look.belt]));

    // Legs from the hips, arms from the shoulders.
    for (const side of [-1, 1]) {
      const knee = B[side < 0 ? J.LKNEE : J.RKNEE], foot = B[side < 0 ? J.LFOOT : J.RFOOT];
      const hip = this.at(this.t3, pe, r, side * 3.6 * S * fat, up, -1.5 * S);
      this.seg(this.cyl, hip, knee, 3.5 * S * limbR, legs);
      this.ball(this.sph, knee, 3.5 * S * limbR, legs);
      this.seg(this.cyl, knee, foot, 3.3 * S * limbR, legs);
      this.ball(this.sph, foot, 3.9 * S * limbR, col(PAL.boot));
      const el = B[side < 0 ? J.LELB : J.RELB], hn = B[side < 0 ? J.LHAND : J.RHAND];
      const sh = this.at(this.t3, ch, r, side * 6.4 * S * fat, up, -2.2 * S);
      this.ball(this.sph, sh, 3.4 * S * limbR, sleeve);
      this.seg(this.cyl, sh, el, 3.1 * S * limbR, sleeve);
      this.ball(this.sph, el, 3.0 * S * limbR, sleeve);
      this.seg(this.cyl, el, hn, 2.8 * S * limbR, sleeve);
      this.ball(this.sph, hn, 3.3 * S * limbR, hand);
    }

    // Head, eyes, hat.
    this.ball(this.sph, hd, 8 * S, headCol);
    if (u.key === 'ninja') this.axes(this.box, this.at(this.t1, hd, f, 7.2 * S, up, -0.2 * S), r, up, f, 9.5 * S, 3 * S, 1.6 * S, col(skin));
    const eyeR = u.alive ? 1.3 * S : 0.6 * S;
    for (const side of [-1, 1]) this.ball(this.sph, this.at(this.t1, hd, f, 7.6 * S, up, -0.2 * S, r, side * 2.7 * S), eyeR, C(PAL.ink));
    this.hat(u, hd, f, up, r, S, team, col);

    // Weapons and shields.
    this.weapon(u, 'r', col);
    if (t.shield) this.shield(u, col);
    else this.weapon(u, 'l', col);
  }

  hat(u, H, f, up, r, S, team, col) {
    const t1 = this.t1, t2 = this.t2;
    const dome = (lift, rad, hex, sy) => this.axes(this.dome, this.at(t1, H, up, lift * S), r, up, f, rad * S, (sy || rad) * S, rad * S, col(hex));
    switch (u.t.hat) {
      case 'straw':
        this.seg(this.cyl, this.at(t1, H, up, 4.6 * S), this.at(t2, H, up, 5.8 * S), 14 * S, col(PAL.straw));
        this.seg(this.cyl, this.at(t1, H, up, 5 * S), this.at(t2, H, up, 10 * S), 6.2 * S, col(PAL.straw));
        break;
      case 'helm': dome(1.5, 8.8, PAL.steel); break;
      case 'crest':
        dome(1.5, 8.8, PAL.bronze);
        this.axes(this.box, this.at(t1, H, up, 10.5 * S, f, -1 * S), r, up, f, 1.6 * S, 5 * S, 13 * S, col(team.main));
        break;
      case 'horns':
        dome(1.5, 8.8, PAL.steel);
        for (const s of [-1, 1]) this.spike(this.at(t1, H, r, s * 6.5 * S, up, 3.5 * S), this.at(t2, r, r, s * 0.75 - 1, up, 0.7), 1.9 * S, 9 * S, col(PAL.white));
        break;
      case 'hood':
        this.ball(this.sph, this.at(t1, H, f, -2.5 * S, up, -1 * S), 8.4 * S, col(team.dark));
        this.axes(this.dome, this.at(t1, H, up, 0.6 * S, f, -1.2 * S), r, up, f, 9.6 * S, 9.6 * S, 9.6 * S, col(team.dark));
        break;
      case 'band':
        this.seg(this.cyl, this.at(t1, H, up, 2 * S), this.at(t2, H, up, 4.5 * S), 8.35 * S, col(team.main));
        break;
      case 'wizard':
      case 'storm': {
        const hatHex = u.t.hat === 'storm' ? PAL.storm : team.main;
        this.seg(this.cyl, this.at(t1, H, up, 5 * S), this.at(t2, H, up, 6 * S), 13 * S, col(u.t.hat === 'storm' ? team.main : team.dark));
        this.spike(this.at(t1, H, up, 5.5 * S), this.at(t2, up, up, 0, f, -0.25), 8 * S, (u.t.hat === 'storm' ? 22 : 19) * S, col(hatHex));
        this.spike(this.at(t1, H, f, 5 * S, up, -3.5 * S), this.at(t2, up, up, -2, f, 0.35), 4.5 * S, 10 * S, col(u.t.hat === 'storm' ? '#c8ccd6' : PAL.white));
        break;
      }
      case 'knight':
        this.seg(this.cyl, this.at(t1, H, up, -7.5 * S), this.at(t2, H, up, 6 * S), 8.9 * S, col(PAL.steel));
        this.axes(this.dome, this.at(t1, H, up, 6 * S), r, up, f, 8.9 * S, 4 * S, 8.9 * S, col(PAL.steel));
        this.axes(this.box, this.at(t1, H, f, 8.8 * S, up, 1 * S), r, up, f, 8 * S, 1.3 * S, 0.8 * S, C(PAL.ink));
        this.spike(this.at(t1, H, up, 9.5 * S), up, 2.2 * S, 8 * S, col(team.main));
        break;
      case 'ninja':
        this.seg(this.cyl, this.at(t1, H, f, -7.5 * S, up, 2 * S), this.at(t2, H, f, -15 * S, up, -2 * S, r, 2 * S), 0.8 * S, col(team.main));
        break;
      case 'tricorn':
        this.seg(this.cyl, this.at(t1, H, up, 5.2 * S), this.at(t2, H, up, 6.4 * S), 11.5 * S, col('#3a2a22'));
        this.axes(this.dome, this.at(t1, H, up, 5.6 * S), r, up, f, 7 * S, 5 * S, 7 * S, col('#3a2a22'));
        this.axes(this.box, this.at(t1, H, up, 9 * S, r, 4 * S, f, -2 * S), r, up, f, 0.7 * S, 7 * S, 1.8 * S, col(team.main));
        break;
      case 'aviator':
        dome(0.8, 8.9, PAL.leather);
        for (const s of [-1, 1]) this.ball(this.sph, this.at(t1, H, f, 7.4 * S, up, 3.2 * S, r, s * 3 * S), 2.1 * S, col(PAL.glass));
        break;
      case 'halo':
        dome(0.6, 8.7, PAL.robe);
        this.axes(this.torus, this.at(t1, H, up, 13 * S), r, up, f, 6.5 * S, 6.5 * S, 6.5 * S, C(PAL.gold));
        break;
      case 'sumo':
        dome(1, 8.4, PAL.ink);
        this.ball(this.sph, this.at(t1, H, up, 9 * S, f, -2.5 * S), 3.4 * S, C(PAL.ink));
        break;
      case 'giant':
        this.ball(this.sph, this.at(t1, H, up, 7 * S, f, -1 * S), 3 * S, C(PAL.hair));
        break;
    }
  }

  // Sets this.wd (along the forearm), this.wx (sideways) and this.wz (the blade's broad axis).
  weaponFrame(hand, elbow) {
    const d = this.wd.set(hand.x - elbow.x, hand.y - elbow.y, hand.z - elbow.z);
    if (d.lengthSq() < 1e-6) d.copy(this.f);
    d.normalize();
    this.wx.crossVectors(d, _Y);
    if (this.wx.lengthSq() < 1e-4) this.wx.copy(this.r);
    this.wx.normalize();
    this.wz.crossVectors(this.wx, d).normalize();
  }

  weapon(u, side, col) {
    const B = u.body.pts, S = u.S, w = u.t.weapon;
    const h = B[side === 'r' ? J.RHAND : J.LHAND], e = B[side === 'r' ? J.RELB : J.LELB];
    const dual = w === 'axe' || w === 'katana';
    if (side === 'l' && !dual && w !== 'bow') return;
    if (side === 'r' && w === 'bow') return;
    this.weaponFrame(h, e);
    const d = this.wd, X = this.wx, Z = this.wz, t1 = this.t1, t2 = this.t2, t3 = this.t3;
    const along = (out, k) => this.at(out, h, d, k * S);
    switch (w) {
      case 'fork': {
        this.seg(this.cyl, along(t1, -12), along(t2, 30), 1.1 * S, col(PAL.wood));
        const tip = along(t3, 30);
        this.seg(this.cyl, this.at(t1, tip, Z, -4 * S), this.at(t2, tip, Z, 4 * S), 0.7 * S, col(PAL.darkSteel));
        for (const o of [-3.5, 0, 3.5]) this.seg(this.cyl, this.at(t1, tip, Z, o * S), this.at(t2, tip, Z, o * S, d, 8 * S), 0.55 * S, col(PAL.steel));
        break;
      }
      case 'sword':
      case 'greatsword': {
        const big = w === 'greatsword', len = big ? 34 : 24;
        this.seg(this.cyl, along(t1, -3), along(t2, 1), 1 * S, col(PAL.leather));
        this.axes(this.box, along(t1, 1.5), X, d, Z, 1.2 * S, 1.2 * S, (big ? 11 : 8) * S, col(PAL.bronze));
        this.axes(this.box, along(t1, 2 + len / 2), X, d, Z, 0.7 * S, len * S, (big ? 3.6 : 2.8) * S, col(PAL.steel));
        break;
      }
      case 'katana':
        this.seg(this.cyl, along(t1, -4), along(t2, 1), 0.9 * S, col(PAL.ink));
        this.ball(this.sph, along(t1, 1.5), 1.6 * S, C(PAL.bronze));
        this.axes(this.box, along(t1, 16), X, d, Z, 0.5 * S, 28 * S, 1.9 * S, col(PAL.steel));
        break;
      case 'spear':
        this.seg(this.cyl, along(t1, -26), along(t2, 38), 1.1 * S, col(PAL.wood));
        this.spike(along(t1, 38), d, 2.2 * S, 9 * S, col(PAL.steel));
        break;
      case 'axe':
        this.seg(this.cyl, along(t1, -5), along(t2, 18), 1.1 * S, col(PAL.wood));
        this.axes(this.box, this.at(t1, h, d, 15 * S, Z, 3 * S), X, d, Z, 0.9 * S, 7 * S, 7 * S, col(PAL.steel));
        break;
      case 'staff': {
        const hex = u.t.heal ? PAL.wood : u.t.chain ? PAL.darkSteel : PAL.purple;
        this.seg(this.cyl, along(t1, -14), along(t2, 22), 1.2 * S, col(hex));
        const casting = u.act === 'attack' && !u.fired;
        const orb = u.t.heal ? '#9be8a0' : u.t.chain ? '#8fe3ff' : casting ? '#ffb347' : TEAM[u.team].light;
        this.ball(this.gsph, along(t1, 24.5), (casting ? 5.2 : 3.6) * S, C(orb));
        break;
      }
      case 'musket':
        this.seg(this.cyl, along(t1, -9), along(t2, 3), 1.9 * S, col(PAL.wood));
        this.seg(this.cyl, along(t1, 3), along(t2, 36), 0.9 * S, col(PAL.darkSteel));
        break;
      case 'bow': {
        const drawing = u.act === 'attack' && u.actT < 0.8;
        const nock = drawing ? B[J.RHAND] : along(t3, -3);
        const bowCol = col('#7a4a26'), string = C('#f4efe4');
        for (const s of [-1, 1]) {
          const mid = this.at(t1, h, Z, s * 7 * S, d, 1 * S), tip = this.at(t2, h, Z, s * 13 * S, d, -3 * S);
          this.seg(this.cyl, h, mid, 0.9 * S, bowCol);
          this.seg(this.cyl, mid, tip, 0.8 * S, bowCol);
          this.seg(this.cyl, tip, nock, 0.22 * S, string);
        }
        if (drawing) this.seg(this.cyl, nock, along(t1, 5), 0.45 * S, col(PAL.wood));
        break;
      }
      case 'bomb':
        if (side === 'r' && u.alive) {
          const a = B[J.LHAND], b = B[J.RHAND];
          const m = t1.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2).addScaledVector(this.u, 4 * S);
          this.ball(this.sph, m, 6 * S, C(PAL.bomb));
          this.ball(this.gsph, this.at(t2, m, this.u, 6.5 * S), (1 + Math.random() * 0.6) * S, C(Math.random() < 0.5 ? '#ffd166' : '#ff7a3d'));
        }
        break;
      case 'none':
        if (u.key === 'thrower' && side === 'r' && !(u.act === 'attack' && u.fired)) {
          const a = B[J.LHAND], b = B[J.RHAND];
          this.ball(this.sph, t1.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 6 * S, (a.z + b.z) / 2), 9 * S, C(PAL.stone));
        }
        break;
    }
  }

  shield(u, col) {
    const B = u.body.pts, S = u.S, h = B[J.LHAND], f = this.f, up = this.u, r = this.r, team = TEAM[u.team];
    if (u.t.shield === 'round') {
      this.seg(this.cyl, this.at(this.t1, h, f, 1.5 * S), this.at(this.t2, h, f, 3.2 * S), 11 * S, col(PAL.bronze));
      this.seg(this.cyl, this.at(this.t1, h, f, 3.2 * S), this.at(this.t2, h, f, 3.7 * S), 7.5 * S, col(team.main));
    } else {
      this.axes(this.box, this.at(this.t1, h, f, 2.5 * S), r, up, f, 9 * S, 13 * S, 1.4 * S, col(team.main));
      this.axes(this.box, this.at(this.t1, h, f, 3.3 * S), r, up, f, 2.4 * S, 11 * S, 0.6 * S, col(team.light));
    }
  }

  // ---------- projectiles and effects ----------
  proj(p) {
    const t1 = this.t1, t2 = this.t2;
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz) || 1;
    const nx = p.vx / sp, ny = p.vy / sp, nz = p.vz / sp;
    if (p.kind === 'arrow') {
      t1.set(p.x - nx * 17, p.y - ny * 17, p.z - nz * 17);
      this.seg(this.cyl, t1, p, 0.6, C(PAL.wood));
      this.seg(this.cyl, t1, t2.set(t1.x + nx * 4, t1.y + ny * 4, t1.z + nz * 4), 1.5, C(PAL.white));
      this.spike(t1.set(p.x - nx * 1, p.y - ny * 1, p.z - nz * 1), _d.set(nx, ny, nz), 1.1, 3, C(PAL.darkSteel));
    } else if (p.kind === 'bullet') {
      this.ball(this.gsph, p, 1.6, C('#fff3b0'));
      this.seg(this.gcyl, t1.set(p.x - nx * 30, p.y - ny * 30, p.z - nz * 30), p, 0.5, C('#fff7d6'));
    } else if (p.kind === 'boulder') {
      this.ball(this.sph, p, p.r, C(PAL.stone));
    } else {
      this.ball(this.gsph, p, 6.5, C('#ffb347'));
    }
  }

  effects(W) {
    for (const q of W.parts) {
      const t = q.life / q.max;
      if (q.kind === 'puff') this.ball(this.puff, q, q.size * (0.4 + 0.9 * t), C(q.color));
      else if (q.kind === 'fire') this.ball(this.gsph, q, q.size * (0.5 + 0.6 * t), C(t > 0.5 ? '#ffd166' : '#f2622e'));
      else this.ball(this.gsph, q, 1.1, C('#ffe58a'));
    }
    for (const fl of W.flashes) {
      const t = fl.life / fl.max;
      this.ball(this.flash, fl, (1 - t) * fl.r * 0.9 + 8, C(fl.bolt ? '#cfefff' : '#fff3c4'));
    }
    for (const b of W.bolts) {
      for (let i = 1; i < b.pts.length; i++) {
        const a = b.pts[i - 1], c = b.pts[i];
        this.seg(this.gcyl, this.t1.set(a[0], a[1], a[2]), this.t2.set(c[0], c[1], c[2]), 1.6, C('#e8fbff'));
      }
    }
    for (const bm of W.beams) {
      const s = bm.a.body.pts[J.RHAND], c = bm.b.body.pts[J.CHEST];
      this.seg(this.gcyl, this.t1.set(s.x, s.y + 22 * bm.a.S, s.z), c, 1.3, C('#9be8a0'));
      this.ball(this.gsph, c, 4 * bm.b.S * (bm.life / 0.4), C('#c9f5cc'));
    }
  }
}
