'use strict';
// How the Showa Ultras and Seven's Capsule Monsters look: red-and-silver bodies, crests and horns, glowing eyes,
// the Color Timer, and their techniques' projectiles and effects. Visual only.

(() => {
  const SCHEMES = {
    // base: main body colour; alt: the pattern colour; face: head and hands; trim: gold lines.
    seven: { base: '#c8222b', alt: '#b9c0ca', face: '#c9ced6', trim: '#e2b84f', helm: '#c8222b' },
    jack: { base: '#c9ced6', alt: '#cf2626', face: '#d2d6dc', trim: null, helm: null, double: true },
    ace: { base: '#c9ced6', alt: '#cc2a2a', face: '#d2d6dc', trim: '#e8b94a', helm: null },
    taro: { base: '#c8222b', alt: '#c3c9d2', face: '#d2d6dc', trim: '#e8b94a', helm: '#c8222b' },
    leo: { base: '#c41f26', alt: '#aab2bc', face: '#c9ced6', trim: null, helm: '#c41f26' },
  };
  const EYE = '#fff4b8';
  const now = () => performance.now() / 1000;
  const wtime = () => (typeof W !== 'undefined' ? W.time : 0);

  // A limb segment with a stripe of the pattern colour down its outer side (two for Jack).
  function limb(P, a, b, rad, side, r, base, sch, col) {
    P.seg(P.cyl, a, b, rad, base);
    const off = side * rad * 0.42;
    P.seg(P.cyl, P.at(P.t4, a, r, off), P.at(P.t5, b, r, off), rad * 0.72, col(sch.alt));
    if (sch.double) P.seg(P.cyl, P.at(P.t4, a, r, side * rad * 0.95), P.at(P.t5, b, r, side * rad * 0.95), rad * 0.18, col(sch.alt));
    if (sch.trim) P.seg(P.cyl, P.at(P.t4, a, r, side * rad * 0.86), P.at(P.t5, b, r, side * rad * 0.86), rad * 0.22, col(sch.trim));
  }

  BODIES.ultra = function (u, f, up, r, S, team, col) {
    const B = u.body.pts, pe = B[J.PELVIS], ch = B[J.CHEST], hd = B[J.HEAD], t = u.t, sch = SCHEMES[t.scheme] || SCHEMES.jack;
    const base = col(sch.base), alt = col(sch.alt), face = col(sch.face);
    // Torso, with the pattern down the sides.
    this.seg(this.cyl, pe, ch, 6.4 * S, base);
    this.ball(this.sph, ch, 6.7 * S, base);
    this.ball(this.sph, pe, 6.1 * S, base);
    for (const sd of [-1, 1]) {
      this.seg(this.cyl, this.at(this.t1, pe, r, sd * 3.4 * S, up, 1 * S), this.at(this.t2, ch, r, sd * 3.6 * S), 4.3 * S, alt);
      if (sch.double) this.seg(this.cyl, this.at(this.t1, pe, r, sd * 1.6 * S, f, 4.4 * S, up, 2 * S), this.at(this.t2, ch, r, sd * 1.6 * S, f, 4.8 * S, up, -3 * S), 1.2 * S, alt);
      if (sch.trim && t.scheme === 'ace') this.seg(this.cyl, this.at(this.t1, pe, r, sd * 2.1 * S, f, 4.6 * S, up, 2 * S), this.at(this.t2, ch, r, sd * 2.4 * S, f, 4.9 * S, up, -2 * S), 0.8 * S, col(sch.trim));
    }
    // Chest protectors: Seven's ribbed silver armour, Taro's with the Ultra Stars, Leo's silver chevron.
    if (t.scheme === 'seven' || t.scheme === 'taro') {
      this.axes(this.box, this.at(this.t1, ch, f, 3.6 * S, up, -0.5 * S), r, up, f, 15 * S, 9 * S, 7 * S, alt);
      for (const sd of [-1, 1]) this.axes(this.sph, this.at(this.t1, ch, r, sd * 7 * S, up, 1 * S), r, up, f, 4.4 * S, 2.6 * S, 4.4 * S, alt);
      if (t.scheme === 'seven') {
        for (const o of [-5.4, -3.2, 3.2, 5.4]) this.axes(this.box, this.at(this.t1, ch, f, 7.15 * S, up, -0.5 * S, r, o * S), r, up, f, 0.5 * S, 8 * S, 0.3 * S, col(sch.trim));
      } else {
        for (const o of [-5, -2.6, 2.6, 5]) this.ball(this.gsph, this.at(this.t1, ch, f, 7.3 * S, up, 2.4 * S, r, o * S), 0.7 * S, C(sch.trim));
      }
    } else if (t.scheme === 'leo') {
      for (const sd of [-1, 1]) {
        const a = this.at(this.t1, ch, f, 5.6 * S, up, 3 * S, r, sd * 5 * S), b = this.at(this.t2, ch, f, 6.2 * S, up, -4 * S, r, sd * 0.6 * S);
        this.seg(this.cyl, a, b, 2 * S, alt);
      }
    }
    // A belt in team colours, so the sides can be told apart.
    this.axes(this.torus, this.at(this.t1, pe, up, 2.6 * S), r, up, f, 6.3 * S, 6.3 * S, 6.3 * S, col(team.main));

    // Legs and arms.
    for (const sd of [-1, 1]) {
      const kn = B[sd < 0 ? J.LKNEE : J.RKNEE], ft = B[sd < 0 ? J.LFOOT : J.RFOOT];
      const hip = this.at(this.t3, pe, r, sd * 3.6 * S, up, -1.5 * S);
      limb(this, hip, kn, 3.4 * S, sd, r, base, sch, col);
      this.ball(this.sph, kn, 3.4 * S, base);
      limb(this, kn, ft, 3.2 * S, sd, r, base, sch, col);
      this.axes(this.sph, this.at(this.t3, ft, f, 1.2 * S), r, up, f, 3.6 * S, 3.2 * S, 4.6 * S, alt);
      const el = B[sd < 0 ? J.LELB : J.RELB], hn = B[sd < 0 ? J.LHAND : J.RHAND];
      const sh = this.at(this.t3, ch, r, sd * 6.4 * S, up, -2.2 * S);
      this.ball(this.sph, sh, 3.4 * S, base);
      limb(this, sh, el, 3.0 * S, sd, r, base, sch, col);
      this.ball(this.sph, el, 2.9 * S, base);
      limb(this, el, hn, 2.7 * S, sd, r, base, sch, col);
      this.ball(this.sph, hn, 3.1 * S, face);
      // Team-coloured cuff on the upper arm.
      this.axes(this.torus, this.at(this.t1, sh, up, -2.5 * S), r, up, f, 3.2 * S, 3.2 * S, 3.2 * S, col(team.light));
    }
    // Jack's Ultra Bracelet on the left wrist (gone while it's flying as the Ultra Spark).
    if (t.scheme === 'jack' && !u.braceletOut) {
      const el = B[J.LELB], hn = B[J.LHAND];
      const w = this.t1.set(hn.x + (el.x - hn.x) * 0.3, hn.y + (el.y - hn.y) * 0.3, hn.z + (el.z - hn.z) * 0.3);
      this.weaponFrame(hn, el);
      this.axes(this.torus, w, this.wx, this.wd, this.wz, 3.1 * S, 3.1 * S, 3.1 * S, C('#f4d36a'));
      this.ball(this.gsph, this.at(this.t2, w, this.wz, 3 * S), 0.8 * S, C('#ffe9a0'));
    }
    // Ultra Defender: the bracelet as a round shield.
    if (u.shieldUntil > wtime() && u.alive) {
      const h = B[J.LHAND];
      this.seg(this.cyl, this.at(this.t1, h, f, 1.5 * S), this.at(this.t2, h, f, 2.6 * S), 11 * S, C('#d9dee6'));
      this.ball(this.gsph, this.at(this.t1, h, f, 3 * S), 2.2 * S, C('#9fe8ff'));
    }
    // Leo's Ultra Mant, spread wide.
    if (u.mantUntil > wtime() && u.alive) {
      const red = C('#d0201f'), flap = Math.sin(now() * 9) * 2 * S;
      for (const sd of [-1, 0, 1]) {
        const top = this.at(this.t1, ch, r, sd * 6 * S, f, -4 * S, up, 3 * S);
        const bot = this.at(this.t2, pe, r, sd * 16 * S, f, -8 * S + flap, up, -16 * S);
        this.seg(this.cyl, top, bot, 5 * S, red);
      }
      this.axes(this.box, this.at(this.t1, ch, f, -4.5 * S, up, 2 * S), r, up, f, 16 * S, 3 * S, 3 * S, C('#f2d36a'));
    }

    // The head: silver face, glowing eyes, and each one's crest.
    this.axes(this.sph, hd, r, up, f, 7 * S, 8.2 * S, 7.4 * S, face);
    if (sch.helm) {
      // A helmet over the back and top of the head, leaving the silver face showing.
      this.axes(this.dome, this.at(this.t1, hd, up, 0.4 * S, f, -2.8 * S), r, up, f, 7.3 * S, 8.4 * S, 6.4 * S, col(sch.helm));
      this.axes(this.sph, this.at(this.t1, hd, f, -2.4 * S, up, -0.6 * S), r, up, f, 7.1 * S, 7 * S, 5.8 * S, col(sch.helm));
    }
    for (const sd of [-1, 1]) {
      this.axes(this.gsph, this.at(this.t1, hd, f, 6 * S, up, 1.4 * S, r, sd * 2.9 * S), r, up, f, 2.5 * S, 1.75 * S, 1.3 * S, C(u.alive ? EYE : '#6a6a5a'));
    }
    this.axes(this.box, this.at(this.t1, hd, f, 7.2 * S, up, -3.4 * S), r, up, f, 2.6 * S, 0.5 * S, 0.5 * S, C('#8a8f98'));
    const silver = col('#d9dee6');
    switch (t.scheme) {
      case 'seven':
        // The Eye Slugger: a blade along the top of the head (it's away while thrown), and the Beam Lamp.
        if (!u.sluggerOut) {
          this.axes(this.box, this.at(this.t1, hd, up, 8 * S, f, 0.5 * S), r, up, f, 1.4 * S, 3.6 * S, 12.5 * S, silver);
          this.axes(this.box, this.at(this.t1, hd, up, 9.6 * S, f, 1 * S), r, up, f, 0.8 * S, 1 * S, 10 * S, C('#ffffff'));
        }
        this.ball(this.gsph, this.at(this.t1, hd, f, 6.4 * S, up, 4.6 * S), 1.3 * S, C('#5fff8a'));
        for (const sd of [-1, 1]) this.axes(this.box, this.at(this.t1, hd, r, sd * 6.8 * S, up, 1.5 * S), r, up, f, 1.4 * S, 5 * S, 3 * S, silver);
        break;
      case 'jack':
        this.axes(this.box, this.at(this.t1, hd, up, 7.4 * S, f, -0.5 * S), r, up, f, 1.2 * S, 3.4 * S, 13 * S, silver);
        break;
      case 'ace': {
        // Ace's crest with the opening in it, the Water Lamp, and gold trim.
        this.axes(this.box, this.at(this.t1, hd, up, 7 * S, f, -0.5 * S), r, up, f, 1.4 * S, 3 * S, 12 * S, silver);
        const ring = this.at(this.t1, hd, up, 10.5 * S, f, 1 * S), down = this.t2.copy(up).negate();
        this.axes(this.torus, ring, f, r, down, 3.4 * S, 3.4 * S, 3.4 * S, col(sch.trim));
        this.ball(this.gsph, this.at(this.t1, hd, f, 6.5 * S, up, 4.4 * S), 1.2 * S, C('#ffe36a'));
        break;
      }
      case 'taro':
        // The Ultra Horns: two great horns sweeping out and up.
        for (const sd of [-1, 1]) {
          const a = this.at(this.t1, hd, up, 5 * S, r, sd * 4.2 * S);
          const b = this.at(this.t2, hd, up, 10 * S, r, sd * 8.5 * S);
          this.seg(this.cyl, a, b, 1.7 * S, silver);
          this.ball(this.sph, b, 1.7 * S, silver);
          this.spike(b, this.at(this.t3, up, r, sd * 0.15, f, 0.1), 1.6 * S, 7.5 * S, silver);
        }
        this.ball(this.gsph, this.at(this.t1, hd, f, 6.6 * S, up, 4.2 * S), 1 * S, C('#ffd166'));
        break;
      case 'leo':
        // A crest like a lion's mane: a row of points over the top of the head, and flared sides.
        for (let k = 0; k < 5; k++) {
          const a = (k - 2) * 0.45;
          const p = this.at(this.t1, hd, up, 7.2 * S * Math.cos(a), f, 7.2 * S * Math.sin(a) * 0.9 - 1 * S);
          this.spike(p, this.at(this.t2, up, up, Math.cos(a) - 1, f, Math.sin(a)), 1.5 * S, 4.5 * S, silver);
        }
        for (const sd of [-1, 1]) {
          const dir = this.t2.set(r.x * sd + up.x * 0.8 - f.x * 0.3, r.y * sd + up.y * 0.8 - f.y * 0.3, r.z * sd + up.z * 0.8 - f.z * 0.3);
          this.spike(this.at(this.t1, hd, r, sd * 6.6 * S, up, 2 * S), dir, 1.4 * S, 4 * S, silver);
        }
        break;
    }

    // Ultra Dynamite: on fire; afterwards, reforming in a glow.
    if (u.dynamiteUntil > wtime()) for (let i = 0; i < 6; i++) {
      this.ball(this.gsph, this.at(this.t1, ch, r, (Math.random() - 0.5) * 22 * S, up, (Math.random() - 0.4) * 30 * S, f, (Math.random() - 0.5) * 14 * S), (3 + Math.random() * 4) * S, C(Math.random() < 0.5 ? '#ffd166' : '#ff6a2a'));
    }
    if (u.reformUntil > wtime() && u.alive) this.ball(this.flash, ch, (16 + Math.sin(now() * 20) * 3) * S, C('#fff2c4'));
  };

  // The Color Timer: blue, then flashing red when the Ultra is nearly done.
  OVERLAYS.push(function (u, f, up, r, S) {
    if (!u.t.ultra) return;
    const ch = u.body.pts[J.CHEST], orig = u.key === 'ultraman';
    const low = u.hp < u.t.hp * 0.3, blink = Math.floor(now() * 5) % 2 === 0;
    const hex = !u.alive ? '#33424a' : low ? (blink ? '#ff3030' : '#5a1414') : '#4fd8ff';
    const fwd = orig ? 7.4 : u.t.scheme === 'seven' || u.t.scheme === 'taro' ? 7.4 : 6.8;
    const p = this.at(this.t1, ch, f, fwd * S, up, (orig ? -3 : -1.2) * S);
    this.ball(this.gsph, p, (orig ? 2.5 : 2) * S, C(hex));
    this.axes(this.torus, this.at(this.t2, p, f, -0.4 * S), r, f, up, 2.3 * S, 2.3 * S, 2.3 * S, C('#9aa3ad'));
    if (u.alive && low && blink) this.ball(this.flash, p, 6 * S, C('#ff3030'));
  });

  // ---------- Seven's Capsule Monsters ----------
  Object.assign(SKIN_OF, { miclas: '#b85a35', agira: '#5f7a8a' });
  Object.assign(LOOK, {
    windom: { torso: '#9aa3ad', limbs: '#5a6a8a', legs: '#9aa3ad', hands: '#5a6a8a', boot: '#3a4a6a', head: '#9aa3ad', belt: 'main', noEyes: true },
    miclas: { torso: 'skin', limbs: 'skin', legs: 'skin', hands: 'skin', boot: '#6a3a22', belt: 'main', noEyes: true },
    agira: { torso: 'skin', limbs: 'skin', legs: 'skin', hands: '#3e5562', boot: '#3e5562', belt: 'main', noEyes: true },
  });
  HATS.windom = function (u, H, f, up, r, S, team, col) {
    // A robot head: a big beam lamp for a face, a ridge on top and two antennae.
    this.ball(this.gsph, this.at(this.t1, H, f, 6.4 * S, up, 0.5 * S), 3.4 * S, C(u.alive ? '#ffd84a' : '#5a5a4a'));
    this.axes(this.torus, this.at(this.t1, H, f, 6 * S, up, 0.5 * S), r, f, up, 4 * S, 4 * S, 4 * S, col('#3a4a6a'));
    this.axes(this.box, this.at(this.t1, H, up, 7 * S), r, up, f, 1.6 * S, 4 * S, 12 * S, col('#5a6a8a'));
    for (const sd of [-1, 1]) {
      const b = this.at(this.t1, H, up, 6 * S, r, sd * 5 * S), tp = this.at(this.t2, H, up, 13 * S, r, sd * 8 * S);
      this.seg(this.cyl, b, tp, 0.5 * S, col('#3a4a6a'));
      this.ball(this.gsph, tp, 1 * S, C('#ff5f5f'));
    }
  };
  HATS.miclas = function (u, H, f, up, r, S, team, col) {
    // A friendly red bull: white horns, a pale snout and big round eyes.
    for (const sd of [-1, 1]) {
      const a = this.at(this.t1, H, up, 4 * S, r, sd * 6 * S), b = this.at(this.t2, H, up, 8 * S, r, sd * 11 * S);
      this.seg(this.cyl, a, b, 1.6 * S, C('#f4efe4'));
      this.spike(b, this.at(this.t3, up, r, sd * 0.3, f, 0.3), 1.6 * S, 5 * S, C('#f4efe4'));
      const e = this.at(this.t1, H, f, 5.6 * S, up, 2.4 * S, r, sd * 3.6 * S);
      this.ball(this.sph, e, 2.6 * S, C('#ffffff'));
      if (u.alive) this.ball(this.sph, this.at(this.t2, e, f, 2.1 * S), 1.1 * S, C(PAL.ink));
    }
    this.axes(this.sph, this.at(this.t1, H, f, 6.6 * S, up, -3 * S), r, up, f, 5 * S, 3.6 * S, 3.4 * S, col('#e8a07a'));
    for (const sd of [-1, 1]) this.ball(this.sph, this.at(this.t1, H, f, 9.6 * S, up, -2.8 * S, r, sd * 1.6 * S), 0.8 * S, C('#5a2a1a'));
  };
  HATS.agira = function (u, H, f, up, r, S, team, col) {
    // A horned charger: a long nose horn, a bony frill behind the head and a row of back plates.
    this.spike(this.at(this.t1, H, f, 6 * S, up, -1 * S), this.at(this.t2, f, up, 0.35), 2.4 * S, 10 * S, C('#e8e0c8'));
    this.axes(this.dome, this.at(this.t1, H, f, -3 * S, up, 3 * S), r, f, this.t2.copy(up).negate(), 9 * S, 4 * S, 9 * S, col('#3e5562'));
    for (const sd of [-1, 1]) this.ball(this.gsph, this.at(this.t1, H, f, 6 * S, up, 2 * S, r, sd * 3.2 * S), 1.1 * S, C('#ffcf5a'));
    const ch = u.body.pts[J.CHEST], pe = u.body.pts[J.PELVIS];
    for (let k = 0; k < 4; k++) {
      const p = this.t1.set(ch.x + (pe.x - ch.x) * k / 3, ch.y + (pe.y - ch.y) * k / 3, ch.z + (pe.z - ch.z) * k / 3);
      this.spike(this.at(this.t3, p, f, -6.5 * S), this.at(this.t2, f, f, -2, up, 1), 2 * S, 5 * S, col('#3e5562'));
    }
  };

  // ---------- projectiles ----------
  PROJ_PAINT.slugger = function (p, nx, ny, nz) {
    const a = now() * 32, h = this.t4.set(-nz, 0, nx);
    if (h.lengthSq() < 1e-4) h.set(1, 0, 0);
    h.normalize();
    // Spinning end over end, in the upright plane across its flight.
    const d = this.t3.set(h.x * Math.cos(a), Math.sin(a), h.z * Math.cos(a)).normalize();
    this.seg(this.cyl, this.t1.set(p.x - d.x * 9, p.y - d.y * 9, p.z - d.z * 9), this.t2.set(p.x + d.x * 9, p.y + d.y * 9, p.z + d.z * 9), 1.6, C('#e6edf5'));
    this.ball(this.gsph, p, 3, C('#ffffff'));
    this.ball(this.gsph, this.t1.set(p.x - nx * 10, p.y - ny * 10, p.z - nz * 10), 1.6, C('#c9f6ff'));
  };
  PROJ_PAINT.spark = function (p) {
    const a = now() * 25;
    this.axes(this.gtorus, p, _X, _Y, _Z, 7, 7, 7, C('#ffe066'));
    for (let k = 0; k < 6; k++) {
      const b = a + k * TAU / 6;
      this.ball(this.gsph, this.t1.set(p.x + Math.cos(b) * 9, p.y, p.z + Math.sin(b) * 9), 1.6, C('#fff6c2'));
    }
    this.ball(this.gsph, p, 2.4, C('#ffffff'));
  };
  PROJ_PAINT.lance = function (p, nx, ny, nz) {
    this.seg(this.cyl, this.t1.set(p.x - nx * 34, p.y - ny * 34, p.z - nz * 34), p, 1.2, C('#d9dee6'));
    this.spike(p, this.t2.set(nx, ny, nz), 2.4, 8, C('#f4d36a'));
    this.ball(this.gsph, this.t1.set(p.x - nx * 34, p.y - ny * 34, p.z - nz * 34), 1.6, C('#ffe9a0'));
  };
  PROJ_PAINT.vblade = function (p) {
    this.seg(this.gcyl, this.t1.set(p.x, p.y - 26, p.z), this.t2.set(p.x, p.y + 26, p.z), 2.6, C('#ffe066'));
    this.seg(this.gcyl, this.t1.set(p.x, p.y - 20, p.z), this.t2.set(p.x, p.y + 20, p.z), 1.1, C('#ffffff'));
  };
  PROJ_PAINT.gring = function (p) {
    const a = now() * 20;
    this.axes(this.gtorus, p, this.t1.set(Math.cos(a), 0, Math.sin(a)), _Y, this.t2.set(-Math.sin(a), 0, Math.cos(a)), 9, 9, 9, C('#ffd166'));
    this.ball(this.gsph, p, 1.8, C('#ffffff'));
  };

  // ---------- technique effects ----------
  FX_PAINT.barrier = function (fx) {
    const k = Math.min(1, fx.life / 0.4, (fx.max - fx.life) / 0.25 + 0.2);
    this.ball(this.flash, this.t1.set(fx.x, fx.y, fx.z), fx.R * k, C('#7fd6ff'));
    this.axes(this.gtorus, this.t1.set(fx.x, fx.y + 2, fx.z), _X, _Y, _Z, fx.R * k, fx.R * k * 0.3, fx.R * k, C('#c9f1ff'));
  };
  FX_PAINT.nenriki = function (fx) {
    const e = fx.e;
    for (const j of [J.HEAD, J.CHEST, J.PELVIS]) {
      const q = e.body.pts[j];
      this.ball(this.puff, q, (9 + Math.sin(now() * 18 + j) * 2) * e.S, C('#c9a0ff'));
    }
    const c = e.body.pts[J.CHEST];
    for (let i = 0; i < 3; i++) {
      const a = now() * 6 + i * 2.1;
      this.ball(this.gsph, this.t1.set(c.x + Math.cos(a) * 16 * e.S, c.y + Math.sin(a * 1.3) * 10 * e.S, c.z + Math.sin(a) * 16 * e.S), 1.4 * e.S, C('#e3c2ff'));
    }
  };
  FX_PAINT.kickfire = function (fx) {
    const u = fx.u;
    if (!u.alive) return;
    const ft = u.body.pts[J.RFOOT], S = u.S;
    for (let i = 0; i < 4; i++) {
      this.ball(this.gsph, this.t1.set(ft.x + (Math.random() - 0.5) * 8 * S, ft.y + (Math.random() - 0.3) * 8 * S, ft.z + (Math.random() - 0.5) * 8 * S), (2 + Math.random() * 3) * S, C(i % 2 ? fx.color : '#fff2b0'));
    }
  };
  FX_PAINT.dynamite = function (fx) {
    const u = fx.u, c = u.body.pts[J.CHEST], S = u.S;
    this.ball(this.flash, c, (18 + Math.random() * 6) * S, C('#ff8a3a'));
  };
})();
