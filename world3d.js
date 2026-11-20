'use strict';
// Per-map scenery: lights, sky, ground, the field's surface, props, distant hills, clouds and weather.
// Visual only. World.build() returns an object with update(clock) for anything that moves, and dispose().

const World = (() => {
  const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const lambert = color => new THREE.MeshLambertMaterial({ color });
  const coneGeo = () => { const g = new THREE.ConeGeometry(1, 1, 8); g.translate(0, 0.5, 0); return g; };
  const place = (mesh, i, x, y, z, sx, sy, sz, rotY = 0) => {
    tmpQ.setFromAxisAngle(UP, rotY);
    mesh.setMatrixAt(i, tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz)));
  };
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const canvas = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return new THREE.CanvasTexture(c); };

  function build(scene, id) {
    const map = MAPS[id] || MAPS.meadow, L = map.look, g = new THREE.Group(), tick = [], rnd = rng(7);
    lights(g, L);
    sky(g, L);
    ground(g, L, map.env, rnd);
    scenery(g, L, rnd, tick, map.env);
    hills(g, L, rnd);
    clouds(g, L, rnd, tick);
    weather(g, L, rnd, tick);
    scene.add(g);
    scene.background = new THREE.Color(L.horizon);
    scene.fog = new THREE.Fog(L.horizon, L.fog[0], L.fog[1]);
    return {
      update: (clock, cam) => { for (const f of tick) f(clock, cam); },
      dispose() {
        scene.remove(g);
        g.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); m.dispose(); }
        });
      },
    };
  }

  function lights(g, L) {
    g.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
    const sun = new THREE.DirectionalLight(L.sun[0], L.sun[1]);
    if (L.sunPos) sun.position.set(L.sunPos[0], L.sunPos[1], FIELD_Z / 2 + L.sunPos[2]);
    else sun.position.set(-700, 1500, FIELD_Z / 2 + 900);
    sun.target.position.set(0, 0, FIELD_Z / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -1050; sc.right = 1050; sc.top = 850; sc.bottom = -850; sc.near = 300; sc.far = 4200;
    sun.shadow.bias = -0.0006;
    g.add(sun, sun.target);
  }

  function sky(g, L) {
    const geo = new THREE.SphereGeometry(9000, 24, 14), pos = geo.attributes.position, cols = [];
    const top = new THREE.Color(L.skyTop), low = new THREE.Color(L.horizon);
    for (let i = 0; i < pos.count; i++) {
      const c = low.clone().lerp(top, clamp(pos.getY(i) / 9000 * 1.8, 0, 1));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  }

  // Hardwood planks with court markings, mapped onto the field plane (FIELD_X * 2 + 180 by FIELD_Z + 180).
  function courtTexture(L) {
    const PW = FIELD_X * 2 + 180, PH = FIELD_Z + 180;
    return canvas(1024, Math.round(1024 * PH / PW), (x, w, h) => {
      const k = w / PW, X = v => (v + PW / 2) * k, Z = v => (v + 90) * k;
      const r = rng(9);
      for (let row = 0; row * 10 * k < h; row++) {
        x.fillStyle = L.stripes[row % 2]; x.fillRect(0, row * 10 * k, w, 10 * k + 1);
        x.fillStyle = 'rgba(90,50,20,0.25)';
        for (let j = 0; j < 4; j++) x.fillRect(r() * w, row * 10 * k, 1, 10 * k);
      }
      const keyW = 190, keyH = 160, cz = FIELD_Z / 2;
      x.fillStyle = 'rgba(217,72,59,0.35)'; x.fillRect(X(-FIELD_X), Z(cz - keyH / 2), keyW * k, keyH * k);
      x.fillStyle = 'rgba(58,111,217,0.35)'; x.fillRect(X(FIELD_X - keyW), Z(cz - keyH / 2), keyW * k, keyH * k);
      x.strokeStyle = '#ffffff'; x.lineWidth = 3;
      x.strokeRect(X(-FIELD_X), Z(0), FIELD_X * 2 * k, FIELD_Z * k);
      x.beginPath(); x.moveTo(X(0), Z(0)); x.lineTo(X(0), Z(FIELD_Z)); x.stroke();
      x.beginPath(); x.arc(X(0), Z(cz), 60 * k, 0, TAU); x.stroke();
      x.fillStyle = '#e2711d'; x.beginPath(); x.arc(X(0), Z(cz), 26 * k, 0, TAU); x.fill();
      x.strokeStyle = PAL.ink; x.lineWidth = 1.5;
      x.beginPath(); x.arc(X(0), Z(cz), 26 * k, 0, TAU); x.moveTo(X(-26), Z(cz)); x.lineTo(X(26), Z(cz)); x.moveTo(X(0), Z(cz - 26)); x.lineTo(X(0), Z(cz + 26)); x.stroke();
      x.strokeStyle = '#ffffff'; x.lineWidth = 3;
      for (const sd of [-1, 1]) {
        const base = sd * FIELD_X, ft = sd * (FIELD_X - keyW);
        x.strokeRect(Math.min(X(base), X(ft)), Z(cz - keyH / 2), keyW * k, keyH * k);
        x.beginPath(); x.arc(X(ft), Z(cz), 60 * k, 0, TAU); x.stroke();
        // Three-point line: straight from the baseline, then an arc around the basket.
        const hoop = sd * (FIELD_X - 20), R3 = 240, side = 220, a = Math.asin(side / R3);
        x.beginPath();
        x.moveTo(X(base), Z(cz - side)); x.lineTo(X(hoop - sd * R3 * Math.cos(a)), Z(cz - side));
        if (sd < 0) x.arc(X(hoop), Z(cz), R3 * k, -a, a); else x.arc(X(hoop), Z(cz), R3 * k, PI + a, PI - a, true);
        x.lineTo(X(base), Z(cz + side));
        x.stroke();
      }
    });
  }

  // Inside the arena: hoops, bleachers full of a bouncing crowd, a jumbotron and the lights.
  // A crowd of little people on a list of seats [x, y, z], bobbing up and down.
  function crowdOf(g, seatsXYZ, rnd, tick) {
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert('#ffffff'), seatsXYZ.length);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), lambert('#ffffff'), seatsXYZ.length);
    const shirts = ['#d9483b', '#3a6fd9', '#f4b62e', '#ffffff', '#2a2433', '#7be0b8'].map(c => new THREE.Color(c));
    const skins = ['#f3c9a1', '#d9a57a', '#a8714a', '#6b4229'].map(c => new THREE.Color(c));
    seatsXYZ.forEach((c, i) => { bodies.setColorAt(i, shirts[i % shirts.length]); heads.setColorAt(i, skins[(i * 7) % skins.length]); });
    g.add(bodies, heads);
    tick.push(clock => {
      seatsXYZ.forEach(([x, y, z], i) => {
        const hop = Math.max(0, Math.sin(clock * 6 + i * 1.7)) * 5;
        place(bodies, i, x, y + 12 + hop, z, 12, 22, 9);
        place(heads, i, x, y + 29 + hop, z, 6.5, 7, 6.5);
      });
      bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    });
  }

  // Epic Arena: an oval stone wall with arches, tiers of cheering crowd, banners and torches.
  function colosseum(g, rnd, tick) {
    const cz = FIELD_Z / 2, rx = FIELD_X + 190, rz = FIELD_Z / 2 + 220, n = 72;
    const stone = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert('#b59a72'), n * 6);
    const arch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert('#4a3a2a'), n);
    const seats = [];
    let k = 0;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, ca = Math.cos(a), sa = Math.sin(a), seg = TAU * Math.max(rx, rz) / n * 1.05;
      const rot = -Math.atan2(sa * rx, ca * rz);
      // The side nearest the camera is a low parapet, so the wall never hides the fight.
      if (sa > 0.25) { place(stone, k++, ca * rx, 15, cz + sa * rz, seg, 30, 24, rot); place(arch, i, 0, -100, 0, 0.01, 0.01, 0.01); continue; }
      place(stone, k++, ca * rx, 60, cz + sa * rz, seg, 120, 24, rot);
      place(arch, i, ca * (rx - 13), 45, cz + sa * (rz - 13), seg * 0.45, 70, 4, rot);
      for (let t = 1; t <= 5; t++) {
        const f = 1 + t * 0.07;
        place(stone, k++, ca * rx * f, 110 + t * 34, cz + sa * rz * f, seg * f, 34, 40, rot);
        if (i % 2 === 0) seats.push([ca * rx * f, 112 + t * 34, cz + sa * rz * f]);
      }
    }
    stone.count = k;
    g.add(stone, arch);
    crowdOf(g, seats, rnd, tick);
    // Banners in both team colours, and torches.
    const banner = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert('#ffffff'), 16);
    const flame = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffb347' }), 16);
    for (let i = 0; i < 16; i++) {
      const a = (i + 0.5) / 16 * TAU, ca = Math.cos(a), sa = Math.sin(a), rot = -Math.atan2(sa * rx, ca * rz);
      const front = sa > 0.25;
      place(banner, i, ca * (rx - 14), front ? -200 : 80, cz + sa * (rz - 14), 34, 70, 2, rot);
      banner.setColorAt(i, new THREE.Color(ca < 0 ? '#d9483b' : '#3a6fd9'));
      place(flame, i, ca * (rx - 16), front ? 40 : 130, cz + sa * (rz - 16), 8, 12, 8);
    }
    g.add(banner, flame);
    tick.push(clock => {
      for (let i = 0; i < 16; i++) {
        const a = (i + 0.5) / 16 * TAU, s = 1 + Math.sin(clock * 9 + i) * 0.2;
        place(flame, i, Math.cos(a) * (rx - 16), Math.sin(a) > 0.25 ? 40 : 130, cz + Math.sin(a) * (rz - 16), 8 * s, 12 * s, 8 * s);
      }
      flame.instanceMatrix.needsUpdate = true;
    });
  }

  // Tech Office: rows of desks with monitors and chairs, plants, a glass-walled meeting room and big windows.
  function office(g, rnd, tick) {
    const desks = [];
    for (let x = -1300; x <= 1300; x += 170) for (const z of [-420, -260, FIELD_Z + 260, FIELD_Z + 420]) desks.push([x, z]);
    for (const sd of [-1, 1]) for (let z = -100; z <= FIELD_Z + 100; z += 150) desks.push([sd * (FIELD_X + 300), z], [sd * (FIELD_X + 480), z]);
    const n = desks.length, mk = (geo, color, count) => { const m = new THREE.InstancedMesh(geo, lambert(color), count); m.castShadow = true; g.add(m); return m; };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const top = mk(box, '#e6e1d6', n), legs = mk(box, '#5d6470', n * 2), mon = mk(box, '#1f2330', n), chair = mk(box, '#2f3a55', n), back = mk(box, '#2f3a55', n);
    const screen = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#7fd6ff' }), n);
    g.add(screen);
    desks.forEach(([x, z], i) => {
      place(top, i, x, 44, z, 120, 4, 60);
      place(legs, i * 2, x - 54, 21, z, 4, 42, 54); place(legs, i * 2 + 1, x + 54, 21, z, 4, 42, 54);
      const facing = z < FIELD_Z / 2 ? 1 : -1;
      place(mon, i, x, 70, z - facing * 14, 50, 32, 3);
      tmpQ.setFromAxisAngle(UP, facing > 0 ? 0 : PI);
      screen.setMatrixAt(i, tmpM.compose(tmpP.set(x, 70, z - facing * 12), tmpQ, tmpS.set(44, 26, 1)));
      place(chair, i, x, 26, z + facing * 40, 34, 6, 34);
      place(back, i, x, 46, z + facing * 56, 34, 40, 5);
    });
    const pots = mk(new THREE.CylinderGeometry(1, 0.8, 1, 10), '#c9b8a0', 14), leaves = mk(new THREE.SphereGeometry(1, 10, 8), '#4f9a3a', 14);
    for (let i = 0; i < 14; i++) {
      const x = -1250 + i * 190, z = i % 2 ? -560 : FIELD_Z + 560;
      place(pots, i, x, 14, z, 14, 28, 14); place(leaves, i, x, 50, z, 22, 30, 22);
    }
    // Walls with a strip of windows, a meeting room, and ceiling lights.
    const wallMat = lambert('#f1f3f6');
    for (const [x, z, sx, sz] of [[0, -760, 3400, 20], [-1700, FIELD_Z / 2, 20, 2100], [1700, FIELD_Z / 2, 20, 2100]]) {
      const wall = new THREE.Mesh(box, wallMat); wall.position.set(x, 160, z); wall.scale.set(sx, 320, sz); g.add(wall);
    }
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(3200, 160), new THREE.MeshBasicMaterial({ map: canvas(512, 64, (c, w, h) => {
      c.fillStyle = '#9fd0f0'; c.fillRect(0, 0, w, h);
      const r = rng(4);
      for (let i = 0; i < 40; i++) { const bw = 8 + r() * 20, bh = 14 + r() * 40; c.fillStyle = ['#5d6b85', '#6f7d96', '#4a566e'][i % 3]; c.fillRect(i * 13, h - bh, bw, bh); }
    }) }));
    sky.position.set(0, 200, -748); g.add(sky);
    const glass = new THREE.Mesh(box, new THREE.MeshLambertMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.35 }));
    glass.position.set(-FIELD_X - 420, 70, -330); glass.scale.set(320, 140, 220); g.add(glass);
    const table = new THREE.Mesh(box, lambert('#8a6a45')); table.position.set(-FIELD_X - 420, 40, -330); table.scale.set(200, 6, 80); g.add(table);
    const lamps = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), 18);
    for (let i = 0; i < 18; i++) place(lamps, i, -1400 + (i % 9) * 350, 1000, FIELD_Z / 2 - 400 + Math.floor(i / 9) * 800, 160, 6, 40);
    g.add(lamps);
  }

  // Outer Space: planets, a ringed giant, a distant sun and drifting asteroids.
  function spaceProps(g, rnd, tick) {
    const planet = (x, y, z, r, colors, ring) => {
      const tex = canvas(256, 128, (c, w, h) => {
        for (let j = 0; j < h; j += 8) { c.fillStyle = colors[(j / 8 + Math.floor(rng(j + 3)() * 2)) % colors.length]; c.fillRect(0, j, w, 8); }
      });
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshLambertMaterial({ map: tex }));
      m.position.set(x, y, z); g.add(m);
      if (ring) {
        const rg = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2.1, 64), new THREE.MeshBasicMaterial({ color: ring, side: THREE.DoubleSide, transparent: true, opacity: 0.7, fog: false }));
        rg.position.copy(m.position); rg.rotation.x = -PI / 2 + 0.35; g.add(rg);
      }
      tick.push(clock => { m.rotation.y = clock * 0.03; });
    };
    planet(-3000, 1600, -6500, 900, ['#d9a066', '#c98a5a', '#e8c18a', '#b5734a'], '#e8d4b0');
    planet(3600, 2600, -5200, 420, ['#6fa8dc', '#4f86c6', '#9fc8ec']);
    planet(1200, -1800, -4200, 260, ['#b56cff', '#8a4fd1']);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff1c4', fog: false }));
    sun.position.set(-6000, 3500, 2000); g.add(sun);
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lambert('#6e6a66'), 40);
    const data = Array.from({ length: 40 }, () => ({ a: rnd() * TAU, d: 1300 + rnd() * 1800, y: -600 + rnd() * 1400, s: 10 + rnd() * 50, v: 0.01 + rnd() * 0.03 }));
    g.add(rocks);
    tick.push(clock => {
      data.forEach((o, i) => place(rocks, i, Math.cos(o.a + clock * o.v) * o.d * 1.3, o.y, FIELD_Z / 2 + Math.sin(o.a + clock * o.v) * o.d, o.s, o.s * 0.8, o.s, clock * o.v * 20));
      rocks.instanceMatrix.needsUpdate = true;
    });
  }

  function arena(g, rnd, tick) {
    const cz = FIELD_Z / 2;
    for (const sd of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 330, 10), lambert('#3a3f4c'));
      pole.position.set(sd * (FIELD_X + 190), 165, cz);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(150, 8, 8), lambert('#3a3f4c'));
      arm.position.set(sd * (FIELD_X + 115), 310, cz);
      const board = new THREE.Mesh(new THREE.BoxGeometry(4, 90, 150), lambert('#f4f6fb'));
      board.position.set(sd * (FIELD_X + 40), 300, cz);
      const square = new THREE.Mesh(new THREE.BoxGeometry(5, 34, 46), lambert('#d9483b'));
      square.position.set(sd * (FIELD_X + 40), 286, cz);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(18, 1.6, 8, 24), lambert('#e2711d'));
      rim.rotation.x = PI / 2; rim.position.set(sd * (FIELD_X + 18), 262, cz);
      const net = new THREE.Mesh(new THREE.CylinderGeometry(18, 10, 30, 12, 3, true), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true }));
      net.position.set(sd * (FIELD_X + 18), 246, cz);
      for (const m of [pole, arm, board, square, rim]) m.castShadow = true;
      g.add(pole, arm, board, square, rim, net);
    }
    // Bleachers: eight stepped rows behind the far sideline and behind each baseline.
    const seats = [], crowd = [];
    for (let k = 0; k < 8; k++) {
      seats.push([0, k * 30 + 15, -170 - k * 45, 1900, 30, 45]);
      for (let x = -900; x <= 900; x += 30) crowd.push([x + (rnd() - 0.5) * 8, k * 30 + 30, -170 - k * 45]);
      for (const sd of [-1, 1]) {
        seats.push([sd * (FIELD_X + 330 + k * 45), k * 30 + 15, cz, 45, 30, FIELD_Z + 300]);
        for (let z = -120; z <= FIELD_Z + 120; z += 32) crowd.push([sd * (FIELD_X + 330 + k * 45), k * 30 + 30, z + (rnd() - 0.5) * 8]);
      }
    }
    const seatMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert('#2c3a6b'), seats.length);
    seats.forEach(([x, y, z, sx, sy, sz], i) => place(seatMesh, i, x, y, z, sx, sy, sz));
    g.add(seatMesh);
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert('#ffffff'), crowd.length);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), lambert('#ffffff'), crowd.length);
    const shirts = ['#d9483b', '#3a6fd9', '#f4b62e', '#ffffff', '#2a2433', '#7be0b8'].map(c => new THREE.Color(c));
    const skins = ['#f3c9a1', '#d9a57a', '#a8714a', '#6b4229'].map(c => new THREE.Color(c));
    crowd.forEach((c, i) => { bodies.setColorAt(i, shirts[i % shirts.length]); heads.setColorAt(i, skins[(i * 7) % skins.length]); });
    g.add(bodies, heads);
    tick.push(clock => {
      crowd.forEach(([x, y, z], i) => {
        const hop = Math.max(0, Math.sin(clock * 6 + i * 1.7)) * 5;
        place(bodies, i, x, y + 12 + hop, z, 12, 22, 9);
        place(heads, i, x, y + 29 + hop, z, 6.5, 7, 6.5);
      });
      bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    });
    // Jumbotron and the light rigs.
    const screen = canvas(256, 128, (x, w, h) => {
      x.fillStyle = '#0d1020'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#d9483b'; x.fillRect(12, 34, 100, 60);
      x.fillStyle = '#3a6fd9'; x.fillRect(144, 34, 100, 60);
      x.fillStyle = '#ffffff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('VS', 128, 74);
    });
    const tron = new THREE.Mesh(new THREE.BoxGeometry(260, 150, 260), [0, 1, 2, 3, 4, 5].map(i => (i === 2 || i === 3 ? lambert('#1a1d2b') : new THREE.MeshBasicMaterial({ map: screen }))));
    tron.position.set(0, 1500, cz);
    g.add(tron);
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff8e0', fog: false }), 16);
    for (let i = 0; i < 16; i++) place(lamps, i, -1200 + (i % 8) * 340, 1900, cz - 500 + Math.floor(i / 8) * 1000, 40, 18, 40);
    g.add(lamps);
  }

  const lavaTexture = () => canvas(256, 256, (x, w, h) => {
    x.fillStyle = '#e8481a'; x.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 90; i++) {
      x.fillStyle = ['#ff8a2a', '#ffc04a', '#b8300f'][i % 3];
      x.beginPath(); x.arc(r() * w, r() * h, 6 + r() * 22, 0, TAU); x.fill();
    }
  });

  function ground(g, L, env, rnd) {
    let mat;
    if (L.lavaGround) {
      const t = lavaTexture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40);
      mat = new THREE.MeshBasicMaterial({ map: t });
    } else if (L.ground) mat = lambert(L.ground);
    if (mat) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(18000, 18000), mat);
      plane.rotation.x = -PI / 2; plane.receiveShadow = !L.lavaGround;
      g.add(plane);
    }

    // The field: mown stripes (or a hardwood court), plus ice cracks or moon dust where the map has them.
    const tex = L.court ? courtTexture(L) : canvas(512, 256, (x, w, h) => {
      for (let i = 0; i < 16; i++) { x.fillStyle = L.stripes[i % 2]; x.fillRect(i * 32, 0, 32, h); }
      const r = rng(5);
      if (L.cracks) {
        x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1.2;
        for (let i = 0; i < 26; i++) {
          let px = r() * w, py = r() * h;
          x.beginPath(); x.moveTo(px, py);
          for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 60; py += (r() - 0.5) * 40; x.lineTo(px, py); }
          x.stroke();
        }
      }
      if (L.carpet) {
        // Office carpet tiles: a squared pattern with speckle.
        x.fillStyle = L.stripes[0]; x.fillRect(0, 0, w, h);
        for (let i = 0; i < w; i += 32) for (let j = 0; j < h; j += 32) {
          x.fillStyle = ((i + j) / 32) % 2 ? L.stripes[0] : L.stripes[1]; x.fillRect(i, j, 32, 32);
        }
        for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.12})`; x.fillRect(r() * w, r() * h, 1.5, 1.5); }
      }
      if (L.plates) {
        // Metal deck plates with rivets.
        x.strokeStyle = 'rgba(20,24,32,0.6)'; x.lineWidth = 2;
        for (let i = 0; i <= w; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
        for (let j = 0; j <= h; j += 64) { x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
        x.fillStyle = 'rgba(220,226,236,0.5)';
        for (let i = 6; i < w; i += 64) for (let j = 6; j < h; j += 64) for (const [a, b] of [[0, 0], [52, 0], [0, 52], [52, 52]]) { x.beginPath(); x.arc(i + a, j + b, 2, 0, TAU); x.fill(); }
      }
      if (L.ash) {
        // Ash and crushed earth, cracked, with the Wall Titans' footprints on the east side.
        for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${20 + r() * 30},${14 + r() * 20},${12 + r() * 14},${0.1 + r() * 0.25})`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 10, 0, TAU); x.fill(); }
        x.strokeStyle = 'rgba(255,140,80,0.18)'; x.lineWidth = 1.2;
        for (let i = 0; i < 40; i++) {
          let px = r() * w, py = r() * h; x.beginPath(); x.moveTo(px, py);
          for (let k = 0; k < 5; k++) { px += (r() - 0.5) * 40; py += (r() - 0.5) * 30; x.lineTo(px, py); }
          x.stroke();
        }
        x.fillStyle = 'rgba(25,16,12,0.55)';
        for (let i = 0; i < 7; i++) { x.beginPath(); x.ellipse(w * (0.6 + r() * 0.38), r() * h, 14, 26, r() * 0.6 - 0.3, 0, TAU); x.fill(); }
      }
      if (L.dots) {
        for (let i = 0; i < 160; i++) {
          x.fillStyle = `rgba(60,60,70,${0.08 + r() * 0.15})`;
          x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 9, 0, TAU); x.fill();
        }
      }
    });
    const margin = L.lavaGround ? 120 : 180;
    const field = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_X * 2 + margin, FIELD_Z + margin), new THREE.MeshLambertMaterial({ map: tex }));
    field.rotation.x = -PI / 2; field.position.set(0, 0.4, FIELD_Z / 2); field.receiveShadow = true;
    g.add(field);
    if (L.cobble || L.pave) {
      // Streets: a small repeating tile of cobbles (or paving slabs) on the field and on the ground around it.
      const tile = canvas(128, 128, (x, w, h) => {
        const r = rng(13);
        if (L.cobble) {
          x.fillStyle = '#3e352c'; x.fillRect(0, 0, w, h);
          for (let j = 0; j < h; j += 16) {
            const off = (j / 16) % 2 ? 9 : 0;
            for (let i = -18; i < w + 18; i += 18) {
              x.fillStyle = L.stripes[Math.floor(r() * 2)]; x.globalAlpha = 0.7 + r() * 0.3;
              x.beginPath(); x.ellipse(i + off + 8, j + 8, 8, 6.5, 0, 0, TAU); x.fill();
            }
          }
        } else {
          for (let j = 0; j < h; j += 32) for (let i = 0; i < w; i += 32) { x.fillStyle = L.stripes[((i + j) / 32) % 2]; x.globalAlpha = 0.85 + r() * 0.15; x.fillRect(i, j, 32, 32); }
          x.globalAlpha = 1; x.strokeStyle = 'rgba(15,15,20,0.6)'; x.lineWidth = 2;
          for (let i = 0; i <= w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
        }
        x.globalAlpha = 1;
      });
      tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
      const t1 = tile, t2 = tile.clone(); t2.needsUpdate = true;
      t1.repeat.set((FIELD_X * 2 + margin) / 64, (FIELD_Z + margin) / 64);
      t2.repeat.set(18000 / 64, 18000 / 64);
      field.material.map = t1;
      g.children.forEach(o => { if (o.isMesh && o !== field && o.geometry.parameters && o.geometry.parameters.width === 18000) { o.material.map = t2; o.material.color.set('#ffffff'); } });
    }
    if (L.rubbleField) {
      // Debris and the flattened, cratered east side, laid over the cobbles.
      const ov = canvas(1024, 512, (x, w, h) => {
        const r = rng(17);
        for (let i = 0; i < 900; i++) { x.fillStyle = ['rgba(106,92,72,0.9)', 'rgba(164,149,128,0.9)', 'rgba(62,53,44,0.9)'][i % 3]; x.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
        const gr = x.createLinearGradient(w * 0.58, 0, w * 0.74, 0); gr.addColorStop(0, 'rgba(122,104,78,0)'); gr.addColorStop(1, 'rgba(122,104,78,0.92)');
        x.fillStyle = gr; x.fillRect(w * 0.58, 0, w * 0.42, h);
        for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(60,48,36,0.55)'; x.beginPath(); x.arc(w * (0.68 + r() * 0.3), r() * h, 14 + r() * 26, 0, TAU); x.fill(); }
      });
      const o = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_X * 2 + margin, FIELD_Z + margin), new THREE.MeshLambertMaterial({ map: ov, transparent: true, depthWrite: false }));
      o.rotation.x = -PI / 2; o.position.set(0, 0.6, FIELD_Z / 2); o.receiveShadow = true;
      g.add(o);
    }
    if (L.plates) {
      // The platform is a slab hanging in space, with glowing edges.
      const slab = new THREE.Mesh(new THREE.BoxGeometry(FIELD_X * 2 + margin, 40, FIELD_Z + margin), lambert('#3a3f4c'));
      slab.position.set(0, -20.2, FIELD_Z / 2); slab.receiveShadow = true;
      g.add(slab);
      const glow = new THREE.MeshBasicMaterial({ color: '#7fd6ff', fog: false });
      const W2 = FIELD_X + margin / 2, z0 = -margin / 2, z1 = FIELD_Z + margin / 2;
      for (const [x, z, sx, sz] of [[0, z0, W2 * 2, 3], [0, z1, W2 * 2, 3], [-W2, FIELD_Z / 2, 3, z1 - z0], [W2, FIELD_Z / 2, 3, z1 - z0]]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(sx, 3, sz), glow);
        edge.position.set(x, 1, z); g.add(edge);
      }
    }

    // Lava pools inside the field.
    for (const [x, z, r] of env.pools || []) {
      const pool = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ map: lavaTexture() }));
      pool.rotation.x = -PI / 2; pool.position.set(x, 0.7, z);
      const rim = new THREE.Mesh(new THREE.RingGeometry(r, r + 6, 40), lambert('#2e2422'));
      rim.rotation.x = -PI / 2; rim.position.set(x, 0.8, z);
      g.add(pool, rim);
    }
  }

  // Props scattered around the field.
  function scenery(g, L, rnd, tick, env) {
    if (L.scenery === 'district') {
      district(g, L, env, rnd, tick);
      if (L.district === 'trost' || L.district === 'shiganshina') L = Object.assign({}, L, { scenery: 'trees', farOnly: true });
      else return;
    }
    const spots = [];
    while (spots.length < 110) {
      const a = rnd() * TAU, d = 1100 + rnd() * 2200;
      const x = Math.cos(a) * d * 1.3, z = FIELD_Z / 2 + Math.sin(a) * d;
      if (Math.abs(x) < FIELD_X + 260 && z > -300 && z < FIELD_Z + 300) continue;
      if (L.farOnly && Math.abs(x) < 1000 && z > -400 && z < 1250) continue;   // the district fills the walls
      spots.push([x, z, 0.7 + rnd() * 0.9, rnd() * TAU]);
    }
    const n = spots.length, add = m => { m.castShadow = true; g.add(m); return m; };
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
    switch (L.scenery) {
      case 'trees': case 'pines': {
        const pine = L.scenery === 'pines';
        const trunk = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.3, 1, 6), lambert('#7a5534'), n));
        const tiers = pine ? 3 : 2, leaves = [];
        for (let k = 0; k < tiers; k++) leaves.push(add(new THREE.InstancedMesh(coneGeo(), lambert(pine ? ['#2f6b45', '#357a4e', '#3f8a59'][k] : ['#4c8a39', '#5e9f46'][k]), n)));
        const caps = pine ? add(new THREE.InstancedMesh(coneGeo(), lambert('#f4f8fb'), n)) : null;
        spots.forEach(([x, z, s], i) => {
          place(trunk, i, x, 18 * s, z, 6 * s, 36 * s, 6 * s);
          if (pine) {
            leaves.forEach((m, k) => place(m, i, x, (24 + k * 34) * s, z, (40 - k * 10) * s, 60 * s, (40 - k * 10) * s));
            place(caps, i, x, 104 * s, z, 12 * s, 26 * s, 12 * s);
          } else {
            place(leaves[0], i, x, 28 * s, z, 36 * s, 80 * s, 36 * s);
            place(leaves[1], i, x, 70 * s, z, 26 * s, 64 * s, 26 * s);
          }
        });
        break;
      }
      case 'cacti': {
        const parts = add(new THREE.InstancedMesh(cyl, lambert('#5f9a4a'), n * 5));
        const tips = add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), lambert('#6aa955'), n * 3));
        spots.forEach(([x, z, s, rot], i) => {
          const cx = Math.cos(rot), cz = Math.sin(rot);
          place(parts, i * 5, x, 45 * s, z, 8 * s, 90 * s, 8 * s);
          place(tips, i * 3, x, 90 * s, z, 8 * s, 8 * s, 8 * s);
          for (const [k, side, h] of [[1, -1, 40], [3, 1, 55]]) {
            // An elbow: a short sideways stub, then an upright arm.
            const ax = x + cx * side * 14 * s, az = z + cz * side * 14 * s;
            tmpQ.setFromUnitVectors(UP, tmpP.set(cx * side, 0, cz * side));
            parts.setMatrixAt(i * 5 + k, tmpM.compose(tmpP.set(x + cx * side * 8 * s, h * s, z + cz * side * 8 * s), tmpQ, tmpS.set(5 * s, 16 * s, 5 * s)));
            place(parts, i * 5 + k + 1, ax, (h + 14) * s, az, 5 * s, 28 * s, 5 * s);
            place(tips, i * 3 + (k === 1 ? 1 : 2), ax, (h + 28) * s, az, 5 * s, 5 * s, 5 * s);
          }
        });
        // Pyramids on the horizon.
        const pyr = new THREE.ConeGeometry(1, 1, 4); pyr.translate(0, 0.5, 0);
        [[-2600, -3800, 900], [-1300, -4300, 650], [2900, -3600, 760]].forEach(([x, z, s]) => {
          const m = new THREE.Mesh(pyr, lambert('#d9b36a')); m.position.set(x, 0, z); m.scale.set(s, s * 0.9, s); m.rotation.y = PI / 4; g.add(m);
        });
        break;
      }
      case 'craters': {
        const rims = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.12, 6, 28), lambert('#7c7c84'), 40);
        for (let i = 0; i < 40; i++) {
          const a = rnd() * TAU, d = 900 + rnd() * 2600, r = 40 + rnd() * 160;
          tmpQ.setFromAxisAngle(tmpP.set(1, 0, 0), PI / 2);
          rims.setMatrixAt(i, tmpM.compose(tmpP.set(Math.cos(a) * d * 1.3, 0, FIELD_Z / 2 + Math.sin(a) * d), tmpQ, tmpS.set(r, r, r * 0.6)));
        }
        g.add(rims);
        break;
      }
      case 'basalt': {
        const cols = add(new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), lambert('#3a302e'), n * 3));
        spots.forEach(([x, z, s, rot], i) => {
          for (let k = 0; k < 3; k++) {
            const h = (40 + k * 30 + rnd() * 40) * s;
            place(cols, i * 3 + k, x + Math.cos(rot + k * 2.1) * 16 * s, h / 2, z + Math.sin(rot + k * 2.1) * 16 * s, 12 * s, h, 12 * s, rot);
          }
        });
        // The volcano itself, glowing at the top.
        const cone = new THREE.Mesh(coneGeo(), lambert('#2f2422')); cone.position.set(600, 0, -5200); cone.scale.set(2200, 1900, 2200); g.add(cone);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: '#ff7a2a', fog: false }));
        glow.position.set(600, 1800, -5200); glow.scale.set(260, 120, 260); g.add(glow);
        break;
      }
      case 'arena':
        arena(g, rnd, tick);
        return;
      case 'colosseum':
        colosseum(g, rnd, tick);
        return;
      case 'office':
        office(g, rnd, tick);
        return;
      case 'space':
        spaceProps(g, rnd, tick);
        return;
      case 'lollipops': {
        const sticks = add(new THREE.InstancedMesh(cyl, lambert('#ffffff'), n));
        const candy = add(new THREE.InstancedMesh(cyl, lambert('#ffffff'), n));
        const drops = add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, PI / 2), lambert('#ffffff'), n));
        const palette = ['#ff6fa8', '#7be0b8', '#ffd96b', '#b99cff', '#6fc8ff'].map(c => new THREE.Color(c));
        spots.forEach(([x, z, s, rot], i) => {
          place(sticks, i, x, 45 * s, z, 2.5 * s, 90 * s, 2.5 * s);
          tmpQ.setFromAxisAngle(tmpP.set(Math.cos(rot), 0, Math.sin(rot)), PI / 2);
          candy.setMatrixAt(i, tmpM.compose(tmpP.set(x, 105 * s, z), tmpQ, tmpS.set(30 * s, 6 * s, 30 * s)));
          candy.setColorAt(i, palette[i % palette.length]);
          place(drops, i, x + 70 * s, 0, z + 40 * s, 22 * s, 26 * s, 22 * s);
          drops.setColorAt(i, palette[(i + 2) % palette.length]);
        });
        break;
      }
    }
    if (L.farOnly) return;
    // Rocks just off the field, coloured to suit the map.
    const rockColor = { winter: '#d7dee6', moon: '#8a8a92', basalt: '#2e2624', lollipops: '#ffffff', cacti: '#c9a46a' }[L.scenery === 'pines' ? 'winter' : L.scenery === 'craters' ? 'moon' : L.scenery] || '#a19c92';
    const rocks = add(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lambert(rockColor), 36));
    for (let i = 0; i < 36; i++) {
      const side = i % 2 ? 1 : -1, s = 8 + rnd() * 16;
      place(rocks, i, side * (FIELD_X + 150 + rnd() * 500), s * 0.3, -200 + rnd() * (FIELD_Z + 400), s, s * 0.7, s * 1.2, rnd() * TAU);
    }
  }

  function hills(g, L, rnd) {
    if (!L.hills) return;
    const geo = new THREE.SphereGeometry(1, 24, 12), mats = L.hills.map(lambert);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.3, d = 5600 + rnd() * 1400;
      const hill = new THREE.Mesh(geo, mats[i % 2]);
      hill.position.set(Math.cos(a) * d, -150, FIELD_Z / 2 + Math.sin(a) * d);
      hill.scale.set(1500 + rnd() * 900, 450 + rnd() * 450, 1300 + rnd() * 700);
      g.add(hill);
    }
  }

  function clouds(g, L, rnd, tick) {
    if (!L.clouds) return;
    const n = L.clouds.count, mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: L.clouds.color, fog: false }), n * 5);
    const data = Array.from({ length: n }, () => ({ x: -5000 + rnd() * 10000, y: 1600 + rnd() * 900, z: -4000 + rnd() * 6000, s: 120 + rnd() * 140, v: 6 + rnd() * 8 }));
    g.add(mesh);
    tick.push(clock => {
      data.forEach((c, i) => {
        const x = ((c.x + clock * c.v + 6000) % 12000) - 6000;
        for (let k = 0; k < 5; k++) {
          const s = c.s * (k === 2 ? 1.25 : 0.8 + (k % 2) * 0.15);
          tmpQ.identity();
          mesh.setMatrixAt(i * 5 + k, tmpM.compose(tmpP.set(x + (k - 2) * c.s * 0.9, c.y + (k === 2 ? c.s * 0.3 : 0), c.z + (k % 2 ? 40 : -30)), tmpQ, tmpS.set(s, s * 0.6, s * 0.8)));
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // Falling snow, rising embers, stars and the Earth.
  function weather(g, L, rnd, tick) {
    const drift = (count, box, color, size, speed, rise, extra) => {
      const base = new Float32Array(count * 3), pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        base[i * 3] = box[0] + rnd() * (box[1] - box[0]);
        base[i * 3 + 1] = rnd() * box[2];
        base[i * 3 + 2] = box[3] + rnd() * (box[4] - box[3]);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial(Object.assign({ color, size, transparent: true, opacity: 0.9, depthWrite: false }, extra)));
      pts.frustumCulled = false;
      g.add(pts);
      tick.push(clock => {
        const H = box[2];
        for (let i = 0; i < count; i++) {
          const y = base[i * 3 + 1] + (rise ? 1 : -1) * clock * speed * (0.6 + (i % 7) / 10);
          pos[i * 3] = base[i * 3] + Math.sin(clock * 0.8 + i) * 12;
          pos[i * 3 + 1] = ((y % H) + H) % H;
          pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(clock * 0.6 + i) * 12;
        }
        geo.attributes.position.needsUpdate = true;
      });
    };
    if (L.snow) drift(1800, [-1800, 1800, 1200, -900, FIELD_Z + 900], '#ffffff', 5, 60, false);
    if (L.embers) drift(700, [-2200, 2200, 700, -1200, FIELD_Z + 1200], '#ffb347', 5, 45, true, { blending: THREE.AdditiveBlending });
    if (L.stars) {
      const n = 2200, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const a = rnd() * TAU, e = Math.asin(L.starsAll ? rnd() * 2 - 1 : rnd()) * 0.98, r = 8500;
        pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, fog: false })));
    }
    if (L.earth) {
      const tex = canvas(256, 128, (x, w, h) => {
        x.fillStyle = '#2f6fd1'; x.fillRect(0, 0, w, h);
        const r = rng(3);
        for (let i = 0; i < 26; i++) { x.fillStyle = i % 3 ? '#4fa04a' : '#ffffff'; x.beginPath(); x.ellipse(r() * w, r() * h, 8 + r() * 26, 5 + r() * 12, r() * 3, 0, TAU); x.fill(); }
      });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 20), new THREE.MeshBasicMaterial({ map: tex, fog: false }));
      earth.position.set(-2600, 2900, -6200);
      g.add(earth);
      tick.push(clock => { earth.rotation.y = clock * 0.02; });
    }
  }

  // ---------- Attack on Titan districts ----------
  // A collector of instanced parts: every building on the map adds boxes, roofs, rocks and lights to it, then
  // flush() turns each list into one InstancedMesh with per-instance colours.
  function kit() {
    const lists = { box: [], roof: [], rock: [], cyl: [], cone: [], pyr: [], glow: [], glowBall: [], sphere: [] };
    const e = new THREE.Euler(), add = (k, x, y, z, sx, sy, sz, col, rx = 0, ry = 0, rz = 0) => lists[k].push([x, y, z, sx, sy, sz, rx, ry, rz, col]);
    const roofGeo = (() => {
      const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 1, 0, -0.5, 0, -0.5, 0.5, 1, 0, -0.5, 1, 0,      // south slope
        0.5, 0, 0.5, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 0, 0.5, -0.5, 1, 0, 0.5, 1, 0,                  // north slope
        -0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 1, 0];             // gables
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
      return geo;
    })();
    const pyr = new THREE.ConeGeometry(0.7072, 1, 4); pyr.rotateY(PI / 4); pyr.translate(0, 0.5, 0);
    const geos = {
      box: new THREE.BoxGeometry(1, 1, 1), roof: roofGeo, rock: new THREE.DodecahedronGeometry(1, 0), cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
      cone: coneGeo(), pyr, glow: new THREE.BoxGeometry(1, 1, 1), glowBall: new THREE.SphereGeometry(1, 10, 8), sphere: new THREE.SphereGeometry(1, 14, 10),
    };
    return {
      add, lists,
      flush(g) {
        for (const k in lists) {
          const L = lists[k];
          if (!L.length) continue;
          const glow = k === 'glow' || k === 'glowBall';
          const mat = glow ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : new THREE.MeshLambertMaterial({ color: '#ffffff', side: k === 'roof' ? THREE.DoubleSide : THREE.FrontSide });
          const m = new THREE.InstancedMesh(geos[k], mat, L.length);
          L.forEach(([x, y, z, sx, sy, sz, rx, ry, rz, col], i) => {
            tmpQ.setFromEuler(e.set(rx, ry, rz));
            m.setMatrixAt(i, tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz)));
            m.setColorAt(i, new THREE.Color(col));
          });
          if (!glow) { m.castShadow = true; m.receiveShadow = true; }
          g.add(m);
        }
      },
    };
  }

  const PLASTER = ['#e8dcc0', '#d9c9a8', '#efe6d2', '#cdbb98', '#e2d2b4'];
  const TILES = ['#b5532f', '#a8452b', '#c2643a', '#8f3d2a', '#9c5a3a'];
  const BRICKS = ['#8a4a3a', '#9a5a44', '#7a4436', '#a0644c', '#6e4a3e'];
  const hash = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };

  // Half-timbered house: plaster walls, dark beams, windows, a tiled gable roof straddling the walkable height.
  function house(K, b, ruined) {
    const [x0, x1, z0, z1, h] = b, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, v = hash(x0, z0);
    const ridge = clamp(Math.min(w, d) * 0.22, 8, 15), base = h - ridge * 0.5, wallH = base;
    const plaster = ruined ? ['#a89878', '#9a8a6c', '#b4a284'][Math.floor(v * 3)] : PLASTER[Math.floor(v * PLASTER.length)];
    const beam = ruined ? '#2e241c' : '#4a3426';
    K.add('box', cx, wallH / 2, cz, w, wallH, d, plaster);
    for (const y of [wallH * 0.5, wallH - 1.2]) K.add('box', cx, y, cz, w + 0.8, 2.2, d + 0.8, beam);
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) K.add('box', px, wallH / 2, pz, 2.6, wallH, 2.6, beam);
    // Windows and a door on each long face; a cross brace on the gable ends.
    const floors = wallH > 34 ? [0.27, 0.74] : [0.55];
    for (const fz of [z0 - 0.6, z1 + 0.6]) {
      const n = Math.max(1, Math.floor(w / 26));
      for (let i = 0; i < n; i++) for (const f of floors) {
        const wx = x0 + (i + 0.5) * w / n;
        if (f < 0.4 && i === Math.floor(n / 2)) { K.add('box', wx, 8, fz, 9, 16, 1.2, '#4a3020'); continue; }
        K.add('box', wx, wallH * f, fz, 7, 9, 1.2, hash(wx, f) < 0.15 && !ruined ? '#e8c27a' : '#2a2a33');
      }
    }
    for (const fx of [x0 - 0.6, x1 + 0.6]) {
      const n = Math.max(1, Math.floor(d / 30));
      for (let i = 0; i < n; i++) K.add('box', fx, wallH * floors[floors.length - 1], z0 + (i + 0.5) * d / n, 1.2, 9, 7, '#2a2a33');
    }
    const along = w >= d, rot = along ? 0 : PI / 2, rw = (along ? w : d) + 8, rd = (along ? d : w) + 8;
    const tile = ruined ? '#5a3a2a' : TILES[Math.floor(hash(z0, x0) * TILES.length)];
    if (ruined) {
      // Half a roof hanging off the beams, the rest open to the sky; charred timbers sticking up.
      K.add('roof', cx + (along ? -w * 0.22 : 0), base, cz + (along ? 0 : -d * 0.22), rw * 0.5, ridge, rd, tile, 0.12 * (v - 0.5), rot, 0.18 * (v - 0.5));
      for (let i = 0; i < 3; i++) K.add('box', x0 + w * (0.25 + i * 0.25), h + 4, cz + (hash(i, x0) - 0.5) * d * 0.6, 2.2, 16 + hash(x0, i) * 14, 2.2, '#2a201a', (hash(i, z0) - 0.5) * 0.9, 0, (hash(z0, i) - 0.5) * 0.9);
      for (let i = 0; i < 4; i++) K.add('box', x0 + w * hash(i * 3, z1), wallH + 2, z0 + d * hash(z1, i * 5), 6 + hash(i, i) * 8, 4, 6, plaster, 0, hash(i, x1) * 3, 0.3);
      K.add('box', cx, wallH * 0.75, z1 + 0.8, w * 0.4, wallH * 0.35, 0.6, '#3a3028');   // scorch marks
    } else {
      K.add('roof', cx, base, cz, rw, ridge, rd, tile, 0, rot, 0);
      if (v > 0.35) K.add('box', cx + (along ? w * 0.22 : d * 0.1), h + 4, cz + (along ? d * 0.12 : d * 0.22), 6, 14, 6, '#7a4a3a');
    }
  }

  function hall(K, b) {
    const [x0, x1, z0, z1, h] = b, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    K.add('box', cx, h / 2, cz, w, h, d, '#b9b1a1');
    K.add('box', cx, h - 2, cz, w + 3, 4, d + 3, '#8e877a');
    for (const [px, pz, sx, sz] of [[cx, z0 + 1, w, 2], [cx, z1 - 1, w, 2], [x0 + 1, cz, 2, d], [x1 - 1, cz, 2, d]]) K.add('box', px, h + 3, pz, sx, 6, sz, '#9e9789');
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
      K.add('cyl', px, (h + 30) / 2, pz, 10, h + 30, 10, '#a9a192');
      K.add('cone', px, h + 30, pz, 13, 22, 13, '#5a4a6a');
    }
    for (let i = 0; i < 5; i++) for (const f of [0.3, 0.7]) K.add('box', x0 + (i + 0.5) * w / 5, h * f, z1 + 0.6, 8, 13, 1.2, '#2a2a33');
    K.add('box', cx, 14, z1 + 0.7, 26, 28, 1.4, '#4a3020');
    // The Garrison's banner on a pole.
    K.add('cyl', cx, h + 30, cz, 1.4, 60, 1.4, '#3a3a3a');
    K.add('box', cx + 14, h + 48, cz, 26, 18, 1, '#c03a3a');
    K.add('box', cx + 14, h + 48, cz + 0.6, 10, 10, 0.4, '#f4f0e6');
  }

  function tower(K, b) {
    const [x0, x1, z0, z1, h] = b, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    K.add('box', cx, h / 2, cz, w, h, d, '#b3ab9b');
    K.add('box', cx, h - 2, cz, w + 4, 4, d + 4, '#8e877a');
    for (const [px, pz] of [[x0 + 3, z0 + 3], [x1 - 3, z0 + 3], [x0 + 3, z1 - 3], [x1 - 3, z1 - 3]]) K.add('box', px, h + 18, pz, 5, 36, 5, '#8e877a');
    K.add('pyr', cx, h + 36, cz, w + 10, 44, d + 10, '#5a6a7a');
    K.add('sphere', cx, h + 20, cz, 7, 8, 7, '#c9963c');
    K.add('cyl', cx, h * 0.72, z1 + 1, 11, 1.5, 11, '#f4f0e6', PI / 2, 0, 0);
    K.add('box', cx, h * 0.72 + 3, z1 + 2, 1.2, 8, 0.6, '#2a2433');
    K.add('box', cx + 2.5, h * 0.72, z1 + 2, 6, 1.2, 0.6, '#2a2433');
    K.add('box', cx, 12, z1 + 0.7, 12, 24, 1.2, '#4a3020');
  }

  function boulder(K, b) {
    const [x0, x1, z0, z1, h] = b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    K.add('rock', cx, h * 0.48, cz, (x1 - x0) * 0.6, h * 0.55, (z1 - z0) * 0.6, '#8d877d', 0.3, hash(x0, z0) * 3, 0.2);
    K.add('rock', cx + (x1 - x0) * 0.2, h * 0.3, cz - (z1 - z0) * 0.25, (x1 - x0) * 0.3, h * 0.3, (z1 - z0) * 0.3, '#7d776d', 0.5, 1, 0);
  }

  function rubble(K, b) {
    const [x0, x1, z0, z1, h] = b;
    for (let i = 0; i < 6; i++) {
      const u = hash(x0 + i, z0), v = hash(z1, x1 + i), s = 5 + hash(i, x0) * 8;
      K.add('rock', x0 + (x1 - x0) * u, Math.min(h, s) * 0.6, z0 + (z1 - z0) * v, s * 1.2, Math.min(h, s), s, ['#9a9080', '#d9c9a8', '#6e6458', '#b5532f'][i % 4], u * 3, v * 3, 0);
    }
    for (let i = 0; i < 2; i++) K.add('box', x0 + (x1 - x0) * hash(i, z1), h * 0.6, z0 + (z1 - z0) * hash(x1, i), 30, 2.5, 3, '#4a3426', 0, hash(i, i) * 3, 0.4);
  }

  function rockTerrace(K, b) {
    const [x0, x1, z0, z1, h] = b, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    K.add('box', cx, h / 2, cz, w, h, d, '#6b5a4a');
    K.add('box', cx, h - 1.5, cz, w - 2, 3, d - 2, '#7d6c58');
    // Rough lumps along the faces so the edges read as rock, not a box.
    const lumps = Math.ceil((w + d) / 40);
    for (let i = 0; i < lumps; i++) {
      const u = (i + 0.5) / lumps, s = h * (0.35 + hash(i, x0) * 0.25);
      K.add('rock', x0 + w * u, s * 0.6, z1, s * 1.4, s, s * 0.6, '#5e4f40', hash(i, z0), hash(z0, i) * 3, 0);
      K.add('rock', x0 + w * u, s * 0.6, z0, s * 1.4, s, s * 0.6, '#5e4f40', hash(i, z1), hash(z1, i) * 3, 0);
      if (i < lumps / 2) {
        K.add('rock', x0, s * 0.6, z0 + d * u * 2, s * 0.6, s, s * 1.4, '#5a4b3c', 0, hash(x0, i), 0);
        K.add('rock', x1, s * 0.6, z0 + d * u * 2, s * 0.6, s, s * 1.4, '#5a4b3c', 0, hash(x1, i), 0);
      }
    }
  }

  // Liberio: brick buildings with rows of windows, some lit, a cornice, a parapet and chimneys.
  function brick(K, b) {
    const [x0, x1, z0, z1, h] = b, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, v = hash(x0, z0);
    const col = BRICKS[Math.floor(v * BRICKS.length)];
    K.add('box', cx, h / 2, cz, w, h, d, col);
    K.add('box', cx, 5, cz, w + 1.4, 10, d + 1.4, '#4a3a34');
    K.add('box', cx, h - 2, cz, w + 4, 4, d + 4, '#d8cdb5');
    for (const [px, pz, sx, sz] of [[cx, z0 + 1, w, 2], [cx, z1 - 1, w, 2], [x0 + 1, cz, 2, d], [x1 - 1, cz, 2, d]]) K.add('box', px, h + 2.5, pz, sx, 5, sz, '#5a3a32');
    const floors = Math.max(2, Math.floor((h - 10) / 18));
    const win = (x, y, z, sx, sz, lit) => K.add(lit ? 'glow' : 'box', x, y, z, sx, 10, sz, lit ? (hash(x, y) < 0.5 ? '#ffd98a' : '#ffc46a') : '#1c2030');
    for (let f = 0; f < floors; f++) {
      const y = 16 + f * (h - 22) / floors + 4;
      for (const fz of [z0 - 0.6, z1 + 0.6]) { const n = Math.max(1, Math.floor(w / 17)); for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * w / n; win(x, y, fz, 7, 1, hash(x, y + fz) < 0.33); } }
      for (const fx of [x0 - 0.6, x1 + 0.6]) { const n = Math.max(1, Math.floor(d / 17)); for (let i = 0; i < n; i++) { const z = z0 + (i + 0.5) * d / n; win(fx, y, z, 1, 7, hash(z, y + fx) < 0.33); } }
    }
    K.add('box', x0 + w * 0.25, h + 8, cz - d * 0.2, 7, 16, 7, '#5a3a32');
    if (v > 0.5) { K.add('cyl', x1 - 14, h + 14, z1 - 16, 9, 20, 9, '#6a5a4a'); K.add('cone', x1 - 14, h + 24, z1 - 16, 10, 8, 10, '#4a3a34'); }
  }

  // Willy Tybur's stage: a wooden platform with a red skirt and footlights, facing west across the plaza.
  function stage(K, b) {
    const [x0, x1, z0, z1, h] = b, d = z1 - z0, cz = (z0 + z1) / 2, cx = (x0 + x1) / 2;
    K.add('box', cx, h / 2, cz, x1 - x0, h, d, '#5a3a26');
    K.add('box', cx, h - 1, cz, x1 - x0 + 2, 2, d + 2, '#7a5236');
    K.add('box', x0 - 0.6, h / 2, cz, 1.2, h - 2, d, '#8a1c22');
    for (let i = 0; i < 12; i++) K.add('glowBall', x0 + 3, h + 2, z0 + (i + 0.5) * d / 12, 2.2, 2.2, 2.2, '#ffe8a8');
    // Steps up from the plaza.
    for (let k = 0; k < 3; k++) K.add('box', x0 - 8 - k * 8, (h / 3) * (2 - k) / 2 + h / 6, cz, 8, (h / 3) * (3 - k), 50, '#6a4a30');
  }

  // The theatre behind the stage: columns, an arch hung with red curtains, banners of Marley and the Tybur family.
  function theatre(K, b) {
    const [x0, x1, z0, z1, h] = b, d = z1 - z0, cz = (z0 + z1) / 2, cx = (x0 + x1) / 2;
    K.add('box', cx, h / 2, cz, x1 - x0, h, d, '#d8cdb5');
    K.add('box', cx, h - 3, cz, x1 - x0 + 6, 6, d + 6, '#b8ab90');
    K.add('roof', (x0 + x1) / 2, h - 2, cz, x1 - x0 + 4, 26, d * 0.62, '#cfc3a8', 0, 0, 0);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const z = z0 + 14 + i * (d - 28) / (n - 1);
      if (Math.abs(z - cz) < 64) continue;
      K.add('cyl', x0 - 6, h * 0.42, z, 5, h * 0.84, 5, '#e8e0cc');
    }
    K.add('box', x0 - 0.8, 56, cz, 1.4, 112, 118, '#1a0e10');
    for (const sd of [-1, 1]) K.add('box', x0 - 2, 56, cz + sd * 44, 3, 108, 30, '#a8141c', 0, 0, sd * 0.03);
    K.add('box', x0 - 2, 106, cz, 3, 12, 122, '#8a1018');
    for (const [z, c] of [[z0 + 20, '#a8232a'], [z1 - 20, '#a8232a'], [cz - 82, '#2a3a6a'], [cz + 82, '#2a3a6a']]) {
      K.add('box', x0 - 3, h * 0.55, z, 1, 60, 22, c);
      K.add('box', x0 - 3.6, h * 0.6, z, 0.6, 12, 12, '#e8c260');
    }
  }

  function lowWall(K, b) {
    const [x0, x1, z0, z1, h] = b, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    K.add('box', cx, h / 2, cz, x1 - x0, h, z1 - z0, '#8a8478');
    K.add('box', cx, h, cz, x1 - x0 + 2, 3, z1 - z0 + 3, '#a39d90');
  }

  // A great wall (Rose, Maria) or Fort Salta's walls, with its gates. Each wall gets its own material so it can
  // fade out whenever the camera swings round behind it.
  function greatWall(g, w, tick) {
    const along = w.x1 - w.x0 > w.z1 - w.z0, grp = new THREE.Group();
    const stoneM = lambert(w.fort ? '#7d6f60' : '#a39d8f'), darkM = lambert(w.fort ? '#5a4e42' : '#857f72');
    const mats = [stoneM, darkM];
    const box = new THREE.BoxGeometry(1, 1, 1);
    const B = (m, x, y, z, sx, sy, sz) => { const o = new THREE.Mesh(box, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; o.receiveShadow = true; grp.add(o); return o; };
    for (const s of wallBlocks(w)) {
      const [x0, x1, z0, z1, h] = s, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      B(stoneM, cx, h / 2, cz, x1 - x0, h, z1 - z0);
      B(darkM, cx, h * 0.07, cz, x1 - x0 + (along ? 0 : 16), h * 0.14, z1 - z0 + (along ? 16 : 0));
      // Masonry courses and the crenellated walkway on top.
      for (const f of [0.3, 0.55, 0.8]) B(darkM, cx, h * f, cz, x1 - x0 + (along ? 0 : 2), 3, z1 - z0 + (along ? 2 : 0));
      const len = along ? x1 - x0 : z1 - z0, n = Math.floor(len / 34);
      const crenels = new THREE.InstancedMesh(box, stoneM, n * 2);
      let k = 0;
      for (let i = 0; i < n; i++) for (const edge of [0, 1]) {
        const a = (along ? x0 : z0) + (i + 0.5) * len / n, e2 = edge ? (along ? z1 - 4 : x1 - 4) : (along ? z0 + 4 : x0 + 4);
        place(crenels, k++, along ? a : e2, h + 8, along ? e2 : a, along ? 16 : 8, 16, along ? 8 : 16);
      }
      crenels.castShadow = true; grp.add(crenels);
      if (w.fort) for (let i = 0; i < Math.floor(len / 260); i++) {
        const a = (along ? x0 : z0) + (i + 0.5) * len / Math.floor(len / 260);
        const tw = new THREE.Mesh(new THREE.CylinderGeometry(30, 34, h + 50, 10), stoneM); tw.position.set(along ? a : cx, (h + 50) / 2, along ? cz : a); tw.castShadow = true; grp.add(tw);
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 46, 8), lambert('#2b2b30'));
        gun.rotation.set(along ? PI / 2 : 0, 0, along ? 0 : PI / 2); gun.position.set(along ? a : cx + (cx < 0 ? 40 : -40), h + 30, along ? cz + 40 : a); grp.add(gun);
      }
    }
    // Gates: the lintel over the opening, and what is in it.
    for (const gt of w.gates || []) {
      const cx = along ? gt.at : (w.x0 + w.x1) / 2, cz = along ? (w.z0 + w.z1) / 2 : gt.at, th = (along ? w.z1 - w.z0 : w.x1 - w.x0) + 4;
      const sx = along ? gt.w : th, sz = along ? th : gt.w;
      if (gt.state === 'broken') {
        B(stoneM, cx, (gt.h + w.h) / 2 + 30, cz, along ? gt.w : th - 4, w.h - gt.h - 60, along ? th - 4 : gt.w);
        // The jagged hole the Colossal Titan kicked, and the wreckage strewn inward.
        const jag = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stoneM, 14);
        for (let i = 0; i < 14; i++) {
          const a = (i / 13 - 0.5) * gt.w, y = gt.h + 20 + Math.sin(i * 2.3) * 18;
          place(jag, i, along ? cx + a : cx, y, along ? cz : cz + a, 16 + (i % 3) * 6, 14, 16 + (i % 2) * 8, i);
        }
        jag.castShadow = true; grp.add(jag);
        const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), darkM, 22);
        for (let i = 0; i < 22; i++) {
          const a = (hash(i, gt.at) - 0.5) * gt.w * 1.6, out = hash(gt.at, i) * 160, sgn = cx > 0 || cz > 0 ? -1 : 1, s = 6 + hash(i, i) * 16;
          place(debris, i, along ? cx + a : cx + sgn * (40 + out), s * 0.4, along ? cz + sgn * (40 + out) : cz + a, s * 1.3, s * 0.8, s, i);
        }
        debris.castShadow = true; grp.add(debris);
      } else if (gt.state === 'crystal') {
        B(stoneM, cx, (gt.h + w.h) / 2, cz, along ? gt.w : th - 6, w.h - gt.h, along ? th - 6 : gt.w);
        const cm = new THREE.MeshLambertMaterial({ color: '#cfefff', emissive: '#5a9ab8', transparent: true, opacity: 0.85 });
        const cry = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), cm, 16);
        for (let i = 0; i < 16; i++) {
          const a = (i % 4 / 3 - 0.5) * gt.w * 0.8, y = 18 + Math.floor(i / 4) * (gt.h / 4.2);
          place(cry, i, along ? cx + a : cx, y, along ? cz : cz + a, 24 + (i % 3) * 8, 34, 24 + (i % 2) * 10, i * 0.7);
        }
        grp.add(cry);
        mats.push(cm);
      } else {
        B(stoneM, cx, (gt.h + w.h) / 2, cz, along ? gt.w : th - 6, w.h - gt.h, along ? th - 6 : gt.w);
        B(lambert('#3a2a1e'), cx, gt.h / 2, cz, sx - 6, gt.h, sz - 6);
      }
    }
    g.add(grp);
    // Fade when the camera is outside it (on the far side from the field).
    const n = along ? new THREE.Vector3(0, 0, Math.sign(FIELD_Z / 2 - (w.z0 + w.z1) / 2)) : new THREE.Vector3(Math.sign(-(w.x0 + w.x1) / 2), 0, 0);
    const mid = new THREE.Vector3((w.x0 + w.x1) / 2, 0, (w.z0 + w.z1) / 2);
    grp.traverse(o => { if (o.material && !mats.includes(o.material)) mats.push(o.material); });
    for (const m of mats) { m.transparent = true; m.userData.base = m.opacity; }
    let fade = 1;
    tick.push((clock, cam) => {
      if (!cam) return;
      const outside = tmpP.copy(cam.position).sub(mid).dot(n) < 0;
      fade += ((outside ? 0.14 : 1) - fade) * 0.15;
      for (const m of mats) { m.opacity = m.userData.base * fade; m.depthWrite = fade > 0.9; }
      grp.traverse(o => { if (o.isMesh) o.castShadow = fade > 0.9; });
    });
  }

  // Backdrop buildings outside the field, visual only, so the district carries on past the battle.
  function backdrop(L, rnd) {
    const out = [], lib = L.district === 'liberio';
    const areas = lib
      ? [[-1700, 1700, -900, -60, [70, 90, 110, 130]], [-1700, -790, -60, 620, [60, 80, 100]], [790, 1700, -60, 620, [60, 80, 100]], [-1700, 1700, 720, 1300, [30, 36, 42]]]
      : [[-830, 830, -230, -50, [40, 46, 52]], [-830, -760, -50, 620, [38, 44]], [760, 830, -50, 620, [38, 44]], [-830, 830, 720, 1200, [24, 28, 32]]];
    for (const [x0, x1, z0, z1, hs] of areas) {
      for (let z = z0; z < z1 - 40; ) {
        const d = lib ? 90 + rnd() * 70 : 60 + rnd() * 30;
        for (let x = x0; x < x1 - 40; ) {
          const w = lib ? 70 + rnd() * 70 : 60 + rnd() * 40;
          if (rnd() > 0.12) out.push([x, Math.min(x1, x + w), z, Math.min(z1, z + d), hs[Math.floor(rnd() * hs.length)]]);
          x += w + (lib ? 28 : 24) + rnd() * 10;
        }
        z += d + (lib ? 34 : 28) + rnd() * 12;
      }
    }
    return out;
  }

  function district(g, L, env, rnd, tick) {
    const K = kit();
    for (const b of env.blocks || []) {
      switch (b[5]) {
        case 'house': house(K, b, false); break;
        case 'ruin': house(K, b, true); break;
        case 'hall': hall(K, b); break;
        case 'tower': tower(K, b); break;
        case 'boulder': boulder(K, b); break;
        case 'rubble': rubble(K, b); break;
        case 'rock': rockTerrace(K, b); break;
        case 'brick': brick(K, b); break;
        case 'stage': stage(K, b); break;
        case 'theatre': theatre(K, b); break;
        case 'lowwall': lowWall(K, b); break;
      }
    }
    if (L.district !== 'salta') {
      for (const b of backdrop(L, rnd)) {
        if (L.district === 'liberio') brick(K, b);
        else house(K, b, L.district === 'shiganshina' && hash(b[0], b[2]) < 0.6);
      }
    }
    if (L.district === 'liberio') libProps(K, env, rnd);
    if (L.district === 'salta') saltaProps(K, rnd);
    K.flush(g);
    for (const w of L.walls || []) greatWall(g, w, tick);
    if (L.smoke || L.fires) smoke(g, L, tick);
    if (L.fires) fires(g, L, tick);
    if (L.flares) flares(g, rnd, tick);
    if (L.searchlights) searchlights(g, tick);
    if (L.airship) airship(g, tick);
    if (L.steamClouds) steamClouds(g, rnd, tick);
    if (L.wallTitans) wallTitans(g, tick);
  }

  // Liberio: street lamps along the kerbs and strings of festival flags across the streets.
  function libProps(K, env, rnd) {
    const lamps = [];
    for (let x = -700; x <= 700; x += 90) for (const z of [176, 228, 380, 416]) lamps.push([x, z]);
    for (let z = 30; z <= 530; z += 90) for (const x of [-552, -498, 508, 552, -224, 372]) lamps.push([x, z]);
    for (const [x, z] of lamps) {
      if (groundH(x, z) > 0) continue;
      K.add('cyl', x, 22, z, 1.4, 44, 1.4, '#2a2a30');
      K.add('glowBall', x, 46, z, 4, 4, 4, '#ffe2a0');
    }
    const flagCols = ['#a8232a', '#f4f0e6', '#e8c260', '#2a3a6a'];
    for (const [z, x0, x1] of [[200, -720, 720], [398, -720, 720]]) {
      for (let x = x0; x < x1; x += 14) if (groundH(x, z) === 0) K.add('box', x, 66 - Math.abs(Math.sin(x / 60)) * 8, z, 6, 8, 0.6, flagCols[Math.floor(Math.abs(x) / 14) % 4]);
    }
    // A checkpoint booth and barrier at the internment zone gap.
    K.add('box', -480, 14, 26, 18, 28, 18, '#6a6a60'); K.add('box', -480, 30, 26, 22, 4, 22, '#4a4a44');
    K.add('box', -445, 18, 9, 50, 3, 3, '#e8e2d4', 0, 0, 0.08);
  }

  // Fort Salta: artillery on the plateau; on the east side the footprints and wreckage of the Rumbling.
  function saltaProps(K, rnd) {
    for (const [x, z] of [[-660, 120], [-660, 280], [-660, 440], [-560, 200], [-560, 380]]) {
      K.add('cyl', x, 66 + 12, z, 9, 6, 9, '#3a3330', PI / 2, 0, 0);
      K.add('cyl', x + 22, 66 + 16, z, 4, 44, 4, '#2b2b30', 0, 0, PI / 2 - 0.25);
      K.add('box', x, 66 + 6, z, 30, 6, 22, '#5a4a3a');
    }
    for (let i = 0; i < 14; i++) {
      const x = 800 + rnd() * 2200, z = -300 + rnd() * 1200, s = 1 + rnd();
      K.add('cyl', x, 0.4, z, 60 * s, 0.6, 110 * s, '#2b201a', 0, rnd() * 0.6 - 0.3, 0);
    }
    for (let i = 0; i < 40; i++) {
      const x = 760 + rnd() * 2400, z = -300 + rnd() * 1300, s = 6 + rnd() * 26;
      K.add('rock', x, s * 0.35, z, s * 1.4, s * 0.6, s, ['#4a3a30', '#6a5a4a', '#3a2a24', '#7a6a58'][i % 4], rnd() * 3, rnd() * 3, 0);
    }
    // Flags of the Alliance on the plateau.
    for (const [x, z, c] of [[-700, 60, '#d9483b'], [-700, 500, '#3a6fd9'], [-500, 60, '#f4f0e6']]) {
      K.add('cyl', x, 66 + 40, z, 1.4, 80, 1.4, '#3a3a3a');
      K.add('box', x + 14, 66 + 70, z, 26, 16, 1, c);
    }
  }

  // Smoke columns rising from burning buildings.
  function smoke(g, L, tick) {
    const srcs = (L.smoke || []).map(([x, z]) => [x, 0, z, '#5a5650']).concat((L.fires || []).map(([x, z, h]) => [x, h, z, '#3a3430']));
    const per = 22, mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.38, depthWrite: false }), srcs.length * per);
    srcs.forEach(([, , , c], i) => { for (let k = 0; k < per; k++) mesh.setColorAt(i * per + k, new THREE.Color(c)); });
    g.add(mesh);
    tick.push(clock => {
      srcs.forEach(([x, y, z], i) => {
        for (let k = 0; k < per; k++) {
          const ph = (clock * 0.07 + k / per + i * 0.13) % 1, s = 22 + ph * 90;
          place(mesh, i * per + k, x + ph * ph * 260 + Math.sin(k * 3 + clock * 0.4) * 14, y + 20 + ph * 820, z - ph * 120, s, s * 0.85, s);
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // Flickering fire on rooftops, with a warm light for the nearest few.
  function fires(g, L, tick) {
    const per = 9, list = L.fires;
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), list.length * per);
    for (let i = 0; i < list.length * per; i++) mesh.setColorAt(i, new THREE.Color(['#ffb347', '#ff7a2a', '#ffd166'][i % 3]));
    g.add(mesh);
    const lights = list.slice(0, 3).map(([x, z, h]) => { const l = new THREE.PointLight('#ff8a3a', 1.1, 520, 1.6); l.position.set(x, h + 30, z); g.add(l); return l; });
    tick.push(clock => {
      list.forEach(([x, z, h], i) => {
        for (let k = 0; k < per; k++) {
          const ph = (clock * 1.3 + k / per + i * 0.37) % 1, s = (14 - ph * 10) * (0.8 + 0.4 * Math.sin(clock * 9 + k));
          place(mesh, i * per + k, x + Math.sin(k * 2.1) * 18, h + 6 + ph * 46, z + Math.cos(k * 1.7) * 14, s, s * 1.5, s);
        }
      });
      lights.forEach((l, i) => { l.intensity = 0.9 + Math.sin(clock * 11 + i * 3) * 0.2 + Math.sin(clock * 23 + i) * 0.1; });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // Trost: signal flares (green: go; red: Titans sighted; black: an abnormal) shot from the rooftops, trailing smoke.
  function flares(g, rnd, tick) {
    const slots = Array.from({ length: 5 }, (_, i) => ({ x: -700 + i * 330 + rnd() * 100, z: -220 + rnd() * 160, period: 9 + rnd() * 6, off: rnd() * 10, col: ['#5fc96a', '#d9483b', '#2a2a2a', '#5fc96a', '#d9483b'][i] }));
    const per = 40;
    const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }), slots.length * per);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), slots.length);
    slots.forEach((sl, i) => { heads.setColorAt(i, new THREE.Color(sl.col === '#2a2a2a' ? '#ffffff' : sl.col)); for (let k = 0; k < per; k++) trail.setColorAt(i * per + k, new THREE.Color(sl.col)); });
    g.add(trail, heads);
    tick.push(clock => {
      slots.forEach((sl, i) => {
        const t = ((clock + sl.off) % sl.period) / sl.period, up = Math.min(1, t * 3), y = 60 + up * 640, drift = t * 90;
        place(heads, i, sl.x + drift, y, sl.z, up < 1 ? 6 : 0.01, up < 1 ? 6 : 0.01, up < 1 ? 6 : 0.01);
        for (let k = 0; k < per; k++) {
          const f = k / per, ty = 60 + Math.min(up, f) * 640, age = Math.max(0, t - f / 3), s = f <= up ? (10 + age * 46) * (1 - t * 0.65) : 0.01;
          place(trail, i * per + k, sl.x + drift * f + age * 40, ty, sl.z, s, s, s);
        }
      });
      trail.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
    });
  }

  // Liberio: searchlight beams sweeping the night sky.
  function searchlights(g, tick) {
    const geo = new THREE.ConeGeometry(110, 1600, 16, 1, true); geo.translate(0, -800, 0);
    const mat = new THREE.MeshBasicMaterial({ color: '#dfe8ff', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beams = [[326, 112, 280, 0], [-900, 140, -300, 2], [1000, 130, -260, 4]].map(([x, y, z, ph]) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return [m, ph]; });
    tick.push(clock => { for (const [m, ph] of beams) { m.rotation.set(PI + 0.55 + Math.sin(clock * 0.3 + ph) * 0.25, 0, Math.sin(clock * 0.21 + ph) * 0.7); } });
  }

  // Liberio: the Survey Corps' airship waiting over the rooftops.
  function airship(g, tick) {
    const ship = new THREE.Group();
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), lambert('#c9c4b6')); env.scale.set(260, 70, 74); ship.add(env);
    const gon = new THREE.Mesh(new THREE.BoxGeometry(110, 22, 30), lambert('#4a3a2e')); gon.position.set(0, -82, 0); ship.add(gon);
    for (const sd of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(60, 50, 4), lambert('#9a9486')); fin.position.set(-230, 0, 0); fin.rotation.x = sd > 0 ? 0 : PI / 2; ship.add(fin); }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(5, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe8a0', fog: false })); lamp.position.set(50, -92, 0); ship.add(lamp);
    const props = [];
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2, 40, 6), lambert('#2a2a30')); p.position.set(-70, -82, sd * 24); ship.add(p); props.push(p); }
    ship.position.set(-200, 760, -420);
    g.add(ship);
    tick.push(clock => {
      ship.position.set(-200 + Math.sin(clock * 0.05) * 500, 760 + Math.sin(clock * 0.4) * 12, -420 + Math.cos(clock * 0.05) * 120);
      ship.rotation.y = Math.cos(clock * 0.05) * 0.35;
      for (const p of props) p.rotation.x = clock * 20;
    });
  }

  // The Rumbling: banks of steam rolling in across the trampled ground from the east.
  function steamClouds(g, rnd, tick) {
    const n = 34, mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshLambertMaterial({ color: '#f2ebe4', emissive: '#4a3a34', transparent: true, opacity: 0.34, depthWrite: false }), n);
    const data = Array.from({ length: n }, () => ({ x: rnd() * 3600, y: 10 + rnd() * 170, z: -900 + rnd() * 2000, s: 120 + rnd() * 200, v: 18 + rnd() * 20 }));
    g.add(mesh);
    tick.push(clock => {
      data.forEach((c, i) => {
        const x = 950 + ((c.x - clock * c.v) % 3600 + 3600) % 3600;
        place(mesh, i, x, c.y + Math.sin(clock * 0.3 + i) * 20, c.z, c.s * 1.4, c.s * 0.7, c.s);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  // Colossal Wall Titans marching shoulder to shoulder beyond the field, steaming.
  function wallTitans(g, tick) {
    const n = 16, skin = lambert('#b4574a'), bone = lambert('#e8dcc8');
    const parts = {
      torso: new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.8, 1, 10), skin, n),
      ribs: new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert('#c86a5a'), n * 3),
      head: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), skin, n),
      jaw: new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bone, n),
      limb: new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 0.8, 1, 8), skin, n * 4),
      steam: new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial({ color: '#f2ece6', transparent: true, opacity: 0.5, depthWrite: false }), n * 8),
    };
    for (const m of Object.values(parts)) g.add(m);
    const T = Array.from({ length: n }, (_, i) => ({ x0: -600 + (i * 977) % 4200, z: -4600 + i * 190 + (i % 3) * 70, ph: i * 1.3, s: 0.75 + ((i * 7) % 5) / 16 }));
    const e = new THREE.Euler(), put = (m, k, x, y, z, sx, sy, sz, rx = 0, rz = 0) => { tmpQ.setFromEuler(e.set(rx, 0, rz)); m.setMatrixAt(k, tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz))); };
    tick.push(clock => {
      T.forEach((t, i) => {
        const S = 440 * t.s, x = -1200 + ((t.x0 - clock * 9 + 1200) % 4800 + 4800) % 4800, step = clock * 0.9 + t.ph, bob = Math.abs(Math.sin(step)) * 0.04 * S;
        const hip = 0.95 * S + bob, sw = Math.sin(step) * 0.35;
        for (const sd of [0, 1]) {
          const a = sd ? sw : -sw;
          put(parts.limb, i * 4 + sd, x - Math.sin(a) * 0.45 * S, hip - 0.47 * S, t.z + (sd ? 0.22 : -0.22) * S, 0.14 * S, 0.95 * S, 0.14 * S, 0, a);
          put(parts.limb, i * 4 + 2 + sd, x + Math.sin(a) * 0.35 * S, hip + 0.55 * S, t.z + (sd ? 0.36 : -0.36) * S, 0.09 * S, 0.8 * S, 0.09 * S, 0, -a * 0.8);
        }
        put(parts.torso, i, x, hip + 0.52 * S, t.z, 0.26 * S, 1.05 * S, 0.3 * S);
        for (let k = 0; k < 3; k++) put(parts.ribs, i * 3 + k, x - 0.24 * S, hip + (0.6 + k * 0.16) * S, t.z, 0.04 * S, 0.03 * S, 0.5 * S);
        put(parts.head, i, x, hip + 1.2 * S, t.z, 0.2 * S, 0.22 * S, 0.19 * S);
        put(parts.jaw, i, x - 0.18 * S, hip + 1.12 * S, t.z, 0.06 * S, 0.06 * S, 0.24 * S);
        for (let k = 0; k < 8; k++) {
          const ph = (clock * 0.12 + k / 8 + i * 0.07) % 1, sc = (0.08 + ph * 0.22) * S;
          put(parts.steam, i * 8 + k, x + Math.sin(k * 2.4) * 0.3 * S, hip + (0.9 + ph * 1.1) * S, t.z + Math.cos(k * 1.9) * 0.3 * S, sc, sc * 0.8, sc);
        }
      });
      for (const m of Object.values(parts)) m.instanceMatrix.needsUpdate = true;
    });
  }

  return { build };
})();
