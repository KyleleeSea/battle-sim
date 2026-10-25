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
  fur: '#a0663a', furLight: '#c08552', lebronSkin: '#7b4a2d', beard: '#241812', ball: '#e2711d', sneaker: '#f4f4f4', shadow: '#1d1b22',
  feather: '#f7f4ee', beak: '#f0a030', comb: '#e0393e', grey: '#d8d8dc', fish: '#7fa6b8', crust: '#e8c98f', cream: '#fffaf0',
  burlap: '#cdb07a', witch: '#9fc78a', witchBlack: '#2c2433', monkey: '#6b4a2e', monkeyFace: '#e0b58f', banana: '#f5d33b',
  robot: '#9aa3ad', robotDark: '#5d6570', laser: '#ff4d4d', bark: '#6e4a2c', leaf: '#4f9a3a', leafLight: '#6cb84a',
  pink: '#f07ab0', blond: '#f2d16b', afro: '#2b1d16', iron: '#2b2b30',
};
// Skin, fur, bark or plating, for units that aren't plain people.
const SKIN_OF = { giant: PAL.giantSkin, lebron: PAL.lebronSkin, squirrel: PAL.fur, witch: PAL.witch, monkey: PAL.monkey, treant: PAL.bark, robot: PAL.robot, chicken: PAL.feather,
  djkhaled: '#6b4229', miner: '#9ab07a', hogrider: '#c98a5e', ultraman: '#c9ced6', megaknight: '#3d4350' };
// Per-unit clothing that differs from the default team shirt, team sleeves and grey trousers.
const LOOK = {
  knight: { limbs: 'steel', legs: 'steel', hands: 'steel' },
  ninja: { torso: 'ninja', limbs: 'ninja', legs: 'ninja', head: 'ninja', belt: 'main' },
  sumo: { torso: 'skin', limbs: 'skin', legs: 'skin', belt: 'main' },
  giant: { limbs: 'skin', legs: 'skin', belt: 'dark' },
  healer: { torso: 'robe', limbs: 'robe' },
  squirrel: { limbs: 'skin', legs: 'skin', boot: PAL.fur },
  lebron: { limbs: 'skin', thigh: 'team', shin: 'skin', boot: PAL.sneaker },
  mystery: { all: PAL.shadow },
  chicken: { torso: 'skin', limbs: 'skin', legs: PAL.beak, head: 'skin', hands: 'skin', boot: PAL.beak, belt: 'main' },
  grandma: { legs: '#c9c3d6', boot: '#5a4a3a' },
  fishmonger: { legs: '#3a4a5c', boot: '#2f3a44' },
  jester: { legs: 'team' },
  bard: { legs: '#5b4a3a' },
  disco: { limbs: 'team', legs: '#ffffff', boot: '#ffffff' },
  scarecrow: { limbs: PAL.straw, legs: '#7a6a4f', head: PAL.burlap, hands: PAL.straw, boot: '#7a6a4f' },
  cupid: { torso: '#ffffff', limbs: 'skin', legs: 'skin', boot: PAL.skin, belt: 'main' },
  witch: { torso: PAL.witchBlack, limbs: PAL.witchBlack, legs: PAL.witchBlack, belt: 'main' },
  monkey: { limbs: 'skin', legs: 'skin', hands: PAL.monkeyFace, boot: PAL.monkey },
  pirate: { legs: '#3b3226', boot: '#1f1b22' },
  robot: { torso: 'skin', limbs: 'skin', legs: 'skin', hands: PAL.robotDark, boot: PAL.robotDark, belt: 'main', boxy: true },
  treant: { torso: 'skin', limbs: 'skin', legs: 'skin', hands: 'skin', boot: '#4d3420', belt: 'main' },
  djkhaled: { limbs: 'skin', legs: '#2b2b30', boot: '#f4f4f4' },
  miner: { limbs: 'skin', legs: '#4a5a6a', boot: '#3a2a22' },
  megaknight: { torso: 'skin', limbs: 'skin', legs: 'skin', hands: '#2b3038', boot: '#2b3038', belt: 'main', noEyes: true },
  hogrider: { limbs: 'skin', legs: '#5a4632', boot: '#3a2a22' },
  ultraman: { torso: 'skin', limbs: '#d8262c', thigh: 'skin', shin: '#d8262c', hands: 'skin', boot: 'skin', belt: 'main', noEyes: true },
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

// A 128px canvas texture for floating markers, redrawn once web fonts arrive.
function glyphTexture(paint) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  const draw = () => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 128, 128);
    x.lineWidth = 12; x.strokeStyle = PAL.ink; x.lineJoin = 'round';
    paint(x);
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  return tex;
}

// A gold "?" for hidden units.
const questionTexture = () => glyphTexture(x => {
  x.font = '110px "Lilita One", "Arial Rounded MT Bold", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.strokeText('?', 64, 70);
  x.fillStyle = '#f4b62e'; x.fillText('?', 64, 70);
});

