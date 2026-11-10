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
    scenery(g, L, rnd, tick);
    hills(g, L, rnd);
    clouds(g, L, rnd, tick);
    weather(g, L, rnd, tick);
    scene.add(g);
    scene.background = new THREE.Color(L.horizon);
    scene.fog = new THREE.Fog(L.horizon, L.fog[0], L.fog[1]);
    return {
      update: clock => { for (const f of tick) f(clock); },
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
    sun.position.set(-700, 1500, FIELD_Z / 2 + 900);
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
  function scenery(g, L, rnd, tick) {
    const spots = [];
    while (spots.length < 110) {
      const a = rnd() * TAU, d = 1100 + rnd() * 2200;
      const x = Math.cos(a) * d * 1.3, z = FIELD_Z / 2 + Math.sin(a) * d;
      if (Math.abs(x) < FIELD_X + 260 && z > -300 && z < FIELD_Z + 300) continue;
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

  return { build };
})();
