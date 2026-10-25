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
    scenery(g, L, rnd);
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
    } else mat = lambert(L.ground);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(18000, 18000), mat);
    plane.rotation.x = -PI / 2; plane.receiveShadow = !L.lavaGround;
    g.add(plane);

    // The field: mown stripes, plus ice cracks or moon dust where the map has them.
    const tex = canvas(512, 256, (x, w, h) => {
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
  function scenery(g, L, rnd) {
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
        const a = rnd() * TAU, e = Math.asin(rnd()) * 0.98, r = 8500;
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
