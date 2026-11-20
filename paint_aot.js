'use strict';
// How Attack on Titan looks: uniforms and faces, the Nine Titans, the Founder's skeleton, Wall Titans, bone Titans,
// cannons, Marley's airships and the Cart Titan's panzer unit, plus steam, crystal and ability effects. Visual only.

(() => {
  const V = () => new THREE.Vector3();
  const q1 = V(), q2 = V(), q3 = V(), q4 = V(), q5 = V(), q6 = V(), q7 = V(), q8 = V();
  const wtime = () => (typeof W !== 'undefined' && W ? W.time : performance.now() / 1000);
  const CRYSTAL = '#cfefff', BONE = '#e6dcc6';

  // ---------- outfits ----------
  const SURVEY = { torso: '#8a6a45', limbs: '#8a6a45', legs: '#efe8da', boot: '#3a2a22', belt: 'main' };
  const GARRISON = { torso: '#6e5236', limbs: '#6e5236', legs: '#e6dfd0', boot: '#3a2a22', belt: 'main' };
  const S4 = { torso: '#26242c', limbs: '#26242c', legs: '#3a3a44', boot: '#1f1b22', belt: 'main' };
  const MARLEY = { torso: '#7a6e4e', limbs: '#7a6e4e', legs: '#6a5f42', boot: '#2f2a26', belt: 'main' };
  const NAKED = { torso: 'skin', limbs: 'skin', legs: 'skin', hands: 'skin', boot: 'skin', belt: 'main', noEyes: true };
  Object.assign(LOOK, {
    levi: SURVEY, mikasa: SURVEY, hange: SURVEY, erwin: SURVEY, jean: SURVEY, connie: SURVEY, sasha: SURVEY,
    garrison: GARRISON, pixis: GARRISON, thunder: S4, armin: S4,
    erenwh: { torso: '#1f1b22', limbs: '#1f1b22', legs: '#2b2b30', boot: '#1f1b22', belt: 'main' },
    marley: MARLEY, gabi: MARLEY, falco: MARLEY, reiner: MARLEY, reinerhuman: MARLEY, bertholdt: MARLEY, zeke: MARLEY, pieck: MARLEY, porco: MARLEY,
    annie: { torso: '#e6e6ea', limbs: '#e6e6ea', legs: '#3a3a44', boot: '#2b2b30', belt: 'main' },
    willy: { torso: '#2b2b30', limbs: '#2b2b30', legs: '#2b2b30', boot: '#151418', belt: 'main' },
  });
  LOOK.erenfounder = LOOK.erenwh;
  for (const k of ['armored', 'colossalB', 'colossalA', 'walltitan', 'female', 'beast', 'jaw', 'jawbird', 'warhammer', 'attackwh', 'abnormal', 'smiling', 'puretitan', 'pasttitan',
    'past_attack', 'past_armored', 'past_female', 'past_jaw', 'past_beast', 'past_hammer']) LOOK[k] = NAKED;
  Object.assign(SKIN_OF, {
    armored: '#c99a82', colossalB: '#b24c42', colossalA: '#b85a4e', walltitan: '#a9473d', female: '#efc6ae', beast: '#7a5a3c', jaw: '#d6ad8c', jawbird: '#d9b49a',
    warhammer: '#eadbd2', attackwh: '#c98a6a', abnormal: '#e2b49c', smiling: '#eebda4', puretitan: '#e8b49a', pasttitan: '#cdd6e4',
    past_attack: '#cdd6e4', past_armored: '#cdd6e4', past_female: '#d6dbe6', past_jaw: '#cdd6e4', past_beast: '#aab4c4', past_hammer: '#dfe4ee',
  });

  // ---------- shared pieces ----------
  function hair(P, H, f, up, r, S, hex, col, o = {}) {
    P.axes(P.dome, P.at(q1, H, up, (o.lift ?? 1.2) * S, f, -(o.back || 0) * S), r, up, f, (o.rx || 8.6) * S, (o.ry || 7.2) * S, (o.rz || o.rx || 8.6) * S, col(hex));
  }
  function cape(P, u, f, up, r, S, team, col, wings) {
    const ch = u.body.pts[J.CHEST], pe = u.body.pts[J.PELVIS];
    const mid = q2.set((ch.x + pe.x) / 2, (ch.y + pe.y) / 2, (ch.z + pe.z) / 2);
    P.axes(P.box, P.at(q3, mid, f, -7.2 * S, up, 1 * S), r, up, f, 15 * S, 28 * S, 1.2 * S, col(team.main));
    if (wings) for (const sd of [-1, 1]) P.axes(P.box, P.at(q3, mid, f, -8 * S, up, 5 * S, r, sd * 2 * S), r, up, f, 3.2 * S, 5 * S, 0.5 * S, C(sd < 0 ? '#ffffff' : '#c9d1dc'));
  }
  // A coloured band round the left upper arm: Marley's armbands, in team colours so you can tell the sides apart.
  function armband(P, u, f, up, r, S, col, hex) {
    const ch = u.body.pts[J.CHEST], el = u.body.pts[J.LELB];
    const sh = P.at(q2, ch, r, -6.4 * S, up, -2.2 * S);
    const a = q3.set(sh.x + (el.x - sh.x) * 0.35, sh.y + (el.y - sh.y) * 0.35, sh.z + (el.z - sh.z) * 0.35);
    const b = q4.set(sh.x + (el.x - sh.x) * 0.6, sh.y + (el.y - sh.y) * 0.6, sh.z + (el.z - sh.z) * 0.6);
    P.seg(P.cyl, a, b, 3.4 * S, col(hex));
  }
  function glasses(P, H, f, up, r, S) {
    for (const sd of [-1, 1]) P.axes(P.torus, P.at(q1, H, f, 8 * S, up, 0.4 * S, r, sd * 2.8 * S), r, f, up, 2.2 * S, 2.2 * S, 2.2 * S, C(PAL.ink));
  }
  // Titan eyes: whites with small pupils (or glowing for the Attack Titan and the dead-eyed Founder).
  function titanEyes(P, u, H, f, up, r, S, white, pupil, spread = 3.2, size = 1.9, glow) {
    for (const sd of [-1, 1]) {
      const e = P.at(q1, H, f, 6.5 * S, up, 1.6 * S, r, sd * spread * S);
      if (glow) P.ball(P.gsph, e, size * 0.7 * S, C(u.alive ? glow : '#3a4a3a'));
      else {
        P.ball(P.sph, e, size * S, C(white));
        if (u.alive) P.ball(P.sph, P.at(q2, e, f, size * 0.85 * S), size * 0.35 * S, C(pupil));
      }
    }
  }
  function teeth(P, H, f, up, r, S, w, lips) {
    if (lips) P.axes(P.box, P.at(q1, H, f, 6.6 * S, up, -3.4 * S), r, up, f, (w + 1) * S, 3.6 * S, 2.6 * S, C(lips));
    P.axes(P.box, P.at(q1, H, f, 7.3 * S, up, -3.4 * S), r, up, f, w * S, 2.4 * S, 1.8 * S, C('#f6f0e2'));
    for (let o = -w / 2 + 1.2; o < w / 2 - 0.5; o += 1.6) P.axes(P.box, P.at(q1, H, f, 8.25 * S, up, -3.4 * S, r, o * S), r, up, f, 0.22 * S, 2.5 * S, 0.2 * S, C('#b8a898'));
  }

  // ---------- people ----------
  HATS.levi = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#1d1a1a', col, { ry: 7.6 });
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, f, 6 * S, up, 4.5 * S, r, sd * 2.6 * S), r, up, f, 4 * S, 2.4 * S, 2.4 * S, col('#1d1a1a'));
    this.axes(this.box, this.at(q1, u.body.pts[J.CHEST], f, 6.8 * S, up, 1.5 * S), r, up, f, 4 * S, 5 * S, 1.2 * S, C('#f6f2ea'));   // cravat
    cape(this, u, f, up, r, S, team, col, true);
  };
  HATS.mikasa = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#151214', col, { ry: 7.6 });
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, r, sd * 6.5 * S, up, -2 * S), r, up, f, 2.5 * S, 8 * S, 6 * S, col('#151214'));
    const ch = u.body.pts[J.CHEST];
    this.axes(this.torus, this.at(q1, ch, up, 3.5 * S), r, up, f, 6.2 * S, 7 * S, 6.2 * S, C('#c0302a'));   // the scarf
    this.axes(this.box, this.at(q1, ch, f, -5 * S, up, -1 * S, r, -2 * S), r, up, f, 2.8 * S, 11 * S, 1 * S, C('#c0302a'));
    cape(this, u, f, up, r, S, team, col, true);
  };
  HATS.hange = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#6b4a30', col);
    this.ball(this.sph, this.at(q1, H, f, -7 * S, up, 1 * S), 3.4 * S, col('#6b4a30'));
    for (const sd of [-1, 1]) this.axes(this.torus, this.at(q1, H, f, 6 * S, up, 5 * S, r, sd * 2.8 * S), r, f, up, 2.4 * S, 2.4 * S, 2.4 * S, col('#8a7a5a'));
    this.axes(this.box, this.at(q1, H, f, 7.7 * S, up, -0.2 * S, r, -2.7 * S), r, up, f, 3 * S, 2.6 * S, 0.6 * S, C('#151418'));   // eyepatch
    cape(this, u, f, up, r, S, team, col, true);
  };
  HATS.erwin = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#e8cf8a', col, { ry: 6.6, back: 0.6 });
    this.ball(this.sph, this.at(q1, u.body.pts[J.CHEST], f, 7 * S, up, 1 * S), 1.1 * S, C('#5fbf8a'));   // bolo tie
    cape(this, u, f, up, r, S, team, col, true);
  };
  HATS.jean = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#a07a4a', col, { ry: 6.4, lift: 2 });
    cape(this, u, f, up, r, S, team, col, true);
  };
  HATS.connie = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#8a8a90', col, { ry: 4.2, lift: 2.6, rx: 8.4 });
    cape(this, u, f, up, r, S, team, col, true);
  };
  HATS.sasha = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#6b4a2e', col);
    this.ball(this.sph, this.at(q1, H, f, -7.5 * S, up, 2 * S), 3 * S, col('#6b4a2e'));
    this.seg(this.cyl, this.at(q1, H, f, -8 * S, up, 1 * S), this.at(q2, H, f, -9 * S, up, -7 * S), 1.8 * S, col('#6b4a2e'));
    cape(this, u, f, up, r, S, team, col, true);
  };
  HATS.garrison = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, ['#3a2a22', '#6b4a2e', '#2b2b30', '#a07a4a'][u.id % 4], col);
    const ch = u.body.pts[J.CHEST];
    for (const o of [-1.2, 1.2]) this.ball(this.sph, this.at(q1, ch, f, 6.9 * S, up, 1 * S, r, (-3 + o) * S), 1.1 * S, col(team.main));   // the twin roses
  };
  HATS.pixis = function (u, H, f, up, r, S, team, col) {
    this.axes(this.box, this.at(q1, H, f, 7.6 * S, up, -2.6 * S), r, up, f, 6 * S, 1.2 * S, 1 * S, C('#e8e2d4'));   // moustache
    this.axes(this.box, this.at(q1, H, f, 7 * S, up, -5 * S), r, up, f, 3 * S, 2.4 * S, 1.2 * S, C('#e8e2d4'));
    const ch = u.body.pts[J.CHEST];
    for (const o of [-1.2, 1.2]) this.ball(this.sph, this.at(q1, ch, f, 6.9 * S, up, 1 * S, r, (-3 + o) * S), 1.1 * S, col(team.main));
  };
  HATS.thunder = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, ['#3a2a22', '#6b4a2e', '#1d1a1a', '#a07a4a'][u.id % 4], col);
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.armin = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#f2d16b', col, { ry: 7.6 });
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, r, sd * 6.6 * S, up, -1.5 * S), r, up, f, 2.4 * S, 7 * S, 6.5 * S, col('#f2d16b'));
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.eren4 = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#3a2a22', col, { ry: 7.4 });
    this.ball(this.sph, this.at(q1, H, f, -6 * S, up, 4 * S), 3.2 * S, col('#3a2a22'));   // the half-bun
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, r, sd * 6.4 * S, up, -3 * S, f, -1 * S), r, up, f, 2.4 * S, 9 * S, 6 * S, col('#3a2a22'));
    this.axes(this.box, this.at(q1, H, f, 7.2 * S, up, -4.6 * S), r, up, f, 5 * S, 2 * S, 1 * S, col('#5a4636'));   // stubble
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.marley = function (u, H, f, up, r, S, team, col) {
    this.axes(this.dome, this.at(q1, H, up, 1.8 * S), r, up, f, 9.4 * S, 6.6 * S, 9.4 * S, col('#5a5f48'));
    this.axes(this.torus, this.at(q1, H, up, 1.9 * S), r, up, f, 9.6 * S, 9.6 * S, 9.6 * S, col('#4a4f3a'));
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.gabi = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#2b1d16', col);
    this.seg(this.cyl, this.at(q1, H, up, 4.6 * S), this.at(q2, H, up, 7.5 * S), 7.4 * S, col('#5a5f48'));   // warrior candidate's cap
    this.axes(this.box, this.at(q1, H, up, 4.8 * S, f, 7 * S), r, up, f, 8 * S, 0.8 * S, 4 * S, col('#4a4f3a'));
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.falco = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#d8c07a', col);
    this.seg(this.cyl, this.at(q1, H, up, 4.6 * S), this.at(q2, H, up, 7.5 * S), 7.4 * S, col('#5a5f48'));
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.willy = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#d8c07a', col, { ry: 6.4, back: 0.8 });
    const ch = u.body.pts[J.CHEST];
    this.axes(this.box, this.at(q1, ch, f, 6.6 * S, up, 2.2 * S), r, up, f, 4.4 * S, 1.6 * S, 1 * S, col(team.main));   // bow tie
    this.axes(this.box, this.at(q1, ch, f, 6.4 * S, up, -2 * S), r, up, f, 3 * S, 8 * S, 0.6 * S, C('#f4efe4'));
  };
  HATS.reiner = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#e8cf8a', col, { ry: 5.2, lift: 2.4 });
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.bertholdt = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#3a2a22', col, { ry: 6.6 });
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.annie = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#e8cf8a', col);
    this.ball(this.sph, this.at(q1, H, f, -6.5 * S, up, 1 * S), 3 * S, col('#e8cf8a'));   // the bun
    this.axes(this.dome, this.at(q1, H, f, -3 * S, up, -3 * S), r, up, f, 9.5 * S, 6 * S, 9 * S, col('#d8d8de'));   // hoodie hood, down
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.zeke = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#c9a64a', col, { ry: 6.4 });
    this.axes(this.sph, this.at(q1, H, f, 4.4 * S, up, -4.6 * S), r, up, f, 6.2 * S, 4 * S, 4.6 * S, col('#c9a64a'));
    glasses(this, H, f, up, r, S);
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.pieck = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#151214', col, { ry: 7.6 });
    this.axes(this.box, this.at(q1, H, f, -5.5 * S, up, -8 * S), r, up, f, 13 * S, 20 * S, 3 * S, col('#151214'));
    armband(this, u, f, up, r, S, col, team.main);
  };
  HATS.porco = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#d8c07a', col, { ry: 6, lift: 1.8 });
    armband(this, u, f, up, r, S, col, team.main);
  };

  // ---------- Titans ----------
  HATS.armored = function (u, H, f, up, r, S, team, col) {
    const plate = col(u.t.past ? '#e4e8f0' : '#e8e2cf'), crack = col('#b5534a');
    const B = u.body.pts, ch = B[J.CHEST], pe = B[J.PELVIS], off = u.armorOff;
    // A helmet of plates; the eyes look out between them.
    this.axes(this.dome, this.at(q1, H, up, 0.8 * S, f, 0.4 * S), r, up, f, 9.2 * S, 8.4 * S, 9.4 * S, off ? crack : plate);
    if (!off) {
      this.axes(this.box, this.at(q1, H, f, 7.6 * S, up, 3.4 * S), r, up, f, 11 * S, 2.6 * S, 2 * S, plate);
      for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, f, 6.6 * S, up, -2.4 * S, r, sd * 4.6 * S), r, up, f, 3.4 * S, 6 * S, 2 * S, plate);
      this.axes(this.box, this.at(q1, H, f, 7.4 * S, up, -5.4 * S), r, up, f, 7 * S, 2.6 * S, 2 * S, plate);
    }
    titanEyes(this, u, H, f, up, r, S, '#f2efe6', '#3a3a3a', 2.8, 1.5);
    // Plates over chest, shoulders, forearms and thighs; patches of raw muscle once they're broken.
    const mid = q2.set((ch.x + pe.x) / 2, (ch.y + pe.y) / 2, (ch.z + pe.z) / 2);
    const len = Math.sqrt((ch.x - pe.x) ** 2 + (ch.y - pe.y) ** 2 + (ch.z - pe.z) ** 2);
    this.axes(this.box, this.at(q3, mid, f, 6.4 * S), r, up, f, 15 * S, len + 4 * S, 2.4 * S, off ? crack : plate);
    if (!off) for (const sd of [-1, 1]) this.axes(this.box, this.at(q3, mid, f, 7.6 * S, up, (sd * 3) * S), r, up, f, 13 * S, 0.5 * S, 0.6 * S, col('#b8ae96'));
    for (const sd of [-1, 1]) {
      this.axes(this.dome, this.at(q3, ch, r, sd * 7 * S, up, -1 * S), r, up, f, 5.4 * S, 4.4 * S, 5.4 * S, off && sd > 0 ? crack : plate);
      if (off && sd < 0) continue;
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND], kn = B[sd < 0 ? J.LKNEE : J.RKNEE];
      this.seg(this.cyl, el, hn, 3.5 * S, plate);
      this.seg(this.cyl, this.at(q4, pe, r, sd * 4 * S, up, -2 * S), kn, 4 * S, plate);
    }
    if (u.hard > 0) this.ball(this.gsph, this.at(q3, ch, f, 7 * S), 1.2 * S, C(CRYSTAL));
  };
  HATS.colossal = function (u, H, f, up, r, S, team, col) {
    // No skin: a bare skull of muscle, a lipless row of teeth, sunken eyes.
    titanEyes(this, u, H, f, up, r, S, '#d8d0c4', '#2b2b30', 3.2, 1.6);
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, f, 6.8 * S, up, 3.2 * S, r, sd * 3.2 * S), r, up, f, 4.2 * S, 1.4 * S, 1.4 * S, col('#7a2a24'));
    teeth(this, H, f, up, r, S, 9, null);
    for (const sd of [-1, 1]) for (const k of [0, 1, 2]) this.axes(this.box, this.at(q1, H, f, 6 * S, up, (-1.6 - k * 1.3) * S, r, sd * 5.6 * S), r, up, f, 2.6 * S, 0.45 * S, 1.6 * S, C('#e8a090'));
    const ch = u.body.pts[J.CHEST];
    for (let k = 0; k < 3; k++) this.axes(this.torus, this.at(q1, ch, up, -(2 + k * 3.4) * S), r, up, f, 7.3 * S * (u.t.fat || 1), 7.3 * S, 7.3 * S * (u.t.fat || 1), C('#d98a7a'));
    if (u.key === 'walltitan') {
      // Still wearing pieces of the Wall it stood inside for a hundred years.
      for (const [a, b, c2, s] of [[-7, 2, -2, 6], [7, 3, -3, 7], [0, 1, -7, 8], [4, -6, -6, 5]]) {
        this.axes(this.box, this.at(q1, ch, r, a * S, up, b * S, f, c2 * S), r, up, f, s * S, s * 0.7 * S, s * 0.8 * S, col('#8d8a86'));
      }
    }
  };
  HATS.colossalA = function (u, H, f, up, r, S, team, col) {
    HATS.colossal.call(this, u, H, f, up, r, S, team, col);
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, r, sd * 6.8 * S, up, 1 * S), r, up, f, 2 * S, 9 * S, 6 * S, col('#e8d27a'));
    hair(this, H, f, up, r, S, '#e8d27a', col, { ry: 5, lift: 2 });
  };
  HATS.female = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#e8cf8a', col, { ry: 7.6 });
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, r, sd * 6.6 * S, up, -2 * S, f, 1 * S), r, up, f, 2.4 * S, 7 * S, 6.4 * S, col('#e8cf8a'));
    titanEyes(this, u, H, f, up, r, S, '#ffffff', '#3f7fc0', 3, 1.6);
    for (const sd of [-1, 1]) for (const k of [0, 1]) this.axes(this.box, this.at(q1, H, f, 6.8 * S, up, (-2 - k * 1.4) * S, r, sd * 4.4 * S), r, up, f, 3 * S, 0.4 * S, 1.4 * S, C('#c9786a'));
    this.axes(this.box, this.at(q1, H, f, 7.6 * S, up, -4 * S), r, up, f, 4 * S, 0.6 * S, 0.8 * S, C('#a8584a'));
  };
  HATS.beast = function (u, H, f, up, r, S, team, col) {
    const fur = col(u.t.past ? '#9aa4b4' : '#5a3e28'), face = col(u.t.past ? '#c8d0dc' : '#c9a07a');
    this.axes(this.dome, this.at(q1, H, up, -0.5 * S, f, -1 * S), r, up, f, 10 * S, 10 * S, 10 * S, fur);
    this.axes(this.sph, this.at(q1, H, f, 5.5 * S, up, -2.4 * S), r, up, f, 6 * S, 5 * S, 4.4 * S, face);
    titanEyes(this, u, H, f, up, r, S, '#f2e8d2', '#2b2b30', 2.8, 1.3);
    for (const sd of [-1, 1]) this.ball(this.sph, this.at(q1, H, r, sd * 8.6 * S, up, 1 * S), 2.2 * S, face);
    // A mane round the shoulders, fur on the forearms, and big hands.
    const B = u.body.pts, ch = B[J.CHEST];
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * TAU;
      this.spike(this.at(q1, ch, r, Math.cos(a) * 7 * S, f, Math.sin(a) * 6 * S, up, 2 * S), this.at(q2, up, r, Math.cos(a) * 0.8, f, Math.sin(a) * 0.6), 3 * S, 6 * S, fur);
    }
    for (const sd of [-1, 1]) {
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND];
      this.seg(this.cyl, el, hn, 3.8 * S, fur);
      this.ball(this.sph, hn, 4.6 * S, face);
    }
  };
  HATS.jaw = function (u, H, f, up, r, S, team, col) {
    const plate = col(u.t.past ? '#eef2f8' : '#ece4d4');
    hair(this, H, f, up, r, S, u.t.past ? '#b8c2d2' : '#6b5a3a', col, { ry: 7.6, back: 1 });
    this.axes(this.box, this.at(q1, H, f, -6 * S, up, -4 * S), r, up, f, 12 * S, 10 * S, 3 * S, col(u.t.past ? '#b8c2d2' : '#6b5a3a'));
    // The hardened mask and that jaw.
    this.axes(this.box, this.at(q1, H, f, 7 * S, up, 2.2 * S), r, up, f, 10 * S, 3 * S, 2.4 * S, plate);
    this.axes(this.box, this.at(q1, H, f, 7.4 * S, up, -3.6 * S), r, up, f, 9 * S, 4.4 * S, 3.4 * S, plate);
    teeth(this, H, f, up, r, S, 8, null);
    titanEyes(this, u, H, f, up, r, S, '#ffffff', '#2b2b30', 3, 1.2);
    for (const sd of [-1, 1]) {
      const hn = u.body.pts[sd < 0 ? J.LHAND : J.RHAND], el = u.body.pts[sd < 0 ? J.LELB : J.RELB];
      const d = q2.set(hn.x - el.x, hn.y - el.y, hn.z - el.z).normalize();
      for (const o of [-1.4, 0, 1.4]) this.spike(this.at(q3, hn, r, o * S), d, 0.8 * S, 5 * S, plate);
    }
  };
  HATS.jawbird = function (u, H, f, up, r, S, team, col) {
    const feather = col('#d8d0c4'), tip = col('#8a8070');
    hair(this, H, f, up, r, S, '#e8e2d4', col, { ry: 7.4, back: 1 });
    this.spike(this.at(q1, H, f, 6 * S, up, -2 * S), this.at(q2, f, up, -0.25), 3 * S, 8 * S, col('#ece4d4'));   // hardened beak
    titanEyes(this, u, H, f, up, r, S, '#ffffff', '#2b2b30', 3, 1.2);
    // Wings, beating.
    const ch = u.body.pts[J.CHEST], beat = Math.sin(wtime() * 9 + u.id) * 0.5;
    for (const sd of [-1, 1]) {
      const root = this.at(q3, ch, r, sd * 6 * S, f, -3 * S, up, 2 * S);
      for (let k = 1; k <= 4; k++) {
        const span = k * 7 * S, rise = Math.sin(beat) * span * 0.8;
        const p = this.at(q4, root, r, sd * span, up, rise - k * 1.5 * S, f, -k * 2 * S);
        this.axes(this.sph, p, r, up, f, 5 * S, 1.2 * S, (9 - k) * S, k === 4 ? tip : feather);
      }
    }
  };
  HATS.warhammer = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, u.t.past ? '#b8c2d2' : '#2b1d16', col, { ry: 7.6, back: 1 });
    this.axes(this.box, this.at(q1, H, f, -6 * S, up, -7 * S), r, up, f, 13 * S, 16 * S, 3 * S, col(u.t.past ? '#b8c2d2' : '#2b1d16'));
    // A crystal mask with eye slits, crystal plates on the shoulders.
    this.axes(this.box, this.at(q1, H, f, 7 * S, up, 0.6 * S), r, up, f, 10.5 * S, 8 * S, 2.4 * S, C(CRYSTAL));
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, f, 8.3 * S, up, 1.4 * S, r, sd * 2.8 * S), r, up, f, 3 * S, 0.7 * S, 0.4 * S, C('#1a2a3a'));
    const ch = u.body.pts[J.CHEST];
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, ch, r, sd * 7.5 * S, up, 1 * S), r, up, f, 5 * S, 2 * S, 6 * S, C(CRYSTAL));
    // The cord in the nape that runs back underground to Lara's crystal.
    if (u.cocoon && u.cocoon.alive && u.alive) {
      const nape = this.at(q2, H, f, -6 * S, up, -6 * S), c = u.cocoon.P;
      this.seg(this.gcyl, nape, q3.set(c.x, groundH(c.x, c.z) + 4, c.z), 0.9 * S, C('#9fd8ef'));
    }
  };
  HATS.attackwh = function (u, H, f, up, r, S, team, col) {
    attackFace(this, u, H, f, up, r, S, col);
    // War Hammer crystal over the fists and shins.
    const B = u.body.pts;
    for (const sd of [-1, 1]) {
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND], kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      this.seg(this.cyl, q1.set((el.x + hn.x) / 2, (el.y + hn.y) / 2, (el.z + hn.z) / 2), hn, 3.6 * S, C(CRYSTAL));
      this.ball(this.sph, hn, 4.2 * S, C(CRYSTAL));
      this.seg(this.cyl, kn, q1.set((kn.x + ft.x) / 2, (kn.y + ft.y) / 2, (kn.z + ft.z) / 2), 3.8 * S, C(CRYSTAL));
    }
  };
  function attackFace(P, u, H, f, up, r, S, col) {
    P.axes(P.dome, P.at(q1, H, up, 1.4 * S, f, -0.8 * S), r, up, f, 9 * S, 7.4 * S, 9.2 * S, col('#2b1d16'));
    P.axes(P.box, P.at(q1, H, f, -6 * S, up, -5 * S), r, up, f, 13 * S, 12 * S, 3 * S, col('#2b1d16'));
    titanEyes(P, u, H, f, up, r, S, null, null, 3, 1.9, '#5fe08a');
    for (const sd of [-1, 1]) {
      P.axes(P.box, P.at(q1, H, f, 7.3 * S, up, 3 * S, r, sd * 3.2 * S), r, up, f, 4 * S, 1.1 * S, 1.4 * S, C(PAL.ink));
      P.spike(P.at(q1, H, r, sd * 7.6 * S, up, 1 * S), P.at(q2, up, r, sd * 1.2, f, -0.4), 1.6 * S, 4.5 * S, col('#c98a6a'));
    }
    teeth(P, H, f, up, r, S, 7.5, null);
  }
  HATS.abnormal = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, ['#6b4a2e', '#2b2b30', '#a07a4a'][u.id % 3], col, { ry: 4.4, lift: 3 });
    titanEyes(this, u, H, f, up, r, S, '#ffffff', '#151418', 3.6, 2.6);
    this.axes(this.box, this.at(q1, H, f, 7 * S, up, -4 * S), r, up, f, 5 * S, 3.6 * S, 2 * S, C('#5a2a22'));   // gaping mouth
  };
  HATS.smiling = function (u, H, f, up, r, S, team, col) {
    hair(this, H, f, up, r, S, '#b88a5a', col, { ry: 7.4, back: 0.5 });
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, r, sd * 6.6 * S, up, -2 * S), r, up, f, 2.4 * S, 8 * S, 6 * S, col('#b88a5a'));
    // Happy, closed eyes and that wide closed-lip smile.
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q1, H, f, 7.4 * S, up, 1.8 * S, r, sd * 3.2 * S), r, up, f, 3 * S, 0.5 * S, 0.6 * S, C(PAL.ink));
    this.axes(this.box, this.at(q1, H, f, 7.5 * S, up, -3.4 * S), r, up, f, 10 * S, 0.7 * S, 0.8 * S, C('#7a3a32'));
    for (const sd of [-1, 1]) {
      this.axes(this.box, this.at(q1, H, f, 7.2 * S, up, -2.6 * S, r, sd * 5.4 * S), r, up, f, 1.6 * S, 0.7 * S, 0.8 * S, C('#7a3a32'));
      this.ball(this.sph, this.at(q1, H, f, 6.6 * S, up, -1.6 * S, r, sd * 4.4 * S), 2 * S, col('#f2c4ac'));
    }
  };

  // ---------- whole bodies ----------
  function boneLimb(P, a, b, rad, col) { P.seg(P.cyl, a, b, rad, col); P.ball(P.sph, b, rad * 1.25, col); }
  BODIES.founder = function (u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST], hd = B[J.HEAD], bone = col(BONE);
    // A spine up to the skull, and a ribcage.
    for (let i = 0; i <= 6; i++) {
      const k = i / 6;
      this.ball(this.sph, q1.set(pe.x + (hd.x - pe.x) * k, pe.y + (hd.y - pe.y) * k, pe.z + (hd.z - pe.z) * k).addScaledVector(f, -3 * S), 2.6 * S, bone);
    }
    for (let k = 0; k < 5; k++) {
      const R0 = (8.5 - k * 0.7) * S;
      this.axes(this.torus, this.at(q1, ch, up, -k * 3.4 * S, f, 1 * S), r, up, f, R0, R0, R0 * 0.8, bone);
    }
    this.seg(this.cyl, this.at(q1, ch, f, 7.5 * S), this.at(q2, ch, f, 6 * S, up, -12 * S), 1.2 * S, bone);
    this.axes(this.sph, pe, r, up, f, 7 * S, 3.5 * S, 4.4 * S, bone);
    this.axes(this.torus, this.at(q1, pe, up, 1 * S), r, up, f, 7.6 * S, 7.6 * S, 5 * S, col(team.main));
    // The endless spine trailing out behind, down to the ground and away.
    for (let i = 1; i <= 16; i++) {
      const p = this.at(q1, pe, f, -i * 5.5 * S, up, -Math.min(i * 2.2, 22) * S, r, Math.sin(u.phase * 0.5 + i * 0.5) * 2 * S);
      const g = groundH(p.x, p.z) + 2 * S;
      if (p.y < g) p.y = g;
      this.ball(this.sph, p, (3 - i * 0.08) * S, bone);
      this.spike(p, q2.copy(up), 0.8 * S, 4 * S, bone);
    }
    for (const sd of [-1, 1]) {
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND], kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      const sh = this.at(q2, ch, r, sd * 8 * S, up, -2 * S);
      this.ball(this.sph, sh, 2.8 * S, bone);
      boneLimb(this, sh, el, 1.8 * S, bone); boneLimb(this, el, hn, 1.6 * S, bone);
      const d = q3.set(hn.x - el.x, hn.y - el.y, hn.z - el.z).normalize();
      for (const o of [-1.5, 0, 1.5]) this.spike(this.at(q4, hn, r, o * S), d, 0.7 * S, 5 * S, bone);
      const hip = this.at(q2, pe, r, sd * 5 * S, up, -1 * S);
      boneLimb(this, hip, kn, 2.2 * S, bone); boneLimb(this, kn, ft, 2 * S, bone);
    }
    // The skull: the Attack Titan's face with the skin gone, long dark hair, burning eyes.
    this.ball(this.sph, hd, 8.5 * S, bone);
    this.axes(this.dome, this.at(q1, hd, up, 1 * S, f, -1.5 * S), r, up, f, 9 * S, 7 * S, 9.5 * S, col('#2b1d16'));
    this.axes(this.box, this.at(q1, hd, f, -7 * S, up, -8 * S), r, up, f, 12 * S, 16 * S, 2.5 * S, col('#2b1d16'));
    for (const sd of [-1, 1]) {
      const e = this.at(q1, hd, f, 6.5 * S, up, 1.2 * S, r, sd * 3.2 * S);
      this.ball(this.sph, e, 2.1 * S, C('#1a1414'));
      if (u.alive) this.ball(this.gsph, this.at(q2, e, f, 1.2 * S), 0.9 * S, C('#ffb347'));
    }
    teeth(this, hd, f, up, r, S, 8, null);
    this.axes(this.box, this.at(q1, hd, f, 5.5 * S, up, -6.2 * S), r, up, f, 9 * S, 2 * S, 5 * S, bone);
    this.ball(this.gsph, this.at(q1, hd, f, -7 * S, up, -4 * S), 1.6 * S, C('#ffd9a0'));   // Eren, in the nape
  };
  BODIES.bone = function (u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST], hd = B[J.HEAD], bone = col(BONE);
    this.seg(this.cyl, pe, hd, 1.6 * S, bone);
    for (let k = 0; k < 3; k++) { const R0 = (6.5 - k * 0.8) * S; this.axes(this.torus, this.at(q1, ch, up, -k * 3.6 * S, f, 1 * S), r, up, f, R0, R0, R0 * 0.8, bone); }
    this.axes(this.sph, pe, r, up, f, 5.5 * S, 3 * S, 3.6 * S, bone);
    this.axes(this.torus, this.at(q1, pe, up, 0.5 * S), r, up, f, 6 * S, 6 * S, 4 * S, col(team.main));
    for (const sd of [-1, 1]) {
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND], kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      const sh = this.at(q2, ch, r, sd * 6.5 * S, up, -2 * S);
      boneLimb(this, sh, el, 1.4 * S, bone); boneLimb(this, el, hn, 1.2 * S, bone);
      const d = q3.set(hn.x - el.x, hn.y - el.y, hn.z - el.z).normalize();
      for (const o of [-1.2, 0, 1.2]) this.spike(this.at(q4, hn, r, o * S), d, 0.6 * S, 4.5 * S, bone);
      boneLimb(this, this.at(q2, pe, r, sd * 4 * S, up, -1 * S), kn, 1.6 * S, bone); boneLimb(this, kn, ft, 1.5 * S, bone);
    }
    this.axes(this.sph, hd, r, up, f, 6.4 * S, 7 * S, 7 * S, bone);
    for (const sd of [-1, 1]) {
      const e = this.at(q1, hd, f, 5.4 * S, up, 1.2 * S, r, sd * 2.6 * S);
      this.ball(this.sph, e, 1.8 * S, C('#1a1414'));
      if (u.alive) this.ball(this.gsph, this.at(q2, e, f, 1 * S), 0.8 * S, C('#7fe0ff'));
    }
    teeth(this, hd, f, up, r, S, 6, null);
  };
  // The Cart Titan: on all fours, long dark hair, Marley's panzer unit strapped to its back.
  BODIES.cart = function (u, f, up, r, S, team, col) {
    const pe = u.P, g = groundH(pe.x, pe.z), skin = col('#c8a088'), hairC = col('#151214');
    const fl = q8.set(u.fx, 0, u.fz).normalize(), rt = q7.set(-u.fz, 0, u.fx).normalize(), Y = _Y;
    const c = q1.set(pe.x, u.alive ? g + 15 * S : Math.max(g + 6 * S, pe.y - 10 * S), pe.z);
    this.axes(this.sph, c, rt, Y, fl, 8 * S, 7 * S, 16 * S, skin);
    const head = this.at(q2, c, fl, 17 * S, Y, 3 * S);
    this.ball(this.sph, head, 6.5 * S, skin);
    this.axes(this.dome, this.at(q3, head, Y, 1 * S, fl, -1 * S), rt, Y, fl, 7 * S, 6 * S, 7.4 * S, hairC);
    this.axes(this.box, this.at(q3, head, fl, -5 * S, Y, -3 * S), rt, Y, fl, 10 * S, 9 * S, 6 * S, hairC);
    for (const sd of [-1, 1]) this.axes(this.box, this.at(q3, head, fl, 5.8 * S, Y, 1 * S, rt, sd * 2.6 * S), rt, Y, fl, 2.8 * S, 0.7 * S, 0.8 * S, C(PAL.ink));
    if (u.t.armor && !u.armorOff) this.axes(this.dome, this.at(q3, head, Y, 3 * S), rt, Y, fl, 7.4 * S, 4 * S, 7.6 * S, col('#7a7f86'));
    const legs = [[9, -1], [9, 1], [-10, -1], [-10, 1]];
    legs.forEach(([fo, sd], i) => {
      const top = this.at(q3, c, fl, fo * S, rt, sd * 6 * S, Y, -3 * S);
      const sw = Math.sin(u.phase * 1.4 + (i % 2 ? PI : 0) + (i > 1 ? PI / 2 : 0)) * 5 * S;
      const foot = q4.set(top.x + fl.x * sw, g + 1.5 * S, top.z + fl.z * sw);
      const knee = q5.set((top.x + foot.x) / 2 + fl.x * 2 * S, (top.y + foot.y) / 2, (top.z + foot.z) / 2 + fl.z * 2 * S);
      this.seg(this.cyl, top, knee, 2.6 * S, skin); this.seg(this.cyl, knee, foot, 2.3 * S, skin); this.ball(this.sph, foot, 2.8 * S, skin);
    });
    // The panzer unit: platform, turret, machine guns, the anti-Titan gun and a team flag.
    const steel = col('#5d6570');
    this.axes(this.box, this.at(q3, c, Y, 8 * S), rt, Y, fl, 12 * S, 2 * S, 18 * S, steel);
    const tur = this.at(q4, c, Y, 11 * S, fl, -1 * S);
    this.axes(this.box, tur, rt, Y, fl, 6 * S, 4 * S, 6 * S, col('#4a5058'));
    for (const sd of [-1, 1]) this.seg(this.cyl, this.at(q5, tur, rt, sd * 2 * S, Y, 0.5 * S), this.at(q6, tur, rt, sd * 2 * S, Y, 0.5 * S, fl, 9 * S), 0.45 * S, C('#2b2b30'));
    this.seg(this.cyl, this.at(q5, tur, Y, 2.6 * S), this.at(q6, tur, Y, 3.6 * S, fl, 13 * S), 1.1 * S, C('#3a3f46'));
    const pole = this.at(q5, c, Y, 9 * S, fl, -14 * S);
    this.seg(this.cyl, pole, this.at(q6, pole, Y, 10 * S), 0.35 * S, C('#3a2a22'));
    this.axes(this.box, this.at(q6, pole, Y, 8 * S, fl, -3 * S), rt, Y, fl, 0.3 * S, 4 * S, 6 * S, col(team.main));
  };
  // Marley's airship: a long envelope, ribbed, with fins, a gondola and spinning propellers. It falls burning when shot down.
  BODIES.airship = function (u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST];
    const c = q1.set((pe.x + ch.x) / 2, (pe.y + ch.y) / 2, (pe.z + ch.z) / 2).addScaledVector(up, 14 * S);
    const skin = col('#c9c3b2');
    this.axes(this.sph, c, r, up, f, 13 * S, 12 * S, 40 * S, skin);
    this.axes(this.sph, c, r, up, f, 13.3 * S, 2.4 * S, 39 * S, col(team.main));
    for (const k of [-2, -1, 0, 1, 2]) {
      const R0 = 13.15 * S * Math.sqrt(1 - (k * 12 / 40) ** 2);
      this.axes(this.torus, this.at(q2, c, f, k * 12 * S), r, f, up, R0, R0 * 0.92, R0, col('#a8a290'));
    }
    for (const sd of [-1, 1]) {
      this.axes(this.box, this.at(q2, c, f, -36 * S, up, sd * 10 * S), r, up, f, 0.8 * S, 9 * S, 10 * S, col(team.dark));
      this.axes(this.box, this.at(q2, c, f, -36 * S, r, sd * 10 * S), r, up, f, 9 * S, 0.8 * S, 10 * S, col(team.dark));
      const eng = this.at(q3, c, up, -8 * S, r, sd * 13 * S, f, -10 * S);
      this.axes(this.sph, eng, r, up, f, 2.4 * S, 2.4 * S, 4.4 * S, col('#5d6570'));
      const a = wtime() * 30 + sd;
      const blade = q4.set(r.x * Math.cos(a) + up.x * Math.sin(a), r.y * Math.cos(a) + up.y * Math.sin(a), r.z * Math.cos(a) + up.z * Math.sin(a));
      this.seg(this.cyl, this.at(q5, eng, f, -4.6 * S, blade, -4 * S), this.at(q6, eng, f, -4.6 * S, blade, 4 * S), 0.5 * S, C('#2b2b30'));
    }
    const gond = this.at(q2, c, up, -15 * S, f, 4 * S);
    this.axes(this.box, gond, r, up, f, 6 * S, 4 * S, 16 * S, col('#5a4632'));
    for (const k of [-5, -1.5, 2, 5.5]) for (const sd of [-1, 1]) this.ball(this.gsph, this.at(q3, gond, f, k * S, r, sd * 3.05 * S, up, 0.5 * S), 0.7 * S, C('#ffe6a0'));
    if (!u.alive || u.hp < u.t.hp * 0.3) for (let i = 0; i < 3; i++) {
      this.ball(this.gsph, this.at(q3, c, f, (Math.random() - 0.5) * 60 * S, up, (Math.random() - 0.2) * 12 * S, r, (Math.random() - 0.5) * 18 * S), (3 + Math.random() * 3) * S, C(Math.random() < 0.5 ? '#ffb347' : '#f2622e'));
    }
  };
  // Cannons stay level whatever the invisible crew's body is doing.
  function gun(P, u, S, team, col, big) {
    const pe = u.P, g = groundH(pe.x, pe.z), x = pe.x, z = pe.z;
    const F = q1.set(u.fx, 0, u.fz).normalize(), Rr = q2.set(-u.fz, 0, u.fx).normalize(), down = q3.set(0, -1, 0);
    const wood = col(big ? '#4a5240' : '#6e4b30');
    P.axes(P.box, q4.set(x, g + 6 * S, z), Rr, _Y, F, 12 * S, 6 * S, 16 * S, wood);
    for (const sd of [-1, 1]) P.axes(P.cyl, q4.set(x + Rr.x * sd * 8 * S, g + 7 * S, z + Rr.z * sd * 8 * S), F, Rr, down, 7 * S, 2 * S, 7 * S, col('#3a2a22'));
    const el = clamp(u.aimY || 0.1, 0, 0.9) * 0.6, cs = Math.cos(el), sn = Math.sin(el), L = (big ? 34 : 24) * S;
    const breech = q5.set(x - F.x * 6 * S, g + 11 * S, z - F.z * 6 * S);
    P.seg(P.cyl, breech, q6.set(breech.x + F.x * L * cs, breech.y + L * sn, breech.z + F.z * L * cs), (big ? 3.2 : 2.4) * S, C(big ? '#3a3f36' : '#2b2b30'));
    if (big) P.axes(P.box, q4.set(x + F.x * 4 * S, g + 14 * S, z + F.z * 4 * S), Rr, _Y, F, 16 * S, 10 * S, 1 * S, col('#5a6250'));
    const pole = q4.set(x - F.x * 9 * S + Rr.x * 5 * S, g + 6 * S, z - F.z * 9 * S + Rr.z * 5 * S);
    P.seg(P.cyl, pole, q7.set(pole.x, pole.y + 18 * S, pole.z), 0.3 * S, C('#3a2a22'));
    P.axes(P.box, q8.set(pole.x - F.x * 3 * S, pole.y + 15 * S, pole.z - F.z * 3 * S), Rr, _Y, F, 0.3 * S, 4 * S, 6 * S, col(team.main));
  }
  BODIES.cannon = function (u, f, up, r, S, team, col) { gun(this, u, S, team, col, false); };
  BODIES.artillery = function (u, f, up, r, S, team, col) { gun(this, u, S, team, col, true); };
  // Lara Tybur, asleep in crystal.
  BODIES.cocoon = function (u, f, up, r, S, team, col) {
    const pe = u.P, g = groundH(pe.x, pe.z);
    this.axes(this.torus, q1.set(pe.x, g + 1, pe.z), _X, _Y, _Z, 18 * S, 18 * S, 18 * S, col(team.main));
    if (!u.alive) {
      for (let k = 0; k < 6; k++) this.spike(q1.set(pe.x + Math.cos(k * 1.1) * 14 * S, g, pe.z + Math.sin(k * 1.1) * 14 * S), q2.set(Math.cos(k * 1.1), 0.4, Math.sin(k * 1.1)), 2.4 * S, 9 * S, C(CRYSTAL));
      return;
    }
    const c = q1.set(pe.x, g + 22 * S, pe.z);
    this.ball(this.sph, this.at(q2, c, _Y, 8 * S), 3.6 * S, C('#4a5a6a'));
    this.seg(this.cyl, this.at(q2, c, _Y, 4 * S), this.at(q3, c, _Y, -14 * S), 3 * S, C('#4a5a6a'));
    this.axes(this.ice, c, _X, _Y, _Z, 22 * S, 44 * S, 18 * S, C('#bfe9ff'));
    for (let k = 0; k < 5; k++) this.spike(q2.set(pe.x + Math.cos(k * 1.3) * 12 * S, g, pe.z + Math.sin(k * 1.3) * 10 * S), q3.set(Math.cos(k * 1.3) * 0.3, 1, Math.sin(k * 1.3) * 0.3), 3 * S, 16 * S, C(CRYSTAL));
  };

  // Erwin's horse.
  const baseHog = Painter.prototype.hog;
  Painter.prototype.hog = function (u, pe, f, up, r, S, col) {
    if (!u.t.horse) return baseHog.call(this, u, pe, f, up, r, S, col);
    const coat = col('#7a5232'), dark = col('#2e1e12');
    const c = this.at(q1, pe, up, -9 * S);
    this.axes(this.sph, c, r, up, f, 7 * S, 7.5 * S, 17 * S, coat);
    this.axes(this.box, this.at(q2, c, up, 7 * S), r, up, f, 10 * S, 1.4 * S, 9 * S, col(TEAM[u.team].main));
    const nk = this.at(q2, c, f, 12 * S, up, 3 * S), hd = this.at(q3, c, f, 20 * S, up, 13 * S);
    this.seg(this.cyl, nk, hd, 3.8 * S, coat);
    this.seg(this.cyl, this.at(q4, nk, up, 3 * S, f, -1 * S), this.at(q5, hd, up, 2.5 * S, f, -1 * S), 1.3 * S, dark);
    const head = this.at(q4, hd, f, 3 * S, up, 1 * S);
    this.axes(this.sph, head, r, up, f, 3.4 * S, 3.4 * S, 6.5 * S, coat);
    this.ball(this.sph, this.at(q5, head, f, 5.5 * S, up, -1 * S), 2.4 * S, dark);
    for (const sd of [-1, 1]) {
      this.spike(this.at(q5, head, up, 2.8 * S, r, sd * 1.6 * S, f, -2 * S), up, 0.8 * S, 3 * S, coat);
      this.ball(this.sph, this.at(q5, head, f, 1 * S, up, 1.2 * S, r, sd * 3 * S), 0.8 * S, C(PAL.ink));
    }
    [[11, -1], [11, 1], [-11, -1], [-11, 1]].forEach(([fo, sd], i) => {
      const top = this.at(q5, c, f, fo * S, r, sd * 4.5 * S, up, -4 * S);
      const sw = Math.sin(u.phase * 1.3 + (i % 2 ? 0.6 : 0) + (i > 1 ? PI : 0)) * 6 * S;
      const foot = this.at(q6, top, up, -16 * S, f, sw);
      const knee = this.at(q7, top, up, -8 * S, f, sw * 0.4 + (fo > 0 ? 1 : -1) * 1.5 * S);
      this.seg(this.cyl, top, knee, 2 * S, coat); this.seg(this.cyl, knee, foot, 1.7 * S, coat); this.ball(this.sph, foot, 1.9 * S, dark);
    });
    this.seg(this.cyl, this.at(q5, c, f, -16 * S, up, 3 * S), this.at(q6, c, f, -21 * S, up, -9 * S, r, Math.sin(u.phase) * 2 * S), 1.6 * S, dark);
  };

  // ---------- weapons ----------
  WEAPONS.rifle = function (u, side, col, h, d, X, Z, along) {
    this.seg(this.cyl, along(q1, -9), along(q2, 3), 1.8 * u.S, col(PAL.wood));
    this.seg(this.cyl, along(q1, 3), along(q2, 34), 0.8 * u.S, col(PAL.darkSteel));
    this.spike(along(q1, 33), d, 0.5 * u.S, 6 * u.S, C(PAL.steel));
  };
  // Thunder spear launchers strapped to both forearms.
  WEAPONS.tspear = function (u) {
    const B = u.body.pts, S = u.S;
    for (const [hj, ej] of [[J.RHAND, J.RELB], [J.LHAND, J.LELB]]) {
      this.weaponFrame(B[hj], B[ej]);
      const h = B[hj], d = this.wd, X = this.wx, Z = this.wz;
      this.axes(this.box, this.at(q1, h, d, -4 * S, X, 2.4 * S), X, d, Z, 2.4 * S, 10 * S, 2.4 * S, col0('#3a3f2c'));
      this.spike(this.at(q1, h, d, 1 * S, X, 2.4 * S), d, 1 * S, 4 * S, C('#c9d1dc'));
    }
  };
  const col0 = hex => C(hex);

  // ---------- projectiles ----------
  PROJ_PAINT.tspear = function (p, nx, ny, nz) {
    const n = q1.set(nx, ny, nz);
    if (p.stuck) {
      this.ball(this.gsph, p, 2.4 + Math.sin(performance.now() / 40) * 1.2, C('#ff5a2e'));
      return;
    }
    this.seg(this.cyl, q2.set(p.x - nx * 14, p.y - ny * 14, p.z - nz * 14), p, 1.2, C('#3a3f2c'));
    this.spike(p, n, 1.4, 4, C('#c9d1dc'));
    this.ball(this.gsph, q2.set(p.x - nx * 15, p.y - ny * 15, p.z - nz * 15), 1.6 + Math.random(), C('#ffb347'));
  };
  PROJ_PAINT.rock = function (p) { this.ball(this.sph, p, p.r, C('#8a7d6a')); };
  PROJ_PAINT.bigrock = function (p) {
    this.ball(this.sph, p, p.r, C('#8a7d6a'));
    this.ball(this.sph, q1.set(p.x + p.r * 0.5, p.y + p.r * 0.3, p.z), p.r * 0.6, C('#7a6e5c'));
  };
  PROJ_PAINT.shell = function (p, nx, ny, nz) {
    this.seg(this.gcyl, q1.set(p.x - nx * 18, p.y - ny * 18, p.z - nz * 18), p, 1.2, C('#ffe6a0'));
    this.ball(this.sph, p, 3, C('#3a3f36'));
  };
  PROJ_PAINT.bomb = function (p) {
    this.axes(this.sph, p, _X, _Y, _Z, 3.4, 6, 3.4, C('#2b2b30'));
    this.spike(q1.set(p.x, p.y + 4, p.z), _Y, 2.6, 3, C('#4a4a52'));
  };
  PROJ_PAINT.grenade = function (p) { this.ball(this.sph, p, 2.6, C('#4a5240')); };
  PROJ_PAINT.atrifle = function (p, nx, ny, nz) { this.seg(this.gcyl, q1.set(p.x - nx * 40, p.y - ny * 40, p.z - nz * 40), p, 0.8, C('#fff3b0')); };
  PROJ_PAINT.firearrow = function (p, nx, ny, nz) {
    this.seg(this.cyl, q1.set(p.x - nx * 16, p.y - ny * 16, p.z - nz * 16), p, 0.6, C(PAL.wood));
    this.ball(this.gsph, p, 2.4 + Math.random(), C(Math.random() < 0.5 ? '#ffb347' : '#ffd166'));
  };
  PROJ_PAINT.flare = function (p) { this.ball(this.gsph, p, 3.4, C(p.color || '#5fbf5a')); };

  // ---------- ability effects ----------
  FX_PAINT.spin = function (fx) {
    for (const h of [0.6, 1.2]) this.axes(this.gtorus, q1.set(fx.x, fx.y + h * 10, fx.z), _X, _Y, _Z, fx.r * h, fx.r * h, fx.r * h, C('#e4e9f0'));
  };
  FX_PAINT.slash = function (fx) {
    const k = fx.life / fx.max, s = fx.r * (1.4 - k * 0.6);
    this.axes(this.gtorus, q1.set(fx.x, fx.y, fx.z), q2.set(fx.fz, 0, -fx.fx), q3.set(0.3, 1, 0).normalize(), q4.set(fx.fx, 0, fx.fz), s, s * 0.2, s, C('#ffffff'));
  };
  FX_PAINT.arc = function (fx) {
    const k = 1 - fx.life / fx.max, s = fx.r * (0.6 + k * 0.6);
    this.axes(this.gtorus, q1.set(fx.x + fx.fx * fx.r * 0.6, fx.y, fx.z + fx.fz * fx.r * 0.6), _X, _Y, _Z, s, s * 0.3, s, C(fx.color || '#ffffff'));
  };
  FX_PAINT.spike = function (fx) {
    const age = fx.max - fx.life, grow = Math.min(1, age / 0.12), fade = Math.min(1, fx.life / 0.4), h = fx.h * grow * fade;
    if (h < 1) return;
    const dir = q2.set(fx.tilt, 1, fx.tilt * 0.6).normalize();
    this.spike(q1.set(fx.x, fx.y - 4, fx.z), dir, 10 * fade, h, C(CRYSTAL));
    this.spike(q1.set(fx.x + 6, fx.y - 4, fx.z - 4), q3.set(-fx.tilt, 1, 0.3).normalize(), 5 * fade, h * 0.6, C('#e6f8ff'));
  };
  FX_PAINT.hammer = function (fx) {
    const u = fx.u;
    if (!u || !u.alive) return;
    const B = u.body.pts, S = u.S, h = B[J.RHAND];
    this.weaponFrame(h, B[J.RELB]);
    this.seg(this.cyl, this.at(q1, h, this.wd, -4 * S), this.at(q2, h, this.wd, 30 * S), 1.5 * S, C(CRYSTAL));
    this.axes(this.box, this.at(q1, h, this.wd, 32 * S), this.wx, this.wd, this.wz, 20 * S, 10 * S, 10 * S, C(CRYSTAL));
    this.ball(this.gsph, this.at(q1, h, this.wd, 32 * S), 3 * S, C('#ffffff'));
  };
  FX_PAINT.crossbow = function (fx) {
    const u = fx.u;
    if (!u || !u.alive) return;
    const S = u.S, ch = u.body.pts[J.CHEST], D = q1.set(fx.dx, 0, fx.dz), Rr = q2.set(-fx.dz, 0, fx.dx);
    const c = q3.set(ch.x + D.x * 18 * S, ch.y - 4 * S, ch.z + D.z * 18 * S), cr = C(CRYSTAL);
    this.seg(this.cyl, this.at(q4, c, D, -14 * S), this.at(q5, c, D, 18 * S), 2 * S, cr);
    const draw = Math.min(1, (fx.max - fx.life) / (fx.max * 0.6));
    for (const sd of [-1, 1]) {
      const tip = this.at(q4, c, D, 8 * S, Rr, sd * 24 * S);
      this.seg(this.cyl, this.at(q5, c, D, 14 * S), tip, 1.6 * S, cr);
      this.seg(this.cyl, tip, this.at(q6, c, D, (6 - draw * 14) * S), 0.3 * S, C('#ffffff'));
    }
    if (fx.life > fx.max * 0.28) this.seg(this.cyl, this.at(q4, c, D, (6 - draw * 14) * S), this.at(q5, c, D, 26 * S), 1.3 * S, C('#e6f8ff'));
  };
  FX_PAINT.bolt = function (fx) {
    const k = 1 - fx.life / fx.max, a = q1.set(fx.x + fx.dx * k * 800, fx.y, fx.z + fx.dz * k * 800);
    this.seg(this.gcyl, a, q2.set(a.x - fx.dx * 70, a.y, a.z - fx.dz * 70), 4, C('#e0f6ff'));
  };
  FX_PAINT.net = function (fx) {
    const T = fx.T;
    if (!T || !T.alive) return;
    const c = T.body.pts[J.CHEST], g = groundH(T.P.x, T.P.z);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU;
      this.seg(this.cyl, q1.set(T.P.x + Math.cos(a) * 50 * T.S * 0.5, g, T.P.z + Math.sin(a) * 50 * T.S * 0.5), c, 0.6, C('#d8d0b8'));
    }
  };

  // ---------- overlays: steam, crystal, gear, the Paths ----------
  OVERLAYS.push(function (u, f, up, r, S) {
    const B = u.body.pts, t = u.t;
    if (t.titan) {
      let n = 0;
      if (!u.alive) { const age = wtime() - (u._deadAt || 0); n = age < 9 ? (age < 3 ? 4 : 2) : 0; }
      else if (u.steamT > 0) n = 12;
      else if (u.hp < t.hp * 0.95 && t.regen) n = u.hp < t.hp * 0.5 ? 2 : 1;
      else if (t.colossal) n = 1;
      for (let i = 0; i < n; i++) {
        if (n < 3 && Math.random() < 0.5) continue;
        const j = B[(Math.random() * 11) | 0], k = Math.random();
        this.ball(this.puff, q1.set(j.x + (Math.random() - 0.5) * 12 * S, j.y + k * 18 * S, j.z + (Math.random() - 0.5) * 12 * S), (3 + k * 4) * S * (u.steamT > 0 ? 1.8 : 1), C('#f2f2f2'));
      }
    }
    if (u.alive && u.hard > 0 && !t.past) {
      // Crystal hardening: a shell over the whole body (Annie's cocoon is a solid block).
      const pe = B[J.PELVIS], top = Math.max(B[J.HEAD].y, B[J.CHEST].y) + 10 * S, g = groundH(pe.x, pe.z);
      if (u.crystalT > 0 && u.casting > 0) this.axes(this.ice, q1.set(pe.x, (top + g) / 2, pe.z), _X, _Y, _Z, 32 * S, top - g, 30 * S, C('#d6f2ff'));
      else this.axes(this.ice, q1.set((pe.x + B[J.HEAD].x) / 2, (pe.y + B[J.HEAD].y) / 2, (pe.z + B[J.HEAD].z) / 2), r, up, f, 22 * S, 44 * S, 18 * S, C('#d6f2ff'));
    }
    if (t.odm && u.alive && t.hat !== 'scout' && t.hat !== 'eren') {
      const pe = B[J.PELVIS];
      for (const sd of [-1, 1]) this.seg(this.cyl, this.at(q1, pe, r, sd * 9 * S, f, -5 * S), this.at(q2, pe, r, sd * 9 * S, f, 4 * S), 2.1 * S, C('#9aa3ad'));
    }
    if (t.past && u.alive && Math.random() < 0.6) {
      const j = B[(Math.random() * 11) | 0];
      this.ball(this.gsph, q1.set(j.x + (Math.random() - 0.5) * 20 * S, j.y + Math.random() * 10 * S, j.z + (Math.random() - 0.5) * 20 * S), 0.8 * S, C('#dfe8ff'));
    }
  });
  // Dead Titans steam away to nothing.
  const baseUnit = Painter.prototype.unit;
  Painter.prototype.unit = function (u) {
    if (u.t.titan && !u.alive && !u.vanished) {
      if (u._deadAt == null) u._deadAt = wtime();
      if (wtime() - u._deadAt > 9) return;
    } else if (u.alive && u._deadAt != null) u._deadAt = null;
    baseUnit.call(this, u);
  };
})();
