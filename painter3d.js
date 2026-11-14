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
  djkhaled: '#6b4229', miner: '#9ab07a', hogrider: '#c98a5e', ultraman: '#c9ced6', megaknight: '#3d4350',
  kendrick: '#7a4a2e', drake: '#b0805a', paak: '#9a6a45', nicki: '#9a6a45', augustine: '#a8714a', mlk: '#6b4229',
  zuck: '#cdd6ad', jensen: '#e0b890', bigbird: '#f5d33b', minibot: PAL.robot, armadillo: '#c9a98a',
  squirrelking: PAL.fur, gru: '#f2d9c2', dio: '#f8dcc6', titan: '#e8b49a', attacktitan: '#c98a6a' };
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
  kendrick: { limbs: 'skin', legs: '#1f1b22', boot: '#f4f4f4' },
  elon: { legs: '#2b2b30', boot: '#1f1b22' },
  zuck: { torso: '#8a8f98', limbs: 'skin', legs: '#3a4a6a', boot: '#f4f4f4', belt: 'main' },
  jensen: { torso: '#151418', limbs: '#151418', legs: '#1f1b22', boot: '#1f1b22', belt: 'main' },
  spy: { torso: 'dark', limbs: 'dark', legs: '#2b2b30', boot: '#1f1b22' },
  altman: { torso: '#7d8590', limbs: '#7d8590', legs: '#3a4a6a', boot: '#f4f4f4', belt: 'main' },
  swe: { legs: '#3a4a6a', boot: '#f4f4f4' },
  oncall: { legs: '#5a5a66', boot: '#8a8f98' },
  bigbird: { torso: 'skin', limbs: 'skin', legs: '#f0a030', hands: 'skin', boot: '#f0a030', belt: 'main' },
  nathan: { torso: '#9ec5e8', limbs: '#9ec5e8', legs: '#c8b48a', boot: '#5a4632', belt: 'main' },
  holmes: { torso: '#151418', limbs: '#151418', legs: '#151418', boot: '#151418', belt: 'main' },
  drake: { legs: '#2b2b30', boot: '#f4f4f4' },
  paak: { limbs: 'skin', legs: '#3a4a6a', boot: '#f4f4f4' },
  nicki: { limbs: 'skin', legs: '#ff5fb0', boot: '#ff5fb0' },
  augustine: { torso: '#f4efe4', limbs: '#f4efe4', legs: '#f4efe4', boot: '#8a6d3b', belt: 'main' },
  luther: { torso: '#1f1b22', limbs: '#1f1b22', legs: '#1f1b22', boot: '#1f1b22', belt: 'main' },
  bonhoeffer: { torso: '#3a3f4c', limbs: '#3a3f4c', legs: '#3a3f4c', boot: '#1f1b22' },
  mlk: { torso: '#2b2b30', limbs: '#2b2b30', legs: '#2b2b30', boot: '#1f1b22' },
  pastorhans: { torso: '#1f1b22', limbs: '#1f1b22', legs: '#2b2b30', boot: '#1f1b22' },
  squirrelking: { torso: 'skin', limbs: 'skin', legs: 'skin', boot: PAL.fur, belt: 'main' },
  gru: { torso: '#2b2b30', limbs: '#2b2b30', legs: '#2b2b30', boot: '#1f1b22', belt: 'main' },
  joseph: { limbs: 'skin', legs: '#3a4a6a', hands: '#2b2b30', boot: '#5a4632' },
  jotaro: { torso: '#1f2a3a', limbs: '#1f2a3a', legs: '#1f2a3a', boot: '#2b2224', belt: 'main' },
  dio: { torso: '#f4c542', limbs: '#f4c542', legs: '#f4c542', boot: '#f4c542', belt: 'main' },
  naruto: { torso: '#f08a24', limbs: '#f08a24', legs: '#f08a24', boot: '#2b3a5a', belt: 'main' },
  titan: { torso: 'skin', limbs: 'skin', legs: 'skin', hands: 'skin', boot: 'skin', belt: 'main', noEyes: true },
  attacktitan: { torso: 'skin', limbs: 'skin', legs: 'skin', hands: 'skin', boot: 'skin', belt: 'main', noEyes: true },
  scout: { torso: '#8a6a45', limbs: '#8a6a45', legs: '#efe8da', boot: '#3a2a22', belt: 'main' },
  eren: { torso: '#8a6a45', limbs: '#8a6a45', legs: '#efe8da', boot: '#3a2a22', belt: 'main' },
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
    this.gtorus = new Batch(scene, torus, glow, 400, false);
    this.puff = new Batch(scene, sph, puff, 2500, false);
    this.flash = new Batch(scene, sph, flash, 80, false);
    const ice = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
    this.ice = new Batch(scene, box, ice, Math.max(32, cap), false);
    // Stands: see-through glowing figures that fight beside their users.
    const ghost = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    this.ghostS = new Batch(scene, sph, ghost, 600, false);
    this.ghostC = new Batch(scene, cyl, ghost, 300, false);
    const plane = new THREE.PlaneGeometry(1, 1);
    this.qmark = new Batch(scene, plane, new THREE.MeshBasicMaterial({ map: questionTexture(), transparent: true, depthWrite: false }), cap, false);
    this.hearts = new Batch(scene, plane, new THREE.MeshBasicMaterial({ map: heartTexture(), transparent: true, depthWrite: false }), cap, false);
    const words = (text, fill, size) => new THREE.MeshBasicMaterial({ map: wordTexture(text, fill, size), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    // Floating words over a unit's head, keyed by the callout's `text`.
    this.callouts = {
      another: new Batch(scene, plane, words('ANOTHER ONE!', '#ffd166', 84), 32, false),
      rud: new Batch(scene, plane, words('RAPID UNSCHEDULED DISASSEMBLY', '#ff8a4a', 34), 32, false),
      rehired: new Batch(scene, plane, words('REHIRED!', '#9fe8ff', 96), 16, false),
      paged: new Batch(scene, plane, words('PAGED!', '#ff5f5f', 96), 64, false),
      quack: new Batch(scene, plane, words('QUACK!', '#ffe14a', 104), 16, false),
      zawarudo: new Batch(scene, plane, words('ZA WARUDO!', '#f4c542', 80), 8, false),
      ora: new Batch(scene, plane, words('ORA ORA ORA!', '#c9a0ff', 66), 16, false),
      muda: new Batch(scene, plane, words('MUDA MUDA MUDA!', '#f4c542', 56), 16, false),
      roller: new Batch(scene, plane, words('ROAD ROLLER DA!', '#ffb347', 58), 8, false),
      rasengan: new Batch(scene, plane, words('RASENGAN!', '#7fd6ff', 86), 16, false),
      jutsu: new Batch(scene, plane, words('SHADOW CLONE JUTSU!', '#ffa040', 46), 8, false),
      nigerundayo: new Batch(scene, plane, words('NIGERUNDAYO!', '#9fe8ff', 70), 16, false),
      tatakae: new Batch(scene, plane, words('TATAKAE!', '#7fe08a', 96), 8, false),
      overheat: new Batch(scene, plane, words('THERMAL THROTTLING', '#ff7a4a', 46), 16, false),
    };
    this.label = new Batch(scene, plane, words('databrick', '#ffffff', 96), Math.max(16, cap >> 2), false);
    this.all = [this.cyl, this.sph, this.dome, this.box, this.cone, this.torus, this.gsph, this.gcyl, this.gtorus, this.puff, this.flash, this.ice, this.ghostS, this.ghostC, this.qmark, this.hearts, this.label, ...Object.values(this.callouts)];
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
    // A spy in disguise wears the other side's colours.
    const B = u.body.pts, S = u.S, t = u.t, look = LOOK[u.key === 'actor' ? 'nathan' : u.key === 'narutoclone' ? 'naruto' : u.key] || {}, team = TEAM[u.hidden ? 1 - u.home : u.home];
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

    const team0 = team, col0 = col;
    if (u.vanished) return;
    if (u.alive && u.iced > 0) this.iceBlock(u);
    if (u.burrow) { this.mound(u); return; }
    if (t.body === 'duck') { this.duckBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'minion') { this.minionBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'gpu') { this.gpuBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'fish') { this.fishBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'dragon') { this.dragonBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'brick') { this.brickBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'log') { this.logBody(u, f, up, r, S, team0, col0); return; }
    if (t.body === 'armadillo') { this.armadilloBody(u, f, up, r, S, team0, col0); return; }

    const skin = SKIN_OF[u.key] || PAL.skin;
    const pick = (k, dflt) => look.all || (k && k[0] === '#' ? k : k === 'steel' ? PAL.steel : k === 'skin' ? skin : k === 'ninja' ? PAL.ninja
      : k === 'robe' ? PAL.robe : k === 'team' ? team.main : k === 'dark' ? team.dark : dflt);
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
    const eyeR = (u.alive ? 1.3 : 0.6) * S * (u.key === 'squirrel' || u.key === 'squirrelking' ? 1.4 : 1);
    if (look.boxy) for (const side of [-1, 1]) this.ball(this.gsph, this.at(this.t1, hd, f, 6.8 * S, up, 1 * S, r, side * 3 * S), 1.6 * S, C(u.alive ? '#7ff3ff' : PAL.robotDark));
    else if (!look.all && !look.noEyes) for (const side of [-1, 1]) this.ball(this.sph, this.at(this.t1, hd, f, 7.6 * S, up, -0.2 * S, r, side * 2.7 * S), eyeR, C(PAL.ink));
    if (u.key === 'squirrel' || u.key === 'squirrelking') this.tail(u, pe, f, up, r, S, col);
    if (u.key === 'monkey') this.tail(u, pe, f, up, r, S, col, true);
    if (u.alive && u.charm > 0) this.billboard(this.hearts, this.at(this.t1, hd, _Y, 16 * S), 12 * S, C('#ffffff'));
    if (u.paged > 0) this.axes(this.gsph, this.at(this.t1, B[J.RHAND], f, 1 * S), r, up, f, 1.4 * S, 2.6 * S, 0.6 * S, C('#9fd8ff'));
    if (u.alive && u.peace > 0) this.ball(this.gsph, this.at(this.t1, hd, _Y, 15 * S), 2 * S, C('#ffffff'));
    if (u.alive && u.ward > 0) this.ball(this.gsph, this.at(this.t1, hd, _Y, 13 * S, r, 3.5 * S), 1.8 * S, C('#9fd8ff'));
    if (u.alive && u.daze > 0) this.ball(this.gsph, this.at(this.t1, hd, _Y, 13 * S, r, -3.5 * S), 1.8 * S, C('#5fbf5a'));
    if (u.alive && u.inspired > 0) this.ball(this.gsph, this.at(this.t1, hd, _Y, (13 + Math.sin(u.phase * 2)) * S), 2 * S, C('#ffd166'));
    this.hat(u, hd, f, up, r, S, team, col);
    if (t.stand && u.alive && u.act === 'attack') this.stand(u, f, up, r, S);
    if (t.odm && u.leaping && u.alive) {
      const T = u.target, a = T && T.alive ? this.at(this.t4, T.body.pts[J.HEAD], _Y, 40 * T.S) : this.at(this.t4, hd, f, 120, _Y, 90);
      for (const sd of [-1, 1]) this.seg(this.cyl, this.at(this.t1, pe, r, sd * 8 * S), a, 0.35 * S, C('#d8dde4'));
    }
    if (t.style === 'rasengan' && u.alive && u.act === 'attack') {
      const q = this.at(this.t1, B[J.RHAND], f, 3 * S), k = 1 + Math.random() * 0.2;
      this.ball(this.gsph, q, 4.2 * S * k, C('#c9f1ff'));
      this.ball(this.puff, q, 7 * S * k, C('#7fd6ff'));
    }

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
      case 'elon':
        this.axes(this.dome, this.at(t1, H, up, 1.2 * S), r, up, f, 8.5 * S, 5 * S, 8.5 * S, col('#4a3424'));
        break;
      case 'zuck': {
        this.axes(this.dome, this.at(t1, H, up, 1.2 * S), r, up, f, 8.5 * S, 4.6 * S, 8.5 * S, col('#5a4030'));
        const pe = u.body.pts[J.PELVIS], green = col('#6a9a4a');
        // A lizard tail, drooping to the ground and swishing.
        for (let i = 0; i < 7; i++) {
          const p = this.at(t1, pe, f, -(5 + i * 5) * S, up, -(2 + i * 2.4) * S, r, Math.sin(u.phase * 1.5 + i * 0.7) * 1.6 * S);
          if (p.y < 1 * S) p.y = 1 * S;
          this.ball(this.sph, p, (3 - i * 0.3) * S, green);
        }
        // The tongue shoots out while attacking.
        if (u.act === 'attack' && u.actT > 0.3 && u.actT < 0.75) {
          const len = (u.tongueLen || u.t.reach) * Math.sin((u.actT - 0.3) / 0.45 * PI);
          const mouth = this.at(t1, H, f, 7.4 * S, up, -3.2 * S);
          const tip = this.at(t2, mouth, f, len);
          this.seg(this.cyl, mouth, tip, 1.1 * S, col('#e86a8a'));
          this.ball(this.sph, tip, 1.8 * S, col('#e86a8a'));
        }
        break;
      }
      case 'jensen':
        this.axes(this.dome, this.at(t1, H, up, 1.4 * S), r, up, f, 8.4 * S, 4.4 * S, 8.4 * S, col('#3a3a40'));
        break;
      case 'spy':
        this.seg(this.cyl, this.at(t1, H, up, 5 * S), this.at(t2, H, up, 5.8 * S), 12 * S, col('#2b2b30'));
        this.seg(this.cyl, this.at(t1, H, up, 5.6 * S), this.at(t2, H, up, 10.5 * S), 7.2 * S, col('#2b2b30'));
        this.seg(this.cyl, this.at(t1, H, up, 5.8 * S), this.at(t2, H, up, 7 * S), 7.3 * S, col(team.main));
        this.axes(this.box, this.at(t1, H, f, 7.8 * S, up, 0.2 * S), r, up, f, 9.5 * S, 2.4 * S, 1.2 * S, C(PAL.ink));
        break;
      case 'altman':
        this.axes(this.dome, this.at(t1, H, up, 1.2 * S), r, up, f, 8.5 * S, 4.8 * S, 8.5 * S, col('#6b4a30'));
        break;
      case 'swe':
        this.axes(this.dome, this.at(t1, H, f, -1.5 * S, up, 0.4 * S), r, up, f, 9.6 * S, 9.6 * S, 9.6 * S, col(team.dark));
        for (const sd of [-1, 1]) this.axes(this.torus, this.at(t1, H, f, 8.2 * S, up, -0.2 * S, r, sd * 2.8 * S), r, f, up, 2.4 * S, 2.4 * S, 2.4 * S, C(PAL.ink));
        break;
      case 'oncall':
        for (const o of [[0, 6, 0], [-4, 5, 2], [4, 5, -2], [2, 7, 3], [-3, 6, -3]]) this.ball(this.sph, this.at(t1, H, r, o[0] * S, up, o[1] * S, f, o[2] * S), 3.4 * S, col('#3a2a22'));
        for (const sd of [-1, 1]) this.axes(this.sph, this.at(t1, H, f, 7.3 * S, up, -2 * S, r, sd * 2.7 * S), r, up, f, 1.8 * S, 0.9 * S, 0.8 * S, col('#8a6a8a'));
        break;
      case 'bigbird':
        this.spike(this.at(t1, H, f, 6.5 * S, up, -1 * S), this.at(t2, f, up, -0.15), 3 * S, 8 * S, col('#f0a030'));
        for (const sd of [-1, 1]) {
          const e = this.at(t1, H, f, 6 * S, up, 2.5 * S, r, sd * 3.4 * S);
          this.ball(this.sph, e, 2.6 * S, C(PAL.white));
          if (u.alive) this.ball(this.sph, this.at(t2, e, f, 1.4 * S), 1.2 * S, C(PAL.ink));
          this.axes(this.dome, e, r, up, f, 2.8 * S, 1.8 * S, 2.8 * S, col('#ff8ac8'));
        }
        for (const o of [-3, 0, 3]) this.spike(this.at(t1, H, up, 6.5 * S, r, o * S), this.at(t2, up, r, o * 0.12, f, -0.3), 1.6 * S, 6 * S, col('#f0c020'));
        for (const o of [-3, 0, 3]) this.spike(this.at(t1, u.body.pts[J.PELVIS], f, -6 * S, r, o * S), this.at(t2, f, f, -2, up, 0.4, r, o * 0.1), 2.2 * S, 9 * S, col('#f5d33b'));
        break;
      case 'nathan':
        this.axes(this.dome, this.at(t1, H, up, 1.2 * S, r, 0.6 * S), r, up, f, 8.5 * S, 5 * S, 8.5 * S, col('#5a4030'));
        break;
      case 'holmes':
        this.axes(this.dome, this.at(t1, H, up, 1 * S), r, up, f, 8.6 * S, 5.5 * S, 8.6 * S, col('#e8cf8a'));
        this.ball(this.sph, this.at(t1, H, up, 7.5 * S, f, -4 * S), 3.6 * S, col('#e8cf8a'));
        this.seg(this.cyl, this.at(t1, u.body.pts[J.CHEST], up, 1 * S), this.at(t2, u.body.pts[J.CHEST], up, 4 * S), 4.4 * S, col('#151418'));
        break;
      case 'kendrick':
        this.axes(this.dome, this.at(t1, H, up, 1 * S), r, up, f, 8.4 * S, 5.2 * S, 8.4 * S, col('#1d1512'));
        this.ball(this.sph, this.at(t1, H, f, 6.6 * S, up, -5.6 * S), 1.7 * S, col('#1d1512'));
        break;
      case 'drake':
        this.axes(this.dome, this.at(t1, H, up, 1 * S), r, up, f, 8.4 * S, 4.6 * S, 8.4 * S, col('#1d1512'));
        this.axes(this.sph, this.at(t1, H, f, 3.4 * S, up, -4 * S), r, up, f, 6 * S, 4 * S, 5 * S, col('#1d1512'));
        break;
      case 'paak': {
        this.seg(this.cyl, this.at(t1, H, up, 2.4 * S), this.at(t2, H, up, 4.4 * S), 8.35 * S, col(team.main));
        for (const sd of [-1, 1]) this.axes(this.cyl, this.at(t1, H, f, 7.9 * S, up, 0.2 * S, r, sd * 2.8 * S), r, f, up, 2.3 * S, 0.5 * S, 2.3 * S, C(PAL.ink));
        // A snare drum at the waist.
        const drum = this.at(this.t3, u.body.pts[J.PELVIS], f, 9 * S, up, 1 * S);
        this.seg(this.cyl, this.at(t1, drum, up, -2.5 * S), this.at(t2, drum, up, 2.5 * S), 6.5 * S, col('#f4f6fb'));
        for (const o of [-2.6, 2.6]) this.seg(this.cyl, this.at(t1, drum, up, (o - 0.4) * S), this.at(t2, drum, up, (o + 0.4) * S), 6.8 * S, col('#9aa3ad'));
        break;
      }
      case 'nicki':
        this.axes(this.dome, this.at(t1, H, up, 0.8 * S), r, up, f, 9.2 * S, 9.2 * S, 9.2 * S, col('#ff6fbf'));
        this.axes(this.box, this.at(t1, H, f, -4 * S, up, -6 * S), r, up, f, 16 * S, 15 * S, 4 * S, col('#ff6fbf'));
        this.axes(this.box, this.at(t1, H, f, 6.6 * S, up, 4.6 * S), r, up, f, 13 * S, 2.6 * S, 2.4 * S, col('#ff6fbf'));
        break;
      case 'mitre':
        this.spike(this.at(t1, H, up, 5 * S), up, 7 * S, 16 * S, col('#f6f2ea'));
        this.seg(this.cyl, this.at(t1, H, up, 5 * S), this.at(t2, H, up, 6.6 * S), 7.2 * S, col(PAL.gold));
        this.axes(this.sph, this.at(t1, H, f, 3.6 * S, up, -4.4 * S), r, up, f, 6 * S, 4.2 * S, 5 * S, col('#cfcfd4'));
        break;
      case 'pastor': {
        this.axes(this.dome, this.at(t1, H, up, 1.2 * S), r, up, f, 8.5 * S, 5 * S, 8.5 * S, col('#8a6a45'));
        const ch = u.body.pts[J.CHEST];
        this.axes(this.box, this.at(t1, ch, f, 6.6 * S, up, 3 * S), r, up, f, 3 * S, 1.6 * S, 0.8 * S, C(PAL.white));
        for (const sd of [-1, 1]) this.axes(this.box, this.at(t1, ch, f, 6.9 * S, up, -6 * S, r, sd * 3 * S), r, up, f, 2 * S, 14 * S, 0.6 * S, col(team.main));
        this.axes(this.box, this.at(t1, u.body.pts[J.LHAND], f, 1.5 * S), r, up, f, 2.4 * S, 8 * S, 6 * S, col('#4a2a1a'));
        break;
      }
      case 'bonhoeffer': {
        this.axes(this.dome, this.at(t1, H, up, 1.2 * S), r, up, f, 8.5 * S, 5 * S, 8.5 * S, col('#a07a50'));
        for (const sd of [-1, 1]) this.axes(this.torus, this.at(t1, H, f, 8.2 * S, up, -0.2 * S, r, sd * 2.8 * S), r, f, up, 2.4 * S, 2.4 * S, 2.4 * S, C(PAL.ink));
        const ch = u.body.pts[J.CHEST];
        this.axes(this.box, this.at(t1, ch, f, 6.8 * S, up, -3 * S), r, up, f, 2.2 * S, 9 * S, 0.7 * S, col(team.main));
        this.axes(this.box, this.at(t1, ch, f, 6.4 * S, up, 2.4 * S), r, up, f, 5 * S, 2 * S, 0.8 * S, C(PAL.white));
        break;
      }
      case 'luther': {
        this.axes(this.dome, this.at(t1, H, up, 2.5 * S), r, up, f, 9.6 * S, 4 * S, 9.6 * S, col('#1f1b22'));
        this.axes(this.box, this.at(t1, u.body.pts[J.CHEST], f, 6.4 * S, up, 2.4 * S), r, up, f, 5 * S, 2 * S, 0.8 * S, C(PAL.white));
        this.axes(this.box, this.at(t1, u.body.pts[J.LHAND], f, 1.5 * S, up, 2 * S), r, up, f, 6 * S, 8 * S, 0.5 * S, C('#f4ecd8'));
        break;
      }
      case 'mlk': {
        this.axes(this.dome, this.at(t1, H, up, 1.4 * S), r, up, f, 8.3 * S, 4.4 * S, 8.3 * S, col('#1d1512'));
        this.axes(this.box, this.at(t1, H, f, 7.6 * S, up, -2.6 * S), r, up, f, 4.6 * S, 1 * S, 0.9 * S, col('#1d1512'));
        const ch = u.body.pts[J.CHEST];
        this.axes(this.box, this.at(t1, ch, f, 6.8 * S, up, -3 * S), r, up, f, 2.2 * S, 9 * S, 0.7 * S, col(team.main));
        this.axes(this.box, this.at(t1, ch, f, 6.4 * S, up, 2.4 * S), r, up, f, 5 * S, 2 * S, 0.8 * S, C(PAL.white));
        break;
      }
      case 'squirrelking': {
        for (const s of [-1, 1]) this.spike(this.at(t1, H, up, 6 * S, r, s * 4 * S), this.at(t2, up, r, s * 0.25), 2.4 * S, 6 * S, col(PAL.fur));
        this.ball(this.sph, this.at(t1, H, f, 8 * S, up, -1.6 * S), 1.5 * S, C(PAL.ink));
        this.axes(this.box, this.at(t1, H, f, 7.4 * S, up, -4 * S), r, up, f, 2.6 * S, 2.6 * S, 0.9 * S, col(PAL.white));
        // A gold crown and a royal cape in team colours.
        this.seg(this.cyl, this.at(t1, H, up, 5.5 * S), this.at(t2, H, up, 8.5 * S), 5.6 * S, col(PAL.gold));
        for (let k = 0; k < 5; k++) {
          const a = k / 5 * TAU;
          this.spike(this.at(t1, H, up, 8.3 * S, r, Math.cos(a) * 5 * S, f, Math.sin(a) * 5 * S), up, 1.3 * S, 3.2 * S, col(PAL.gold));
        }
        this.ball(this.gsph, this.at(t1, H, up, 7 * S, f, 5.5 * S), 1.1 * S, C('#ff4d6d'));
        const ch = u.body.pts[J.CHEST], pe = u.body.pts[J.PELVIS];
        const mid = this.t3.set((ch.x + pe.x) / 2, (ch.y + pe.y) / 2, (ch.z + pe.z) / 2);
        this.axes(this.box, this.at(t1, mid, f, -7.5 * S, up, -3 * S), r, up, f, 16 * S, 34 * S, 1.2 * S, col(team.main));
        this.axes(this.box, this.at(t1, ch, f, -3 * S, up, 1.5 * S), r, up, f, 15 * S, 3 * S, 8 * S, col(PAL.white));
        break;
      }
      case 'gru': {
        // Bald, a long pointy nose, and a striped scarf.
        this.spike(this.at(t1, H, f, 7 * S, up, -0.5 * S), this.at(t2, f, up, -0.1), 2 * S, 8 * S, col('#f2d9c2'));
        const ch = u.body.pts[J.CHEST];
        for (let k = 0; k < 3; k++) {
          this.axes(this.torus, this.at(t1, ch, up, (2 + k * 1.8) * S), r, up, f, 6.4 * S, 6.4 * S, 6.4 * S, col(k === 1 ? '#5a5a66' : '#2b2b30'));
        }
        this.axes(this.box, this.at(t1, ch, f, 6.8 * S, up, -2 * S, r, 2 * S), r, up, f, 2.6 * S, 10 * S, 1 * S, col(team.main));
        break;
      }
      case 'joseph': {
        this.axes(this.dome, this.at(t1, H, up, 1.4 * S), r, up, f, 8.6 * S, 5.4 * S, 8.6 * S, col('#5a3a22'));
        this.ball(this.sph, this.at(t1, H, up, 4.5 * S, f, 5 * S), 3 * S, col('#5a3a22'));
        const ch = u.body.pts[J.CHEST];
        this.axes(this.torus, this.at(t1, ch, up, 3 * S), r, up, f, 6 * S, 7 * S, 6 * S, col('#e8d6a0'));
        this.axes(this.box, this.at(t1, ch, f, -6 * S, up, -2 * S, r, 2 * S), r, up, f, 2.6 * S, 12 * S, 1 * S, col('#e8d6a0'));
        break;
      }
      case 'jotaro': {
        // The cap that merges into his hair, with a gold badge, and a long coat with a chain.
        this.axes(this.dome, this.at(t1, H, up, 1.6 * S, f, -0.6 * S), r, up, f, 9.2 * S, 7 * S, 9.4 * S, col('#16161c'));
        this.axes(this.box, this.at(t1, H, up, 2.6 * S, f, 7.8 * S), r, up, f, 12 * S, 1 * S, 4.5 * S, col('#16161c'));
        this.ball(this.sph, this.at(t1, H, up, 5.2 * S, f, 8.2 * S), 1.3 * S, col(PAL.gold));
        this.spike(this.at(t1, H, f, -7 * S, up, 1 * S), this.at(t2, f, f, -1, up, -0.6), 3.5 * S, 7 * S, col('#16161c'));
        const ch = u.body.pts[J.CHEST], pe = u.body.pts[J.PELVIS];
        const mid = this.t3.set((ch.x + pe.x) / 2, (ch.y + pe.y) / 2, (ch.z + pe.z) / 2);
        this.axes(this.box, this.at(t1, mid, f, -6 * S, up, -8 * S), r, up, f, 15 * S, 36 * S, 1.4 * S, col('#1f2a3a'));
        for (let k = 0; k < 4; k++) this.ball(this.sph, this.at(t1, ch, f, 6.8 * S, up, -k * 1.6 * S, r, (-4 + k * 1.2) * S), 0.7 * S, col(PAL.gold));
        break;
      }
      case 'dio': {
        this.axes(this.dome, this.at(t1, H, up, 0.6 * S), r, up, f, 9.4 * S, 7.5 * S, 9.4 * S, col('#f7d65a'));
        for (const sd of [-1, 1]) this.axes(this.sph, this.at(t1, H, r, sd * 6.5 * S, up, -4 * S, f, 1 * S), r, up, f, 2.6 * S, 6 * S, 3 * S, col('#f7d65a'));
        this.axes(this.torus, this.at(t1, H, up, 3.4 * S), r, up, f, 8.7 * S, 8.7 * S, 8.7 * S, col(team.main));
        this.axes(this.box, this.at(t1, u.body.pts[J.CHEST], f, 6.6 * S, up, -1 * S), r, up, f, 6 * S, 9 * S, 0.8 * S, col('#151418'));
        break;
      }
      case 'naruto': {
        // Spiky yellow hair, a headband with a metal plate, and whiskers.
        this.axes(this.dome, this.at(t1, H, up, 1.4 * S), r, up, f, 8.6 * S, 5.6 * S, 8.6 * S, col('#ffd23a'));
        for (const o of [[0, 1, 0], [0.7, 0.8, 0], [-0.7, 0.8, 0], [0, 0.8, -0.7], [0.5, 0.7, -0.6], [-0.5, 0.7, -0.6], [0.4, 0.8, 0.5], [-0.4, 0.8, 0.5], [0, 0.4, -1]]) {
          const dir = this.at(t2, up, up, o[1] - 1, r, o[0], f, o[2]);
          this.spike(this.at(t1, H, up, 3 * S, r, o[0] * 4 * S, f, o[2] * 4 * S), dir, 2.2 * S, 6.5 * S, col('#ffd23a'));
        }
        this.seg(this.cyl, this.at(t1, H, up, 2.2 * S), this.at(t2, H, up, 4.4 * S), 8.4 * S, col(team.main));
        this.axes(this.box, this.at(t1, H, up, 3.3 * S, f, 8.2 * S), r, up, f, 6 * S, 2.6 * S, 0.8 * S, col(PAL.steel));
        for (const sd of [-1, 1]) for (const k of [-1, 0, 1]) {
          this.axes(this.box, this.at(t1, H, f, 7.4 * S, up, (-2.4 + k * 1.1) * S, r, sd * 4.6 * S), r, up, f, 3 * S, 0.35 * S, 0.4 * S, C(PAL.ink));
        }
        break;
      }
      case 'titan': {
        const hair = ['#3a2a22', '#6b4a2e', '#c9a46a', '#2b2b30'][u.id % 4];
        this.axes(this.dome, this.at(t1, H, up, 1.4 * S), r, up, f, 8.7 * S, 7.2 * S, 8.7 * S, col(hair));
        for (const sd of [-1, 1]) {
          const e = this.at(t1, H, f, 6.4 * S, up, 1.8 * S, r, sd * 3.3 * S);
          this.ball(this.sph, e, 2.1 * S, C('#ffffff'));
          if (u.alive) this.ball(this.sph, this.at(t2, e, f, 1.9 * S), 0.6 * S, C(PAL.ink));
          this.ball(this.sph, this.at(t1, H, r, sd * 8 * S, up, 0.5 * S), 2 * S, col('#e0a58a'));
        }
        // The grin: far too many teeth, ear to ear.
        this.axes(this.box, this.at(t1, H, f, 6.6 * S, up, -3.4 * S), r, up, f, 11 * S, 3.6 * S, 2.6 * S, col('#9a5a48'));
        this.axes(this.box, this.at(t1, H, f, 7.4 * S, up, -3.4 * S), r, up, f, 10 * S, 2.2 * S, 1.6 * S, C('#f6f0e2'));
        for (const o of [-3.75, -1.25, 1.25, 3.75]) this.axes(this.box, this.at(t1, H, f, 8.25 * S, up, -3.4 * S, r, o * S), r, up, f, 0.25 * S, 2.3 * S, 0.2 * S, C('#c9bfae'));
        break;
      }
      case 'attacktitan': {
        this.axes(this.dome, this.at(t1, H, up, 1.4 * S, f, -0.8 * S), r, up, f, 9 * S, 7.4 * S, 9.2 * S, col('#2b1d16'));
        this.axes(this.box, this.at(t1, H, f, -6 * S, up, -5 * S), r, up, f, 13 * S, 12 * S, 3 * S, col('#2b1d16'));
        for (const sd of [-1, 1]) {
          this.ball(this.gsph, this.at(t1, H, f, 7 * S, up, 1.4 * S, r, sd * 3 * S), 1.3 * S, C(u.alive ? '#5fe08a' : '#2a4a3a'));
          this.axes(this.box, this.at(t1, H, f, 7.3 * S, up, 3 * S, r, sd * 3.2 * S), r, up, f, 4 * S, 1.1 * S, 1.4 * S, C(PAL.ink));
          this.spike(this.at(t1, H, r, sd * 7.6 * S, up, 1 * S), this.at(t2, up, r, sd * 1.2, f, -0.4), 1.6 * S, 4.5 * S, col('#c98a6a'));
          for (const k of [0, 1]) this.axes(this.box, this.at(t1, H, f, 6.4 * S, up, (-2.6 - k * 1.3) * S, r, sd * 5.4 * S), r, up, f, 2.6 * S, 0.5 * S, 1.8 * S, C('#a8453a'));
        }
        // No lips: just a long row of bared teeth.
        this.axes(this.box, this.at(t1, H, f, 7.2 * S, up, -3.4 * S), r, up, f, 7.5 * S, 2.8 * S, 2 * S, C('#f6f0e2'));
        for (const o of [-2.6, -0.9, 0.9, 2.6]) this.axes(this.box, this.at(t1, H, f, 8.25 * S, up, -3.4 * S, r, o * S), r, up, f, 0.25 * S, 2.9 * S, 0.2 * S, C('#b0705a'));
        break;
      }
      case 'scout':
      case 'eren': {
        const eren = u.t.hat === 'eren', hair = eren ? '#3a2a22' : ['#6b4a2e', '#c9a46a', '#2b2b30', '#8a5a33'][u.id % 4];
        this.axes(this.dome, this.at(t1, H, up, 1.2 * S), r, up, f, 8.6 * S, 7.2 * S, 8.6 * S, col(hair));
        if (eren) this.ball(this.sph, this.at(t1, H, f, -5 * S, up, -1 * S), 4.5 * S, col(hair));
        const ch = u.body.pts[J.CHEST], pe = u.body.pts[J.PELVIS];
        const mid = this.t3.set((ch.x + pe.x) / 2, (ch.y + pe.y) / 2, (ch.z + pe.z) / 2);
        // A cape in team colours with white wings on the back.
        this.axes(this.box, this.at(t1, mid, f, -7.2 * S, up, 1 * S), r, up, f, 15 * S, 28 * S, 1.2 * S, col(team.main));
        for (const sd of [-1, 1]) this.axes(this.box, this.at(t1, mid, f, -8 * S, up, 5 * S, r, sd * 2 * S), r, up, f, 3.2 * S, 5 * S, 0.5 * S, C(sd < 0 ? '#ffffff' : '#c9d1dc'));
        // ODM gear: gas canisters on both hips.
        for (const sd of [-1, 1]) {
          this.seg(this.cyl, this.at(t1, pe, r, sd * 9 * S, f, -5 * S), this.at(t2, pe, r, sd * 9 * S, f, 4 * S), 2.1 * S, col('#9aa3ad'));
          this.axes(this.box, this.at(t1, pe, r, sd * 7.5 * S, up, 2 * S), r, up, f, 2 * S, 4 * S, 4 * S, col('#5d6570'));
        }
        if (eren) this.ball(this.sph, this.at(t1, ch, f, 7 * S, up, -3 * S), 1 * S, C(PAL.gold));   // the key
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

  // The Duck: a white duck with an orange beak and webbed feet, and a team ribbon round its neck.
  duckBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST], hd = B[J.HEAD];
    const white = col('#fbfbf7'), orange = col('#f39a1e'), wing = col('#e8e6de');
    // A plump body low on the legs, so only the shins show, like a duck's.
    const c = this.at(this.t1, pe, up, 4 * S, f, -1 * S);
    this.axes(this.sph, c, r, up, f, 15 * S, 14 * S, 20 * S, white);
    this.spike(this.at(this.t2, c, f, -17 * S, up, 5 * S), this.at(this.t3, f, f, -2, up, 1.4), 6 * S, 9 * S, white);
    const flap = u.act === 'attack' ? Math.sin(u.actT * 40) * 0.6 : u.leaping ? Math.sin(u.leapT * 30) : 0;
    for (const sd of [-1, 1]) {
      const root = this.at(this.t2, c, r, sd * 13.5 * S, up, 3 * S, f, -2 * S);
      const span = this.at(this.t3, r, r, sd * flap, up, Math.abs(flap) * 0.8);
      if (flap) this.axes(this.sph, this.at(this.t4, root, span, 7 * S), r, up, f, 4 * S, 6 * S, 13 * S, wing);
      else this.axes(this.sph, root, r, up, f, 3 * S, 8 * S, 14 * S, wing);
      const kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      const hip = this.at(this.t2, pe, r, sd * 4 * S, up, -2 * S);
      this.seg(this.cyl, hip, kn, 1.5 * S, orange);
      this.seg(this.cyl, kn, ft, 1.4 * S, orange);
      this.axes(this.sph, this.at(this.t2, ft, f, 2.5 * S, up, 0.5 * S), r, up, f, 3.4 * S, 0.9 * S, 4.4 * S, orange);
    }
    const neck = this.at(this.t2, c, f, 10 * S, up, 8 * S);
    this.seg(this.cyl, neck, hd, 6 * S, white);
    this.axes(this.torus, this.at(this.t3, neck, up, 4 * S, f, 1.5 * S), r, up, f, 6.4 * S, 6.4 * S, 6.4 * S, col(team.main));
    this.ball(this.sph, hd, 8.5 * S, white);
    const open = u.act === 'attack' && u.actT < 0.5 ? 1.6 * S : 0;
    this.axes(this.sph, this.at(this.t3, hd, f, 9.5 * S, up, -1.5 * S + open * 0.3), r, up, f, 4.4 * S, 1.5 * S, 6 * S, orange);
    this.axes(this.sph, this.at(this.t3, hd, f, 9 * S, up, -3.2 * S - open), r, up, f, 3.8 * S, 1.2 * S, 5.2 * S, orange);
    for (const sd of [-1, 1]) this.ball(this.sph, this.at(this.t3, hd, f, 5.5 * S, up, 2.4 * S, r, sd * 5 * S), (u.alive ? 1.6 : 0.7) * S, C(PAL.ink));
  }

  // A Minion: a yellow capsule with goggles, team-coloured overalls and black gloves.
  minionBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST], hd = B[J.HEAD];
    const yellow = col('#f7d23a'), denim = col(team.main), black = col('#26242c');
    const bottom = this.at(this.t1, pe, up, -2 * S), top = this.at(this.t2, hd, up, 1 * S);
    this.seg(this.cyl, bottom, top, 9 * S, yellow);
    this.ball(this.sph, top, 9 * S, yellow);
    this.ball(this.sph, bottom, 9 * S, denim);
    this.seg(this.cyl, bottom, this.at(this.t3, pe, up, 7 * S), 9.2 * S, denim);
    this.axes(this.box, this.at(this.t3, pe, up, 11 * S, f, 7.8 * S), r, up, f, 9 * S, 9 * S, 2 * S, denim);
    for (const sd of [-1, 1]) this.seg(this.cyl, this.at(this.t3, pe, up, 14 * S, f, 8 * S, r, sd * 3.6 * S), this.at(this.t4, ch, up, 4 * S, f, -7 * S, r, sd * 4 * S), 0.9 * S, denim);
    // Goggles: one big eye or two, depending on the minion.
    const g = this.at(this.t3, top, up, -5 * S);
    this.seg(this.cyl, this.at(this.t4, g, up, -1.2 * S), this.at(this.t5, g, up, 1.2 * S), 9.4 * S, black);
    const eyes = u.id % 3 ? [-3.6, 3.6] : [0];
    for (const o of eyes) {
      const e = this.at(this.t4, g, r, o * S);
      const R0 = (eyes.length > 1 ? 3.4 : 4.4) * S;
      this.axes(this.cyl, this.at(this.t5, e, f, 9 * S), r, f, up, R0 + 0.8 * S, 2.4 * S, R0 + 0.8 * S, col('#b8bec8'));
      this.ball(this.sph, this.at(this.t5, e, f, 9.6 * S), R0, C('#ffffff'));
      if (u.alive) this.ball(this.sph, this.at(this.t5, e, f, 9.6 * S + R0 * 0.8), R0 * 0.38, C(PAL.ink));
    }
    this.axes(this.box, this.at(this.t3, top, up, -14 * S, f, 8.6 * S), r, up, f, 4.6 * S, (u.act === 'attack' ? 2 : 0.7) * S, 1 * S, C('#5a2a22'));
    for (const o of [-2, 0, 2]) this.seg(this.cyl, this.at(this.t3, top, up, 8 * S, r, o * S), this.at(this.t4, top, up, 12 * S, r, o * 1.6 * S), 0.3 * S, black);
    for (const sd of [-1, 1]) {
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND], kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      const sh = this.at(this.t3, ch, r, sd * 8.5 * S, up, -3 * S);
      this.seg(this.cyl, sh, el, 2 * S, yellow); this.seg(this.cyl, el, hn, 2 * S, yellow); this.ball(this.sph, hn, 2.8 * S, black);
      const hip = this.at(this.t3, pe, r, sd * 4 * S, up, -3 * S);
      this.seg(this.cyl, hip, kn, 2.8 * S, denim); this.seg(this.cyl, kn, ft, 2.6 * S, denim);
      this.axes(this.sph, this.at(this.t3, ft, f, 1.5 * S), r, up, f, 3.2 * S, 2.4 * S, 4.4 * S, black);
    }
  }

  // GPU: a graphics card standing on end on stubby legs, two fans facing the enemy and a team-coloured light strip.
  gpuBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, hd = B[J.HEAD], lk = B[J.LKNEE], rk = B[J.RKNEE];
    const bottom = this.t1.set((lk.x + rk.x) / 2, (lk.y + rk.y) / 2, (lk.z + rk.z) / 2);
    const h = Math.max(36 * S, bottom.distanceTo(hd) + 6 * S), w = 17 * S, th = 5 * S;
    const c = this.t2.set((bottom.x + hd.x) / 2, (bottom.y + hd.y) / 2, (bottom.z + hd.z) / 2);
    const hot = u.heat > 0, dark = col('#26242c');
    for (const sd of [-1, 1]) {
      const ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      this.seg(this.cyl, this.at(this.t3, c, up, -h / 2 + 1 * S, r, sd * 5 * S), ft, 1.5 * S, dark);
      this.ball(this.sph, ft, 2.6 * S, dark);
    }
    this.axes(this.box, c, r, up, f, w, h, th, col('#1f2024'));
    this.axes(this.box, this.at(this.t3, c, f, th * 0.5 + 0.5 * S), r, up, f, w - 1 * S, h - 1 * S, 1.2 * S, col('#3a3d44'));
    this.axes(this.box, this.at(this.t3, c, r, w / 2 + 0.2 * S, f, th * 0.3), r, up, f, 0.8 * S, h * 0.85, 1.4 * S, col(team.main));
    this.axes(this.box, this.at(this.t3, c, up, h / 2 - 0.5 * S, f, th * 0.3), r, up, f, w * 0.8, 0.8 * S, 1.4 * S, col(team.main));
    this.axes(this.box, this.at(this.t3, c, r, -w / 2 - 0.3 * S, up, -h * 0.1), r, up, f, 1 * S, h * 0.45, th * 0.5, col('#e8b94a'));
    this.axes(this.box, this.at(this.t3, c, up, h / 2 + 1 * S), r, up, f, w * 0.9, 2 * S, th + 1 * S, col('#c9d1dc'));
    // Two fans, spinning flat out when it overheats.
    const Rf = Math.min(w * 0.42, h * 0.22), spin = performance.now() / 1000 * (hot ? 40 : 14) + u.id;
    for (const o of [0.24, -0.24]) {
      const fc = this.at(this.t3, c, f, th / 2 + 1.3 * S, up, o * h);
      this.axes(this.cyl, fc, r, f, up, Rf, 1 * S, Rf, col('#151418'));
      for (let k = 0; k < 7; k++) {
        const a = spin + k * TAU / 7, ca = Math.cos(a), sa = Math.sin(a);
        const dir = this.t4.set(r.x * ca + up.x * sa, r.y * ca + up.y * sa, r.z * ca + up.z * sa);
        const perp = this.t5.crossVectors(f, dir);
        this.axes(this.box, this.at(this.nr, fc, dir, Rf * 0.55, f, 0.7 * S), dir, perp, f, Rf * 0.8, 2.2 * S, 0.4 * S, col('#2b2d33'));
      }
      if (hot) this.ball(this.gsph, this.at(this.nr, fc, f, 1 * S), Rf * 0.35, C('#ff5a2e'));
      else this.axes(this.cyl, this.at(this.nr, fc, f, 0.7 * S), r, f, up, Rf * 0.3, 1.2 * S, Rf * 0.3, col('#5a5f68'));
    }
    if (hot) for (let k = 0; k < 3; k++) {
      this.ball(this.puff, this.at(this.t3, c, up, h / 2 + (4 + k * 6 + Math.random() * 3) * S, r, (Math.random() - 0.5) * 6 * S), (3 + Math.random() * 2) * S, C('#8a8f98'));
    }
  }

  // Frozen solid by Gru's freeze ray: a block of ice around the whole body.
  iceBlock(u) {
    const B = u.body.pts, pe = B[J.PELVIS], hd = B[J.HEAD], S = u.S;
    const top = Math.max(hd.y, B[J.CHEST].y) + 10 * S;
    this.axes(this.ice, this.t1.set(pe.x, top / 2, pe.z), _X, _Y, _Z, 30 * S, top, 30 * S, C('#bff4ff'));
  }

  // A Stand: a see-through, glowing figure looming behind its user, throwing a blur of fists.
  stand(u, f, up, r, S) {
    const B = u.body.pts, ch = B[J.CHEST], col = C(u.t.stand), k = 1.15 * S;
    const base = this.at(this.t1, ch, f, -3 * S, up, 10 * S);
    const pel = this.at(this.t2, base, up, -20 * k);
    this.seg(this.ghostC, pel, base, 7 * k, col);
    this.ball(this.ghostS, base, 8 * k, col);
    this.ball(this.ghostS, this.at(this.t3, base, up, 13 * k), 7.5 * k, col);
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, reach = 18 + Math.random() * 18;
      const sh = this.at(this.t3, base, r, (i % 2 ? 7 : -7) * k);
      const fist = this.at(this.t4, sh, f, reach * k, r, Math.cos(a) * 6 * k, up, Math.sin(a) * 6 * k - 2 * k);
      this.seg(this.ghostC, sh, fist, 2.6 * k, col);
      this.ball(this.ghostS, fist, 3.6 * k, col);
    }
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

  // Tung Tung Tung Sahur: a wooden log with a face, stick limbs and a bat.
  // Giant Armadillo: upright with a banded shell, or rolled up into a ball while it bowls along.
  armadilloBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST], hd = B[J.HEAD];
    const shell = col('#8a7d6a'), band = col('#6e624f'), skin = col('#c9a98a');
    const mid = this.t1.set((pe.x + ch.x) / 2, (pe.y + ch.y) / 2, (pe.z + ch.z) / 2);
    if (u.leaping) {
      this.ball(this.sph, mid, 14 * S, shell);
      const spin = u.leapT * 12;
      for (let k = 0; k < 3; k++) {
        const a = spin + k * 1.05, n = this.t2.set(f.x * Math.cos(a) + up.x * Math.sin(a), f.y * Math.cos(a) + up.y * Math.sin(a), f.z * Math.cos(a) + up.z * Math.sin(a));
        this.axes(this.torus, mid, r, n, this.t3.crossVectors(r, n).normalize(), 14.2 * S, 14.2 * S, 14.2 * S, k ? band : col(team.main));
      }
      return;
    }
    const c = this.at(this.t2, mid, up, 2 * S, f, -2 * S);
    this.axes(this.sph, c, r, up, f, 11 * S, 15 * S, 11 * S, shell);
    for (let k = -2; k <= 2; k++) {
      const w = 11.2 * S * Math.sqrt(1 - (k / 4.3) ** 2);
      this.axes(this.torus, this.at(this.t3, c, up, k * 3.6 * S), r, up, f, w, w, w, k === 0 ? col(team.main) : band);
    }
    this.axes(this.sph, this.at(this.t3, c, f, 5 * S), r, up, f, 8 * S, 12 * S, 6 * S, skin);
    this.axes(this.sph, hd, r, up, f, 5 * S, 5 * S, 6 * S, skin);
    this.axes(this.dome, this.at(this.t3, hd, up, 1 * S), r, up, f, 5.2 * S, 3 * S, 6.2 * S, shell);
    this.spike(this.at(this.t3, hd, f, 4 * S, up, -1 * S), this.at(this.t4, f, up, -0.2), 2 * S, 8 * S, skin);
    for (const sd of [-1, 1]) {
      this.spike(this.at(this.t3, hd, up, 3 * S, r, sd * 3 * S), this.at(this.t4, up, r, sd * 0.4), 1.6 * S, 4 * S, skin);
      this.ball(this.sph, this.at(this.t3, hd, f, 4.6 * S, up, 1.5 * S, r, sd * 2.6 * S), 0.9 * S, C(PAL.ink));
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND], kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      const sh = this.at(this.t3, ch, r, sd * 8 * S, up, -3 * S);
      this.seg(this.cyl, sh, el, 2 * S, skin); this.seg(this.cyl, el, hn, 1.9 * S, skin); this.ball(this.sph, hn, 2.2 * S, band);
      const hip = this.at(this.t3, pe, r, sd * 5 * S, up, -2 * S);
      this.seg(this.cyl, hip, kn, 2.6 * S, skin); this.seg(this.cyl, kn, ft, 2.4 * S, skin); this.ball(this.sph, ft, 2.8 * S, band);
    }
    this.spike(this.at(this.t3, pe, f, -9 * S, up, -3 * S), this.at(this.t4, f, f, -2, up, -0.6), 3 * S, 14 * S, shell);
  }

  logBody(u, f, up, r, S, team, col) {
    const B = u.body.pts, hd = B[J.HEAD], pe = B[J.PELVIS], ch = B[J.CHEST];
    const wood = col('#b07a45'), dark = col('#7a5230');
    const bottom = this.at(this.t1, pe, up, -6 * S), top = this.at(this.t2, hd, up, 6 * S);
    this.seg(this.cyl, bottom, top, 8.5 * S, wood);
    this.seg(this.cyl, top, this.at(this.t3, top, up, 0.6 * S), 8.6 * S, col('#e0b27a'));
    for (const k of [0.3, 0.62]) {
      const ring = this.t3.set(lerp(bottom.x, top.x, k), lerp(bottom.y, top.y, k), lerp(bottom.z, top.z, k));
      this.seg(this.cyl, this.at(this.t4, ring, up, -0.4 * S), this.at(this.t5, ring, up, 0.4 * S), 8.7 * S, dark);
    }
    this.seg(this.cyl, this.at(this.t3, pe, up, 8 * S), this.at(this.t4, pe, up, 10.5 * S), 8.75 * S, col(team.main));
    for (const sd of [-1, 1]) {
      const e = this.at(this.t3, hd, f, 7.8 * S, up, 1 * S, r, sd * 3 * S);
      this.ball(this.sph, e, 2.4 * S, C(PAL.white));
      if (u.alive) this.ball(this.sph, this.at(this.t4, e, f, 1.3 * S), 1.2 * S, C(PAL.ink));
    }
    this.axes(this.box, this.at(this.t3, hd, f, 8.3 * S, up, -4 * S), r, up, f, 5 * S, 1.3 * S, 0.6 * S, C(PAL.ink));
    for (const sd of [-1, 1]) {
      const sh = this.at(this.t3, ch, r, sd * 8.6 * S), el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND];
      this.seg(this.cyl, sh, el, 1.4 * S, dark); this.seg(this.cyl, el, hn, 1.3 * S, dark); this.ball(this.sph, hn, 1.7 * S, dark);
      const hip = this.at(this.t3, pe, r, sd * 4 * S, up, -5 * S), kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      this.seg(this.cyl, hip, kn, 1.5 * S, dark); this.seg(this.cyl, kn, ft, 1.4 * S, dark); this.ball(this.sph, ft, 2 * S, dark);
    }
    this.weapon(u, 'r', col);
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
    const dual = w === 'axe' || w === 'katana' || w === 'mace' || w === 'sticks' || w === 'blades';
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
      case 'blades':
        this.axes(this.box, along(t1, 0), X, d, Z, 1.8 * S, 4 * S, 2.4 * S, col('#5d6570'));
        this.axes(this.box, along(t1, 15), X, d, Z, 0.35 * S, 25 * S, 2 * S, col('#e4e9f0'));
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
      case 'gpu':
        if (side === 'r') {
          this.axes(this.box, along(t1, 5), X, d, Z, 3 * S, 10 * S, 6 * S, col('#1f1f22'));
          this.axes(this.box, along(t1, 5), X, d, Z, 3.2 * S, 2 * S, 6.2 * S, col('#76b900'));
        }
        break;
      case 'dagger':
        this.axes(this.box, along(t1, 1), X, d, Z, 1 * S, 1 * S, 4 * S, col(PAL.ink));
        this.axes(this.box, along(t1, 7), X, d, Z, 0.5 * S, 11 * S, 1.8 * S, col(PAL.steel));
        break;
      case 'laptop':
        if (side !== 'r') break;
        if (u.t.style === 'summon') {
          // Held open between the hands.
          const a = B[J.LHAND], c = t3.set((a.x + h.x) / 2, (a.y + h.y) / 2, (a.z + h.z) / 2).addScaledVector(this.u, 1 * S);
          this.axes(this.box, c, this.r, this.u, this.f, 12 * S, 0.8 * S, 8 * S, col('#9aa3ad'));
          this.axes(this.box, this.at(t1, c, this.u, 4 * S, this.f, -4 * S), this.r, this.u, this.f, 12 * S, 8 * S, 0.6 * S, col('#2b2f3a'));
          this.axes(this.gsph, this.at(t1, c, this.u, 4 * S, this.f, -3.6 * S), this.r, this.u, this.f, 5 * S, 3.4 * S, 0.2 * S, C('#7fd6ff'));
        } else this.axes(this.box, along(t1, 5), X, d, Z, 1 * S, 10 * S, 7 * S, col('#9aa3ad'));
        break;
      case 'edison':
        if (side === 'r') {
          this.axes(this.box, along(t1, 3), X, d, Z, 4 * S, 7 * S, 4 * S, col('#f4f4f4'));
          this.axes(this.box, this.at(t1, h, d, 4 * S, Z, 2.1 * S), X, d, Z, 2.4 * S, 3 * S, 0.3 * S, C('#2b2f3a'));
        }
        break;
      case 'sticks':
        this.seg(this.cyl, along(t1, -2), along(t2, 16), 0.6 * S, col('#d9b380'));
        this.ball(this.sph, along(t1, 16), 0.9 * S, col('#d9b380'));
        break;
      case 'cash':
        if (side === 'r' && !(u.act === 'attack' && u.fired)) this.axes(this.box, along(t1, 3), X, d, Z, 2 * S, 7 * S, 4 * S, col('#5fbf5a'));
        break;
      case 'crozier':
        this.seg(this.cyl, along(t1, -14), along(t2, 24), 1.1 * S, col(PAL.gold));
        this.nr.copy(d).negate();
        this.axes(this.torus, along(t1, 27), X, Z, this.nr, 3 * S, 3 * S, 3 * S, col(PAL.gold));
        break;
      case 'bat':
        this.seg(this.cyl, along(t1, -4), along(t2, 8), 1.1 * S, col('#d9b380'));
        this.seg(this.cyl, along(t1, 8), along(t2, 26), 2.4 * S, col('#d9b380'));
        this.ball(this.sph, along(t1, 26), 2.4 * S, col('#d9b380'));
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
      case 'freezeray':
        if (side === 'r') {
          this.axes(this.box, along(t1, 4), X, d, Z, 4 * S, 12 * S, 5 * S, col('#8a8f98'));
          this.seg(this.cyl, along(t1, 9), along(t2, 20), 1.8 * S, col('#5a5f68'));
          for (const k of [12, 15, 18]) this.seg(this.cyl, along(t1, k), along(t2, k + 1), 2.6 * S, col('#3fb8d8'));
          this.ball(this.gsph, along(t1, 21), (u.act === 'attack' ? 3 : 2) * S, C('#9ff3ff'));
        }
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
    } else if (p.kind === 'wave') {
      // A ring of sound flying flat toward its target, widening as it goes.
      const n = this.t3.set(nx, ny, nz), X = this.t4.crossVectors(n, _Y);
      if (X.lengthSq() < 1e-4) X.set(1, 0, 0);
      X.normalize();
      const Z = this.t5.crossVectors(X, n).normalize(), grow = 1 + (0.9 - p.life) * 1.2;
      this.axes(this.gtorus, p, X, n, Z, 9 * grow, 9 * grow, 9 * grow, C('#c9a0ff'));
    } else if (p.kind === 'rocket') {
      const n = this.t3.set(nx, ny, nz);
      this.seg(this.cyl, t1.set(p.x - nx * 10, p.y - ny * 10, p.z - nz * 10), p, 2.2, C('#f4f4f4'));
      this.spike(p, n, 2.2, 5, C(PAL.ink));
      this.ball(this.gsph, t1.set(p.x - nx * 12, p.y - ny * 12, p.z - nz * 12), 2.6 + Math.random() * 1.5, C('#ffb347'));
    } else if (p.kind === 'token') {
      this.ball(this.gsph, p, 2.6, C('#7fd6ff'));
    } else if (p.kind === 'cash') {
      this.axes(this.box, p, _X, _Y, _Z, 6, 1, 3, C('#5fbf5a'));
    } else if (p.kind === 'cannon') {
      this.ball(this.sph, p, p.r, C(PAL.iron));
    } else if (p.kind === 'hex') {
      this.ball(this.gsph, p, p.r, C('#b56cff'));
    } else if (p.kind === 'pie') {
      this.ball(this.sph, p, 4, C(PAL.crust));
      this.ball(this.sph, t1.set(p.x, p.y + 2, p.z), 3.2, C(PAL.cream));
    } else if (p.kind === 'freeze') {
      this.ball(this.gsph, p, 3, C('#e6fdff'));
      this.seg(this.gcyl, t1.set(p.x - nx * 26, p.y - ny * 26, p.z - nz * 26), p, 1.6, C('#7fe8ff'));
    } else if (p.kind === 'clacker') {
      // Two balls on a string, whirling.
      const a = p.life * 30, ox = Math.cos(a) * 5, oy = Math.sin(a) * 5;
      t1.set(p.x + ox * nz, p.y + oy, p.z - ox * nx); t2.set(p.x - ox * nz, p.y - oy, p.z + ox * nx);
      this.seg(this.cyl, t1, t2, 0.25, C('#f4efe4'));
      this.ball(this.sph, t1, 2.6, C('#c94a3a'));
      this.ball(this.sph, t2, 2.6, C('#c94a3a'));
    } else if (p.kind === 'roller') {
      // A road roller, dropping out of the sky.
      const yel = C('#f4c542'), grey = C('#6e7480');
      this.axes(this.box, t1.set(p.x, p.y + 6, p.z), _X, _Y, _Z, 44, 26, 30, yel);
      this.axes(this.box, t1.set(p.x - 8, p.y + 24, p.z), _X, _Y, _Z, 18, 12, 22, C('#3a3f4c'));
      this.axes(this.cyl, t1.set(p.x + 30, p.y - 6, p.z), _X, _Z, this.t3.set(0, -1, 0), 14, 34, 14, grey);
      this.axes(this.cyl, t1.set(p.x - 22, p.y - 9, p.z), _X, _Z, this.t3.set(0, -1, 0), 11, 32, 11, grey);
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
      const hex = fl.disco ? ['#ff5fd2', '#5fe3ff', '#ffe45f'][Math.floor(t * 9) % 3] : fl.bolt ? '#cfefff' : fl.heal ? '#b8ffc4' : fl.bass ? '#ff8ad0' : fl.gpu ? '#b6ff6a' : '#fff3c4';
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
      const batch = this.callouts[c.text] || this.callouts.another;
      this.billboard(batch, c, 18 + (1 - t) * 6, C('#ffffff'), 4);
    }
    for (const bm of W.beams) {
      if (bm.specium) {
        this.seg(this.gcyl, bm.from, bm.end, 6 + 14 * (bm.life / 0.5), C('#c9f6ff'));
        continue;
      }
      let s = bm.a.body.pts[J.RHAND];
      const c = bm.b.body.pts[J.CHEST];
      if (bm.bounce) s = bm.a.body.pts[J.CHEST];
      else if (bm.gpu) { const q = bm.a.body.pts[J.CHEST], S = bm.a.S; s = this.t3.set(q.x + bm.a.fx * 5 * S, q.y + 4 * S, q.z + bm.a.fz * 5 * S); }
      if (bm.laser) {
        this.seg(this.gcyl, s, c, bm.gpu ? 1.8 : 1.4, C(bm.gpu ? '#a6ff4a' : PAL.laser));
        this.ball(this.gsph, c, 3.5, C(bm.gpu ? '#e0ffc0' : '#ffb0b0'));
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