// Wide text on a transparent background: a callout above DJ Khaled, the label on a brick.
function wordTexture(text, fill, size) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  const draw = () => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, 512, 128);
    x.font = `${size}px "Lilita One", "Arial Rounded MT Bold", sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 12; x.strokeStyle = PAL.ink; x.lineJoin = 'round';
    x.strokeText(text, 256, 68);
    x.fillStyle = fill; x.fillText(text, 256, 68);
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  return tex;
}

// A pink heart over charmed units.
const heartTexture = () => glyphTexture(x => {
  x.beginPath();
  x.moveTo(64, 110);
  x.bezierCurveTo(8, 70, 12, 20, 44, 20);
  x.bezierCurveTo(56, 20, 62, 28, 64, 36);
  x.bezierCurveTo(66, 28, 72, 20, 84, 20);
  x.bezierCurveTo(116, 20, 120, 70, 64, 110);
  x.closePath();
  x.stroke();
  x.fillStyle = '#ff6fa8'; x.fill();
});

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _d = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0), _X = new THREE.Vector3(1, 0, 0), _Z = new THREE.Vector3(0, 0, 1);
const V3 = () => new THREE.Vector3();

class Painter {
  constructor(scene, cap) {
    this.scene = scene;
    this.camQ = new THREE.Quaternion();
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
    const plane = new THREE.PlaneGeometry(1, 1);
    this.qmark = new Batch(scene, plane, new THREE.MeshBasicMaterial({ map: questionTexture(), transparent: true, depthWrite: false }), cap, false);
    this.hearts = new Batch(scene, plane, new THREE.MeshBasicMaterial({ map: heartTexture(), transparent: true, depthWrite: false }), cap, false);
    const words = (text, fill, size) => new THREE.MeshBasicMaterial({ map: wordTexture(text, fill, size), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.callout = new Batch(scene, plane, words('ANOTHER ONE!', '#ffd166', 84), 32, false);
    this.label = new Batch(scene, plane, words('databrick', '#ffffff', 96), Math.max(16, cap >> 2), false);
    this.all = [this.cyl, this.sph, this.dome, this.box, this.cone, this.torus, this.gsph, this.gcyl, this.puff, this.flash, this.qmark, this.hearts, this.callout, this.label];
    // Scratch vectors for one unit's frame and one weapon's frame.
    this.f = V3(); this.u = V3(); this.r = V3();
    this.wd = V3(); this.wx = V3(); this.wz = V3();
    this.t1 = V3(); this.t2 = V3(); this.t3 = V3(); this.t4 = V3(); this.t5 = V3(); this.nr = V3();
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
    const B = u.body.pts, S = u.S, t = u.t, look = LOOK[u.key] || {}, team = TEAM[u.home];
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

    const team0 = TEAM[u.home], col0 = col;
    if (u.burrow) { this.mound(u); return; }
    if (t.body === 'fish') { this.fishBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'dragon') { this.dragonBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'brick') { this.brickBody(u, f, up, r, S, team0, col0); return; }

    const skin = SKIN_OF[u.key] || PAL.skin;
    const pick = (k, dflt) => look.all || (k && k[0] === '#' ? k : k === 'steel' ? PAL.steel : k === 'skin' ? skin : k === 'ninja' ? PAL.ninja
      : k === 'robe' ? PAL.robe : k === 'team' ? team.main : dflt);
    const shirt = col(pick(look.torso, team.main)), sleeve = col(pick(look.limbs, team.light));
    const thigh = col(pick(look.thigh || look.legs, PAL.pants)), shin = col(pick(look.shin || look.legs, PAL.pants));
    const hand = col(pick(look.hands, skin)), headCol = col(pick(look.head, skin)), boot = col(look.all || look.boot || PAL.boot);

    // Torso as a capsule (or a box, for robots), plus belt.
    if (look.boxy) {
      const len = Math.sqrt((ch.x - pe.x) ** 2 + (ch.y - pe.y) ** 2 + (ch.z - pe.z) ** 2);
      this.axes(this.box, this.t1.set((pe.x + ch.x) / 2, (pe.y + ch.y) / 2, (pe.z + ch.z) / 2), r, up, f, 15 * S, len + 8 * S, 11 * S, shirt);
    } else {
      this.seg(this.cyl, pe, ch, 7 * S * fat, shirt);
      this.ball(this.sph, ch, 7 * S * fat, shirt);
      this.ball(this.sph, pe, 6.6 * S * fat, look.belt ? col(team[look.belt]) : shirt);
    }
    if (look.belt) this.seg(this.cyl, this.at(this.t1, pe, up, -1 * S), this.at(this.t2, pe, up, 3 * S), 7.1 * S * fat, col(team[look.belt]));

    // Legs from the hips, arms from the shoulders.
    for (const side of [-1, 1]) {
      const knee = B[side < 0 ? J.LKNEE : J.RKNEE], foot = B[side < 0 ? J.LFOOT : J.RFOOT];
      const hip = this.at(this.t3, pe, r, side * 3.6 * S * fat, up, -1.5 * S);
      this.seg(this.cyl, hip, knee, 3.5 * S * limbR, thigh);
      this.ball(this.sph, knee, 3.5 * S * limbR, thigh);
      this.seg(this.cyl, knee, foot, 3.3 * S * limbR, shin);
      this.ball(this.sph, foot, 3.9 * S * limbR, boot);
      if (side > 0 && t.mount) this.hog(u, pe, f, up, r, S, col);
      const el = B[side < 0 ? J.LELB : J.RELB], hn = B[side < 0 ? J.LHAND : J.RHAND];
      const sh = this.at(this.t3, ch, r, side * 6.4 * S * fat, up, -2.2 * S);
      this.ball(this.sph, sh, 3.4 * S * limbR, sleeve);
      this.seg(this.cyl, sh, el, 3.1 * S * limbR, sleeve);
      this.ball(this.sph, el, 3.0 * S * limbR, sleeve);
      this.seg(this.cyl, el, hn, 2.8 * S * limbR, sleeve);
      this.ball(this.sph, hn, 3.3 * S * limbR, hand);
    }

    // Head, eyes, hat.
    if (look.boxy) this.axes(this.box, hd, r, up, f, 14 * S, 13 * S, 13 * S, headCol);
    else this.ball(this.sph, hd, 8 * S, headCol);
    if (u.key === 'ninja') this.axes(this.box, this.at(this.t1, hd, f, 7.2 * S, up, -0.2 * S), r, up, f, 9.5 * S, 3 * S, 1.6 * S, col(skin));
    const eyeR = (u.alive ? 1.3 : 0.6) * S * (u.key === 'squirrel' ? 1.4 : 1);
    if (look.boxy) for (const side of [-1, 1]) this.ball(this.gsph, this.at(this.t1, hd, f, 6.8 * S, up, 1 * S, r, side * 3 * S), 1.6 * S, C(u.alive ? '#7ff3ff' : PAL.robotDark));
    else if (!look.all && !look.noEyes) for (const side of [-1, 1]) this.ball(this.sph, this.at(this.t1, hd, f, 7.6 * S, up, -0.2 * S, r, side * 2.7 * S), eyeR, C(PAL.ink));
    if (u.key === 'squirrel') this.tail(u, pe, f, up, r, S, col);
    if (u.key === 'monkey') this.tail(u, pe, f, up, r, S, col, true);
    if (u.alive && u.charm > 0) this.billboard(this.hearts, this.at(this.t1, hd, _Y, 16 * S), 12 * S, C('#ffffff'));
    if (u.alive && u.inspired > 0) this.ball(this.gsph, this.at(this.t1, hd, _Y, (13 + Math.sin(u.phase * 2)) * S), 2 * S, C('#ffd166'));
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
      case 'squirrel':
        for (const s of [-1, 1]) this.spike(this.at(t1, H, up, 6 * S, r, s * 4 * S), this.at(t2, up, r, s * 0.25), 2.4 * S, 6 * S, col(PAL.fur));
        this.ball(this.sph, this.at(t1, H, f, 8 * S, up, -1.6 * S), 1.5 * S, C(PAL.ink));
        this.axes(this.box, this.at(t1, H, f, 7.4 * S, up, -4 * S), r, up, f, 2.6 * S, 2.6 * S, 0.9 * S, col(PAL.white));
        break;
      case 'lebron':
        this.axes(this.dome, this.at(t1, H, up, 1 * S), r, up, f, 8.4 * S, 5.5 * S, 8.4 * S, col(PAL.beard));
        this.seg(this.cyl, this.at(t1, H, up, 2.4 * S), this.at(t2, H, up, 4.4 * S), 8.3 * S, col(PAL.white));
        this.axes(this.sph, this.at(t1, H, f, 3.6 * S, up, -4.4 * S), r, up, f, 6 * S, 4 * S, 5 * S, col(PAL.beard));
        break;
      case 'mystery':
        this.billboard(this.qmark, this.at(t1, H, up, 0, _Y, 17 * S), 15 * S, C('#ffffff'));
        break;
      case 'chicken':
        for (const o of [-2.5, 0, 2.5]) this.ball(this.sph, this.at(t1, H, up, 7.5 * S - Math.abs(o) * 0.4 * S, f, o * S), 2.6 * S, col(PAL.comb));
        this.spike(this.at(t1, H, f, 7 * S, up, -1 * S), f, 2.2 * S, 5 * S, col(PAL.beak));
        this.ball(this.sph, this.at(t1, H, f, 6 * S, up, -5 * S), 1.9 * S, col(PAL.comb));
        break;
      case 'granny':
        dome(0.8, 8.5, PAL.grey);
        this.ball(this.sph, this.at(t1, H, up, 7 * S, f, -4 * S), 3.8 * S, col(PAL.grey));
        for (const s of [-1, 1]) this.axes(this.torus, this.at(t1, H, f, 8.4 * S, up, -0.2 * S, r, s * 2.8 * S), r, f, up, 2.3 * S, 2.3 * S, 2.3 * S, C(PAL.ink));
        break;
      case 'cap':
        this.axes(this.dome, this.at(t1, H, up, 2 * S), r, up, f, 8.8 * S, 4.5 * S, 8.8 * S, col('#5b6b5a'));
        this.axes(this.box, this.at(t1, H, up, 2.6 * S, f, 8 * S), r, up, f, 10 * S, 0.9 * S, 5 * S, col('#4a5849'));
        break;
      case 'jester':
        for (const s of [-1, 1]) {
          const base = this.at(t1, H, up, 5 * S, r, s * 3 * S);
          const dir = this.at(t2, r, r, s * 0.9 - 1, up, 0.6, f, -0.2).normalize();
          this.spike(base, dir, 3.6 * S, 13 * S, col(s < 0 ? team.main : team.light));
          this.ball(this.sph, this.at(this.t3, base, dir, 13.5 * S), 1.8 * S, C(PAL.gold));
        }
        break;
      case 'feather':
        this.axes(this.dome, this.at(t1, H, up, 4 * S, r, 1.5 * S), r, up, f, 9.5 * S, 4 * S, 9 * S, col(team.dark));
        this.axes(this.box, this.at(t1, H, up, 9 * S, f, -5 * S, r, 4 * S), r, up, f, 0.6 * S, 11 * S, 2.2 * S, col(PAL.gold));
        break;
      case 'afro':
        this.ball(this.sph, this.at(t1, H, up, 5 * S, f, -1.5 * S), 11 * S, col(PAL.afro));
        this.axes(this.box, this.at(t1, H, f, 7.8 * S, up, -0.2 * S), r, up, f, 9.5 * S, 2.6 * S, 1.2 * S, C(PAL.ink));
        this.ball(this.gsph, this.at(t1, H, _Y, 26 * S), 4 * S, C(['#ff5fd2', '#5fe3ff', '#ffe45f', '#ffffff'][Math.floor(u.phase * 3) & 3]));
        break;
      case 'scarecrow':
        this.seg(this.cyl, this.at(t1, H, up, 4.6 * S), this.at(t2, H, up, 5.8 * S), 14 * S, col(PAL.straw));
        this.seg(this.cyl, this.at(t1, H, up, 5 * S), this.at(t2, H, up, 10 * S), 6.2 * S, col(PAL.straw));
        this.axes(this.box, this.at(t1, H, f, 7.8 * S, up, -3.2 * S), r, up, f, 6 * S, 0.8 * S, 0.7 * S, C(PAL.ink));
        break;
      case 'cupid':
        for (const o of [[3, 4], [-3, 4], [0, 6], [4, 0], [-4, 0]]) this.ball(this.sph, this.at(t1, H, r, o[0] * S, up, (o[1] + 1) * S, f, -1.5 * S), 3.4 * S, col(PAL.blond));
        for (const s of [-1, 1]) this.axes(this.sph, this.at(t1, H, up, -11 * S, f, -7 * S, r, s * 7 * S), r, up, f, 7 * S, 10 * S, 1.6 * S, col(PAL.white));
        break;
      case 'witch':
        this.seg(this.cyl, this.at(t1, H, up, 4.5 * S), this.at(t2, H, up, 5.3 * S), 14 * S, col(PAL.witchBlack));
        this.spike(this.at(t1, H, up, 5 * S), this.at(t2, up, up, 0, f, -0.3), 7.5 * S, 22 * S, col(PAL.witchBlack));
        this.seg(this.cyl, this.at(t1, H, up, 5.2 * S), this.at(t2, H, up, 7.4 * S), 7.4 * S, col('#7a4fb0'));
        this.spike(this.at(t1, H, f, 7.4 * S, up, -1.5 * S), this.at(t2, f, up, -0.3), 1.5 * S, 4.5 * S, col(PAL.witch));
        break;
      case 'monkey':
        for (const s of [-1, 1]) this.ball(this.sph, this.at(t1, H, r, s * 7.6 * S, up, 1 * S), 3 * S, col(PAL.monkeyFace));
        this.axes(this.sph, this.at(t1, H, f, 4.4 * S, up, -1.5 * S), r, up, f, 6 * S, 5 * S, 4 * S, col(PAL.monkeyFace));
        break;
      case 'pirate':
        this.seg(this.cyl, this.at(t1, H, up, 5.2 * S), this.at(t2, H, up, 6.4 * S), 11.5 * S, col('#1f1b22'));
        this.axes(this.dome, this.at(t1, H, up, 5.6 * S), r, up, f, 7 * S, 5 * S, 7 * S, col('#1f1b22'));
        this.ball(this.sph, this.at(t1, H, up, 8 * S, f, 6.4 * S), 1.6 * S, C(PAL.white));
        this.ball(this.sph, this.at(t1, H, f, 7.9 * S, up, -0.2 * S, r, 2.7 * S), 2.3 * S, C(PAL.ink));
        break;
      case 'robot':
        this.seg(this.cyl, this.at(t1, H, up, 6 * S), this.at(t2, H, up, 13 * S), 0.6 * S, col(PAL.robotDark));
        this.ball(this.gsph, this.at(t1, H, up, 13.5 * S), 1.8 * S, C(u.alive && Math.sin(u.phase * 3) > 0 ? PAL.laser : '#8a2a2a'));
        break;
      case 'dj':
        this.axes(this.dome, this.at(t1, H, up, 1 * S), r, up, f, 8.4 * S, 5 * S, 8.4 * S, col(PAL.beard));
        this.axes(this.sph, this.at(t1, H, f, 3.6 * S, up, -4.4 * S), r, up, f, 6.2 * S, 4.2 * S, 5 * S, col(PAL.beard));
        this.axes(this.box, this.at(t1, H, f, 7.8 * S, up, 0.4 * S), r, up, f, 10 * S, 2.6 * S, 1.2 * S, C(PAL.ink));
        this.axes(this.torus, this.at(t1, H, up, 1.5 * S), r, f, up, 9.2 * S, 9.2 * S, 9.2 * S, C('#1f1b22'));
        for (const sd of [-1, 1]) this.ball(this.sph, this.at(t1, H, r, sd * 8.6 * S), 3.2 * S, C('#1f1b22'));
        this.axes(this.torus, this.at(t1, H, up, -11 * S, f, 2 * S), r, up, f, 6.5 * S, 6.5 * S, 6.5 * S, C(PAL.gold));
        break;
      case 'miner':
        dome(1.5, 9, '#f2c230');
        this.seg(this.cyl, this.at(t1, H, up, 1.3 * S), this.at(t2, H, up, 2.1 * S), 10.5 * S, col('#d9a822'));
        this.ball(this.gsph, this.at(t1, H, f, 8.6 * S, up, 4.5 * S), 2.2 * S, C('#fff6b0'));
        break;
      case 'megaknight':
        dome(1, 9.4, '#3d4350');
        for (const o of [[0, 0], [-4, -3], [4, -3]]) this.spike(this.at(t1, H, up, 8 * S, r, o[0] * S, f, o[1] * S), up, 1.8 * S, 7 * S, C('#9aa3ad'));
        for (const sd of [-1, 1]) this.axes(this.gsph, this.at(t1, H, f, 8.2 * S, up, 0.5 * S, r, sd * 3 * S), r, up, f, 2 * S, 0.8 * S, 0.8 * S, C(u.alive ? '#c27bff' : '#4a3a5a'));
        break;
      case 'hogrider':
        this.axes(this.box, this.at(t1, H, up, 8 * S, f, -1 * S), r, up, f, 2.4 * S, 5 * S, 13 * S, col('#3a2a22'));
        this.axes(this.box, this.at(t1, H, f, 7.6 * S, up, -2.6 * S), r, up, f, 7 * S, 1.5 * S, 1.4 * S, col('#3a2a22'));
        break;
      case 'ultraman': {
        this.axes(this.box, this.at(t1, H, up, 6 * S, f, -1 * S), r, up, f, 1.4 * S, 6 * S, 14 * S, col('#c9ced6'));
        for (const sd of [-1, 1]) this.axes(this.gsph, this.at(t1, H, f, 6.6 * S, up, 1 * S, r, sd * 3.2 * S), r, up, f, 2.4 * S, 1.6 * S, 1.6 * S, C('#fff2a8'));
        this.axes(this.box, this.at(t1, H, f, 7.6 * S, up, -3.6 * S), r, up, f, 3 * S, 0.6 * S, 0.6 * S, C('#8a8f98'));
        const ch = u.body.pts[J.CHEST], low = u.hp < u.t.hp * 0.3;
        const timer = !u.alive ? '#33424a' : low ? (Math.sin(u.phase * 6) > 0 ? '#ff3b3b' : '#5a1a1a') : '#4fd8ff';
        this.ball(this.gsph, this.at(t1, ch, f, 7.2 * S, up, -3 * S), 2.2 * S, C(timer));
        break;
      }
      case 'treant':
        for (const o of [[0, 9, 0, 11], [7, 5, -2, 8], [-7, 5, -2, 8], [0, 6, -7, 8], [4, 12, 4, 7], [-4, 12, 3, 7]]) {
          this.ball(this.sph, this.at(t1, H, r, o[0] * S, up, o[1] * S, f, o[2] * S), o[3] * S, col(o[3] > 8 ? PAL.leaf : PAL.leafLight));
        }
        break;
    }
  }

  // A big bushy squirrel tail curling up behind the pelvis, or a thin curly monkey tail, swaying as it runs.
  tail(u, pe, f, up, r, S, col, thin) {
    const pts = thin
      ? [[5, -2, 1.6], [10, -2, 1.5], [14, 2, 1.4], [16, 8, 1.3], [14, 13, 1.2], [10, 14, 1.2], [9, 10, 1.1]]
      : [[5, 2, 3], [10, 8, 4.5], [13, 16, 5.5], [13, 25, 6], [10, 33, 6], [6, 38, 5]];
    const sway = Math.sin(u.phase) * 2 * S, fur = col(thin ? PAL.monkey : PAL.furLight);
    pts.forEach(([back, h, rad], i) => {
      const p = this.at(this.t1, pe, f, -back * S, up, h * S, r, sway * i / pts.length);
      this.ball(this.sph, p, rad * S, fur);
      if (thin && i) this.seg(this.cyl, this.t2, p, rad * S, fur);
      this.t2.copy(p);
    });
  }

  // A tunnelling Miner shows only as a mound of dirt.
  mound(u) {
    const p = u.P;
    this.axes(this.dome, this.t1.set(p.x, 0, p.z), _X, _Y, _Z, 11, 5 + Math.sin(u.phase * 3) * 1.5, 11, C('#7a5a3a'));
    for (let i = 0; i < 3; i++) this.ball(this.sph, this.t1.set(p.x + Math.cos(i * 2.1 + u.phase) * 12, 1.5, p.z + Math.sin(i * 2.1 + u.phase) * 12), 2.5, C('#5f4630'));
  }

  // A fish standing on its tail: body and belly, goggly eyes, fins where the hands and feet are.
  fishBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST];
    const c = this.t1.set((pe.x + ch.x) / 2, (pe.y + ch.y) / 2, (pe.z + ch.z) / 2).addScaledVector(up, 2 * S);
    const fin = col(team.dark);
    this.axes(this.sph, c, r, up, f, 8.5 * S, 17 * S, 11 * S, col(team.main));
    this.axes(this.sph, this.at(this.t2, c, f, 3.5 * S, up, -2 * S), r, up, f, 6.5 * S, 12 * S, 8 * S, col(team.light));
    for (const sd of [-1, 1]) {
      const e = this.at(this.t2, c, up, 9 * S, r, sd * 6.2 * S, f, 4 * S);
      this.ball(this.sph, e, 2.8 * S, C(PAL.white));
      if (u.alive) this.ball(this.sph, this.at(this.t3, e, r, sd * 1.6 * S, f, 1 * S), 1.5 * S, C(PAL.ink));
    }
    this.axes(this.torus, this.at(this.t2, c, f, 10.6 * S, up, 4 * S), r, f, up, 2.2 * S, 2.2 * S, 2.2 * S, C('#7a2a3a'));
    this.spike(this.at(this.t2, c, f, -9 * S, up, 5 * S), this.at(this.t3, up, f, -1.2), 2.6 * S, 10 * S, fin);
    for (const sd of [-1, 1]) this.axes(this.sph, B[sd < 0 ? J.LHAND : J.RHAND], r, up, f, 1.3 * S, 5 * S, 3.6 * S, fin);
    const lf = B[J.LFOOT], rf = B[J.RFOOT];
    const tail = this.t2.set((lf.x + rf.x) / 2, (lf.y + rf.y) / 2 + 3 * S, (lf.z + rf.z) / 2);
    for (const sd of [-1, 1]) this.axes(this.sph, this.at(this.t3, tail, r, sd * 5 * S, up, 2 * S), r, up, f, 6 * S, 2.4 * S, 1.4 * S, fin);
    if (u.t.hat === 'crown') {
      const top = this.at(this.t2, c, up, 17 * S);
      this.axes(this.torus, top, r, up, f, 4.5 * S, 4.5 * S, 4.5 * S, C(PAL.gold));
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU;
        this.spike(this.at(this.t3, top, r, Math.cos(a) * 4.5 * S, f, Math.sin(a) * 4.5 * S), up, 1.2 * S, 4 * S, C(PAL.gold));
      }
    }
  }

  // A Chinese dragon: whiskered head in a rice hat, and a long body that weaves along behind it.
  dragonBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, hd = B[J.HEAD], ch = B[J.CHEST];
    const main = col(team.main), gold = col(PAL.gold), belly = col(team.light);
    const fh = this.t4.set(f.x, 0, f.z); if (fh.lengthSq() < 1e-4) fh.set(u.fx, 0, u.fz); fh.normalize();
    const rh = this.t5.set(-fh.z, 0, fh.x);
    const ph = u.phase * 0.8;
    for (let i = 0; i < 16; i++) {
      const k = i + 1, wave = Math.sin(ph - k * 0.55);
      const p = this.t1.set(ch.x - fh.x * k * 6.5 * S + rh.x * wave * 6 * S, Math.max(4 * S, ch.y - k * 1.3 * S + Math.cos(ph - k * 0.4) * 3 * S), ch.z - fh.z * k * 6.5 * S + rh.z * wave * 6 * S);
      const rad = (6.2 - i * 0.28) * S;
      this.ball(this.sph, p, rad, i % 3 === 1 ? belly : main);
      if (i % 2 === 0) this.spike(this.at(this.t2, p, _Y, rad * 0.8), _Y, 1.4 * S, 4 * S, gold);
      if (i === 3 || i === 10) for (const sd of [-1, 1]) {
        // Short claws dangling under the body.
        const top = this.at(this.t2, p, rh, sd * rad * 0.8);
        const claw = this.t3.set(top.x + rh.x * sd * 3 * S, Math.max(1, top.y - 9 * S), top.z + rh.z * sd * 3 * S);
        this.seg(this.cyl, top, claw, 1.3 * S, gold);
        this.ball(this.sph, claw, 1.6 * S, gold);
      }
      if (i === 15) this.spike(p, this.t2.copy(fh).negate(), 3 * S, 8 * S, gold);
    }
    this.axes(this.sph, hd, r, up, f, 5.5 * S, 5 * S, 8 * S, main);
    const snout = this.at(this.t1, hd, f, 7 * S, up, -1.5 * S);
    this.axes(this.box, snout, r, up, f, 7 * S, 4 * S, 7 * S, main);
    this.ball(this.sph, this.at(this.t2, snout, f, 3.6 * S, up, 1 * S), 1.6 * S, gold);
    if (u.breath > 0) this.axes(this.box, this.at(this.t2, snout, up, -3 * S, f, -1 * S), r, up, f, 6 * S, 1.6 * S, 6 * S, C('#7a1a1a'));
    for (const sd of [-1, 1]) {
      const e = this.at(this.t2, hd, f, 3 * S, up, 2.5 * S, r, sd * 3.6 * S);
      this.ball(this.sph, e, 1.8 * S, C(PAL.white));
      if (u.alive) this.ball(this.sph, this.at(this.t3, e, f, 1 * S, r, sd * 0.6 * S), 1 * S, C(PAL.ink));
      this.spike(this.at(this.t2, hd, up, 4 * S, r, sd * 2.5 * S), this.at(this.t3, up, f, -1.3, r, sd * 0.3), 1.1 * S, 9 * S, gold);
      // Whiskers: two thin segments trailing back from the snout.
      const w0 = this.at(this.t2, snout, r, sd * 3.2 * S);
      const w1 = this.at(this.t3, w0, r, sd * 6 * S, f, -2 * S, up, Math.sin(ph * 2) * 2 * S);
      this.seg(this.cyl, w0, w1, 0.5 * S, gold);
      this.seg(this.cyl, w1, this.at(this.t1, w1, r, sd * 4 * S, f, -6 * S, up, -3 * S), 0.4 * S, gold);
    }
    // Rice hat.
    this.spike(this.at(this.t1, hd, up, 5 * S), up, 15 * S, 6 * S, col('#d8b36a'));
    this.ball(this.sph, this.at(this.t1, hd, up, 11 * S), 1.2 * S, col('#b8913f'));
  }

  // Databrick: one brick, standing on end, with its name on the front.
  brickBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, ch = B[J.CHEST], lf = B[J.LFOOT], rf = B[J.RFOOT];
    const bottom = this.t1.set((lf.x + rf.x) / 2, (lf.y + rf.y) / 2, (lf.z + rf.z) / 2);
    const c = this.t2.set((bottom.x + ch.x) / 2, (bottom.y + ch.y) / 2, (bottom.z + ch.z) / 2);
    const h = Math.max(30 * S, bottom.distanceTo(ch) + 6 * S);
    this.axes(this.box, c, r, up, f, 24 * S, h, 11 * S, col('#b5543a'));
    this.axes(this.box, this.at(this.t3, c, up, -h * 0.42), r, up, f, 24.4 * S, 3 * S, 11.4 * S, col(team.main));
    for (const o of [-0.22, 0.05]) this.axes(this.cyl, this.at(this.t3, c, up, o * h, f, 5.6 * S), r, f, up, 3 * S, 0.6 * S, 3 * S, C('#5a2418'));
    this.nr.copy(r).negate();
    this.axes(this.label, this.at(this.t3, c, f, 5.7 * S, up, h * 0.3), this.nr, up, f, 22 * S, 5.5 * S, 1, C('#ffffff'));
  }

  // The Hog Rider's hog, under the rider's pelvis, trotting with the rider's stride.
  hog(u, pe, f, up, r, S, col) {
    const hide = col('#c98f7a'), dark = col('#a8705c'), pink = col('#f0a8a0');
    const c = this.at(this.t1, pe, up, -9 * S);
    this.axes(this.sph, c, r, up, f, 9 * S, 8.5 * S, 17 * S, hide);
    const head = this.at(this.t2, c, f, 15 * S, up, 3 * S);
    this.ball(this.sph, head, 6.5 * S, hide);
    const sn = this.at(this.t3, head, f, 6 * S, up, -1 * S);
    this.seg(this.cyl, head, sn, 3 * S, pink);
    for (const sd of [-1, 1]) {
      this.ball(this.sph, this.at(this.t4, sn, f, 0.6 * S, r, sd * 1.2 * S), 0.8 * S, C(PAL.ink));
      this.spike(this.at(this.t4, sn, up, -1.5 * S, r, sd * 2.6 * S, f, -1 * S), this.at(this.t5, up, f, 0.4), 0.7 * S, 3.5 * S, C(PAL.white));
      this.spike(this.at(this.t4, head, up, 5 * S, r, sd * 3 * S), this.at(this.t5, up, r, sd * 0.5, f, -0.3), 2 * S, 4 * S, dark);
      this.ball(this.sph, this.at(this.t4, head, f, 4 * S, up, 2.5 * S, r, sd * 3 * S), 1 * S, C(PAL.ink));
    }
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const top = this.at(this.t4, c, f, a * 10 * S, r, b * 5 * S, up, -5 * S);
      const swing = Math.sin(u.phase + (a * b > 0 ? 0 : PI)) * 4 * S;
      const foot = this.at(this.t5, top, up, -10 * S, f, swing);
      this.seg(this.cyl, top, foot, 2.2 * S, dark);
      this.ball(this.sph, foot, 2.2 * S, C('#3a2a22'));
    }
    this.ball(this.sph, this.at(this.t4, c, f, -17 * S, up, 4 * S), 1.6 * S, pink);
  }

  billboard(batch, p, size, col, aspect) {
    _p.set(p.x, p.y, p.z); _s.set(size * (aspect || 1), size, size);
    _m.compose(_p, this.camQ, _s); batch.add(_m, col);
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
    const dual = w === 'axe' || w === 'katana' || w === 'mace';
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
        const bowCol = col(u.key === 'cupid' ? PAL.pink : '#7a4a26'), string = C('#f4efe4');
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
      case 'mic':
        this.seg(this.cyl, along(t1, -1), along(t2, 5), 1.1 * S, C('#1f1b22'));
        this.ball(this.sph, along(t1, 6), 2 * S, C('#9aa3ad'));
        break;
      case 'pickaxe': {
        this.seg(this.cyl, along(t1, -6), along(t2, 22), 1.1 * S, col(PAL.wood));
        const tip = along(t3, 22);
        for (const sd of [-1, 1]) this.spike(tip, this.at(t1, Z, Z, sd - 1, d, -0.25), 1.6 * S, 9 * S, col(PAL.steel));
        break;
      }
      case 'mace': {
        this.seg(this.cyl, along(t1, -3), along(t2, 6), 1.4 * S, C('#2b3038'));
        const head = along(t3, 9);
        this.ball(this.sph, head, 4.5 * S, col('#4f5560'));
        for (const v of [X, Z, d]) for (const sd of [-1, 1]) this.spike(this.at(t1, head, v, sd * 3.5 * S), this.t2.copy(v).multiplyScalar(sd), 1.3 * S, 3.5 * S, C('#9aa3ad'));
        break;
      }
      case 'hammer':
        this.seg(this.cyl, along(t1, -4), along(t2, 20), 1.2 * S, col(PAL.wood));
        this.axes(this.box, along(t1, 21), X, d, Z, 4.5 * S, 5 * S, 10 * S, col('#6b6f78'));
        break;
      case 'pin':
        this.seg(this.cyl, along(t1, 1), along(t2, 18), 2.6 * S, col('#d9b380'));
        this.seg(this.cyl, along(t1, -3), along(t2, 1), 0.9 * S, col('#b88a55'));
        this.ball(this.sph, along(t1, 19.5), 1.3 * S, col('#b88a55'));
        break;
      case 'fish':
        this.axes(this.sph, along(t1, 12), X, d, Z, 2.4 * S, 11 * S, 4.6 * S, col(PAL.fish));
        this.spike(along(t1, 20), d, 4 * S, 6 * S, col('#5f8597'));
        this.ball(this.sph, this.at(t1, h, d, 4.5 * S, Z, 1.8 * S, X, 1.6 * S), 0.9 * S, C(PAL.ink));
        break;
      case 'pie':
      case 'banana':
        if (side === 'r' && !(u.act === 'attack' && u.fired)) {
          if (w === 'pie') {
            this.seg(this.cyl, along(t1, 1), along(t2, 3), 4.5 * S, col(PAL.crust));
            this.ball(this.sph, along(t1, 3), 3.6 * S, col(PAL.cream));
          } else {
            this.seg(this.cyl, along(t1, -3), along(t2, 4), 1.5 * S, col(PAL.banana));
            this.seg(this.cyl, along(t1, 4), this.at(t2, h, d, 8 * S, Z, 2 * S), 1.3 * S, col(PAL.banana));
          }
        }
        break;
      case 'lute':
        if (side === 'r') {
          const body = this.at(t3, B[J.CHEST], this.f, 7 * S, this.u, -7 * S, this.r, 1 * S);
          this.axes(this.sph, body, this.r, this.u, this.f, 6.5 * S, 7.5 * S, 3 * S, col('#b5793a'));
          this.ball(this.sph, this.at(t1, body, this.f, 2.6 * S), 1.8 * S, C(PAL.ink));
          this.seg(this.cyl, body, B[J.LHAND], 1 * S, col('#7a4a26'));
        }
        break;
      case 'broom':
        this.seg(this.cyl, along(t1, -22), along(t2, 18), 1 * S, col(PAL.wood));
        this.spike(along(t1, -20), this.at(t2, d, d, -2), 4.5 * S, 10 * S, col(PAL.straw));
        break;
      case 'blunderbuss':
        this.seg(this.cyl, along(t1, -9), along(t2, 3), 1.9 * S, col(PAL.wood));
        this.seg(this.cyl, along(t1, 3), along(t2, 26), 1.4 * S, col('#8a6d3b'));
        this.spike(along(t1, 25), d, 3 * S, 5 * S, col('#8a6d3b'));
        break;
      case 'none':
        if (u.key === 'robot' && side === 'r') this.ball(this.gsph, along(t1, 2), 2.4 * S, C(u.act === 'attack' ? PAL.laser : '#c24a4a'));
        if (u.key === 'lebron' && side === 'r' && !(u.act === 'attack' && u.fired)) {
          const a = B[J.LHAND], b = B[J.RHAND];
          this.ball(this.sph, t1.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2).addScaledVector(this.f, 3 * S), 6.5, C(PAL.ball));
        }
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
    if (p.kind === 'arrow' || p.kind === 'heart') {
      const love = p.kind === 'heart';
      t1.set(p.x - nx * 17, p.y - ny * 17, p.z - nz * 17);
      this.seg(this.cyl, t1, p, 0.6, C(love ? PAL.pink : PAL.wood));
      this.seg(this.cyl, t1, t2.set(t1.x + nx * 4, t1.y + ny * 4, t1.z + nz * 4), 1.5, C(love ? '#ffc2da' : PAL.white));
      if (love) this.ball(this.gsph, p, 2.2, C('#ff6fa8'));
      else this.spike(t1.set(p.x - nx * 1, p.y - ny * 1, p.z - nz * 1), _d.set(nx, ny, nz), 1.1, 3, C(PAL.darkSteel));
    } else if (p.kind === 'bullet') {
      this.ball(this.gsph, p, 1.6, C('#fff3b0'));
      this.seg(this.gcyl, t1.set(p.x - nx * 30, p.y - ny * 30, p.z - nz * 30), p, 0.5, C('#fff7d6'));
    } else if (p.kind === 'boulder') {
      this.ball(this.sph, p, p.r, C(PAL.stone));
    } else if (p.kind === 'ball') {
      this.ball(this.sph, p, p.r, C(PAL.ball));
    } else if (p.kind === 'cannon') {
      this.ball(this.sph, p, p.r, C(PAL.iron));
    } else if (p.kind === 'hex') {
      this.ball(this.gsph, p, p.r, C('#b56cff'));
    } else if (p.kind === 'pie') {
      this.ball(this.sph, p, 4, C(PAL.crust));
      this.ball(this.sph, t1.set(p.x, p.y + 2, p.z), 3.2, C(PAL.cream));
    } else if (p.kind === 'peel') {
      this.ball(this.sph, p, 3, C(PAL.banana));
    } else {
      this.ball(this.gsph, p, 6.5, C('#ffb347'));
    }
  }

  effects(W) {
    for (const q of W.parts) {
      const t = q.life / q.max;
      if (q.kind === 'puff') this.ball(this.puff, q, q.size * (0.4 + 0.9 * t), C(q.color));
      else if (q.kind === 'fire') this.ball(this.gsph, q, q.size * (0.5 + 0.6 * t), C(t > 0.5 ? '#ffd166' : '#f2622e'));
      else if (q.kind === 'glow') this.ball(this.gsph, q, q.size * (0.4 + 0.6 * t), C(q.color));
      else this.ball(this.gsph, q, 1.1, C('#ffe58a'));
    }
    for (const fl of W.flashes) {
      const t = fl.life / fl.max;
      const hex = fl.disco ? ['#ff5fd2', '#5fe3ff', '#ffe45f'][Math.floor(t * 9) % 3] : fl.bolt ? '#cfefff' : '#fff3c4';
      this.ball(this.flash, fl, (1 - t) * fl.r * 0.9 + 8, C(hex));
    }
    for (const b of W.bolts) {
      for (let i = 1; i < b.pts.length; i++) {
        const a = b.pts[i - 1], c = b.pts[i];
        this.seg(this.gcyl, this.t1.set(a[0], a[1], a[2]), this.t2.set(c[0], c[1], c[2]), 1.6, C('#e8fbff'));
      }
    }
    for (const c of W.callouts || []) {
      const t = c.life / c.max;
      this.billboard(this.callout, c, 18 + (1 - t) * 6, C('#ffffff'), 4);
    }
    for (const bm of W.beams) {
      if (bm.specium) {
        this.seg(this.gcyl, bm.from, bm.end, 6 + 14 * (bm.life / 0.5), C('#c9f6ff'));
        continue;
      }
      const s = bm.a.body.pts[J.RHAND], c = bm.b.body.pts[J.CHEST];
      if (bm.laser) {
        this.seg(this.gcyl, s, c, 1.4, C(PAL.laser));
        this.ball(this.gsph, c, 3.5, C('#ffb0b0'));
      } else {
        this.seg(this.gcyl, this.t1.set(s.x, s.y + 22 * bm.a.S, s.z), c, 1.3, C('#9be8a0'));
        this.ball(this.gsph, c, 4 * bm.b.S * (bm.life / 0.4), C('#c9f5cc'));
      }
    }
    // Banana peels lying on the ground.
    for (const h of W.hazards || []) {
      const c = Math.cos(h.spin), sn = Math.sin(h.spin);
      this.axes(this.sph, this.t1.set(h.x, 1, h.z), this.t2.set(c, 0, sn), _Y, this.t3.set(-sn, 0, c), 5, 1.4, 3.4, C(PAL.banana));
      for (let i = 0; i < 3; i++) {
        const a = h.spin + i * 2.1;
        this.ball(this.sph, this.t1.set(h.x + Math.cos(a) * 6, 0.8, h.z + Math.sin(a) * 6), 2.2, C('#e8c23a'));
      }
    }
  }
}
