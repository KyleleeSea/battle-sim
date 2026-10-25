'use strict';
// The 3D stage: renderer, lights, scenery, the orbiting camera, ground picking and unit portraits.

const View = (() => {
  let renderer, scene, camera, painter, ghost, clouds, sized = false;
  const zones = [], cloudData = [];
  const cam = { tx: 0, ty: 20, tz: FIELD_Z / 2, theta: 0, phi: 1, dist: 1300, auto: false };
  let W0 = 1, H0 = 1, insetTop = 0, insetBottom = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
  const HORIZON = '#cfe9f3';

  function init(canvas) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(HORIZON);
    scene.fog = new THREE.Fog(HORIZON, 2800, 8000);
    camera = new THREE.PerspectiveCamera(40, 1, 5, 14000);
    buildLights(); buildSky(); buildGround(); buildScenery(); buildZones(); buildGhost();
    painter = new Painter(scene, 700);
    painter.camQ = camera.quaternion;
    return true;
  }

  function buildLights() {
    scene.add(new THREE.HemisphereLight('#e4f3ff', '#6f8f45', 0.78));
    const sun = new THREE.DirectionalLight('#fff4e0', 0.78);
    sun.position.set(-700, 1500, FIELD_Z / 2 + 900);
    sun.target.position.set(0, 0, FIELD_Z / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -1050; sc.right = 1050; sc.top = 850; sc.bottom = -850; sc.near = 300; sc.far = 4200;
    sun.shadow.bias = -0.0006;
    scene.add(sun, sun.target);
  }

  function buildSky() {
    const g = new THREE.SphereGeometry(9000, 24, 14), pos = g.attributes.position, cols = [];
    const top = new THREE.Color('#5aa6df'), low = new THREE.Color(HORIZON);
    for (let i = 0; i < pos.count; i++) {
      const c = low.clone().lerp(top, clamp(pos.getY(i) / 9000 * 1.8, 0, 1));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
  }

  function buildGround() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(18000, 18000), new THREE.MeshLambertMaterial({ color: '#7db250' }));
    ground.rotation.x = -PI / 2; ground.receiveShadow = true;
    scene.add(ground);
    const c = document.createElement('canvas'); c.width = 512; c.height = 8;
    const x = c.getContext('2d');
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#97cb66' : '#88bf59'; x.fillRect(i * 32, 0, 32, 8); }
    const field = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_X * 2 + 180, FIELD_Z + 180), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) }));
    field.rotation.x = -PI / 2; field.position.set(0, 0.4, FIELD_Z / 2); field.receiveShadow = true;
    scene.add(field);
  }

  function buildScenery() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const spots = [];
    while (spots.length < 110) {
      const a = rnd() * TAU, d = 1100 + rnd() * 2200;
      const x = Math.cos(a) * d * 1.3, z = FIELD_Z / 2 + Math.sin(a) * d;
      if (Math.abs(x) < FIELD_X + 260 && z > -300 && z < FIELD_Z + 300) continue;
      spots.push([x, z, 0.7 + rnd() * 0.9]);
    }
    const n = spots.length;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.3, 1, 6), new THREE.MeshLambertMaterial({ color: '#7a5534' }), n);
    const coneGeo = new THREE.ConeGeometry(1, 1, 7); coneGeo.translate(0, 0.5, 0);
    const low = new THREE.InstancedMesh(coneGeo, new THREE.MeshLambertMaterial({ color: '#4c8a39' }), n);
    const high = new THREE.InstancedMesh(coneGeo, new THREE.MeshLambertMaterial({ color: '#5e9f46' }), n);
    spots.forEach(([x, z, s], i) => {
      tmpQ.identity();
      trunk.setMatrixAt(i, tmpM.compose(tmpP.set(x, 18 * s, z), tmpQ, tmpS.set(6 * s, 36 * s, 6 * s)));
      low.setMatrixAt(i, tmpM.compose(tmpP.set(x, 28 * s, z), tmpQ, tmpS.set(36 * s, 80 * s, 36 * s)));
      high.setMatrixAt(i, tmpM.compose(tmpP.set(x, 70 * s, z), tmpQ, tmpS.set(26 * s, 64 * s, 26 * s)));
    });
    for (const m of [trunk, low, high]) { m.castShadow = true; scene.add(m); }

    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: '#a19c92' }), 36);
    for (let i = 0; i < 36; i++) {
      const side = i % 2 ? 1 : -1, x = side * (FIELD_X + 140 + rnd() * 500), z = -200 + rnd() * (FIELD_Z + 400), s = 8 + rnd() * 16;
      tmpQ.setFromAxisAngle(_Y, rnd() * TAU);
      rocks.setMatrixAt(i, tmpM.compose(tmpP.set(x, s * 0.3, z), tmpQ, tmpS.set(s, s * 0.7, s * 1.2)));
    }
    rocks.castShadow = true; scene.add(rocks);

    const hillGeo = new THREE.SphereGeometry(1, 24, 12);
    const hillMats = [new THREE.MeshLambertMaterial({ color: '#8fbf7a' }), new THREE.MeshLambertMaterial({ color: '#a7cba0' })];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + 0.3, d = 5600 + rnd() * 1400;
      const hill = new THREE.Mesh(hillGeo, hillMats[i % 2]);
      hill.position.set(Math.cos(a) * d, -150, FIELD_Z / 2 + Math.sin(a) * d);
      hill.scale.set(1500 + rnd() * 900, 450 + rnd() * 450, 1300 + rnd() * 700);
      scene.add(hill);
    }

    clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }), 60);
    for (let i = 0; i < 12; i++) cloudData.push({ x: -5000 + rnd() * 10000, y: 1600 + rnd() * 900, z: -4000 + rnd() * 6000, s: 120 + rnd() * 140, v: 6 + rnd() * 8 });
    scene.add(clouds);
  }

  function labelTexture(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const tex = new THREE.CanvasTexture(c);
    const draw = () => {
      const x = c.getContext('2d');
      x.clearRect(0, 0, 512, 128);
      x.font = '84px "Lilita One", "Arial Rounded MT Bold", sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff';
      x.fillText(text, 256, 66);
      tex.needsUpdate = true;
    };
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    return tex;
  }

  function buildZones() {
    for (const team of [0, 1]) {
      const x0 = team === 0 ? -FIELD_X : ZONE_GAP, x1 = team === 0 ? -ZONE_GAP : FIELD_X;
      const g = new THREE.Group();
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, FIELD_Z), new THREE.MeshBasicMaterial({ color: TEAM[team].main, transparent: true, opacity: 0.16, depthWrite: false }));
      fill.rotation.x = -PI / 2; fill.position.set((x0 + x1) / 2, 1, FIELD_Z / 2);
      const corners = [[x0, 0], [x1, 0], [x1, FIELD_Z], [x0, FIELD_Z], [x0, 0]].map(([x, z]) => new THREE.Vector3(x, 1.6, z));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(corners), new THREE.LineDashedMaterial({ color: TEAM[team].dark, dashSize: 16, gapSize: 10, transparent: true }));
      line.computeLineDistances();
      const label = new THREE.Mesh(new THREE.PlaneGeometry(280, 70), new THREE.MeshBasicMaterial({ map: labelTexture(team === 0 ? 'RED ARMY' : 'BLUE ARMY'), transparent: true, depthWrite: false, opacity: 0.6 }));
      label.rotation.x = -PI / 2; label.position.set((x0 + x1) / 2, 2, FIELD_Z - 55);
      g.add(fill, line, label);
      scene.add(g);
      zones.push({ g, fill, line, label });
    }
  }

  function buildGhost() {
    ghost = new THREE.Mesh(new THREE.RingGeometry(0.74, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    ghost.rotation.x = -PI / 2;
    scene.add(ghost);
  }

  // ---------- camera ----------
  function fitDist() {
    const vfov = camera.fov * PI / 180, aspect = W0 / Math.max(1, H0);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    return clamp((FIELD_X + 60) / Math.tan(hfov / 2), 700, 5200);
  }
  function resetView() {
    cam.tx = 0; cam.ty = 20; cam.tz = FIELD_Z / 2 + 30; cam.theta = 0; cam.phi = 1.08; cam.dist = fitDist() * 0.82;
  }
  function rotate(dx, dy) {
    cam.theta -= dx * 0.006;
    cam.phi = clamp(cam.phi - dy * 0.005, 0.22, 1.45);
  }
  function pan(dx, dy) {
    const k = cam.dist * 0.0013, c = Math.cos(cam.theta), s = Math.sin(cam.theta);
    cam.tx += -dx * k * c - dy * k * s;
    cam.tz += dx * k * s - dy * k * c;
    cam.tx = clamp(cam.tx, -FIELD_X - 700, FIELD_X + 700);
    cam.tz = clamp(cam.tz, -700, FIELD_Z + 700);
  }
  function zoom(f) { cam.dist = clamp(cam.dist * f, 200, 6000); }
  function setAuto(on) { cam.auto = on; }

  function placeCamera(shake) {
    if (cam.auto) cam.theta += 0.0018;
    const sp = Math.sin(cam.phi);
    camera.position.set(cam.tx + cam.dist * sp * Math.sin(cam.theta), cam.ty + cam.dist * Math.cos(cam.phi), cam.tz + cam.dist * sp * Math.cos(cam.theta));
    if (shake) camera.position.add(tmpP.set(rand(-shake, shake), rand(-shake, shake), rand(-shake, shake)));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
  }

  function resize(w, h, top, bottom) {
    W0 = w; H0 = h; insetTop = top; insetBottom = bottom;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.setViewOffset(w, h, 0, (bottom - top) / 2, w, h);
    camera.updateProjectionMatrix();
    if (!sized) { sized = true; resetView(); }
  }

  function pick(sx, sy) {
    ndc.set(sx / W0 * 2 - 1, -(sy / H0) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(groundPlane, hit) ? { x: hit.x, z: hit.z } : null;
  }

  // ---------- frame ----------
  function render(W, ui) {
    placeCamera(W.shake > 0 && !ui.reducedMotion ? W.shake * 1.5 : 0);
    zones.forEach((z, team) => {
      z.g.visible = ui.placing;
      const on = ui.editable[team];
      z.fill.material.opacity = on ? 0.17 : 0.06;
      z.line.material.opacity = on ? 0.9 : 0.35;
      z.label.material.opacity = on ? 0.65 : 0.25;
    });
    for (const u of W.units) painter.unit(u);
    for (const p of W.projs) painter.proj(p);
    painter.effects(W);
    painter.end();

    const g = ui.ghost;
    ghost.visible = !!g;
    if (g) {
      const r = g.erase ? 26 : 12 * TYPES[g.key].S * Math.sqrt(TYPES[g.key].fat || 1);
      ghost.position.set(g.x, 2.2, g.z);
      ghost.scale.set(r, r, r);
      ghost.material.color.set(g.erase ? '#ffffff' : g.ok ? TEAM[g.team].dark : '#2a2433');
      ghost.material.opacity = g.ok || g.erase ? 0.9 : 0.4;
    }

    cloudData.forEach((c, i) => {
      const x = ((c.x + ui.clock * c.v + 6000) % 12000) - 6000;
      for (let k = 0; k < 5; k++) {
        const s = c.s * (k === 2 ? 1.25 : 0.8 + (k % 2) * 0.15);
        clouds.setMatrixAt(i * 5 + k, tmpM.compose(tmpP.set(x + (k - 2) * c.s * 0.9, c.y + (k === 2 ? c.s * 0.3 : 0), c.z + (k % 2 ? 40 : -30)), tmpQ.identity(), tmpS.set(s, s * 0.6, s * 0.8)));
      }
    });
    clouds.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }

  // ---------- portraits ----------
  let pScene, pCam, pPainter, rt, buf;
  function portrait(canvas, key) {
    if (!pScene) {
      pScene = new THREE.Scene();
      pScene.add(new THREE.HemisphereLight('#ffffff', '#8a7f6a', 0.95));
      const l = new THREE.DirectionalLight('#ffffff', 0.55); l.position.set(1, 2, 2); pScene.add(l);
      pPainter = new Painter(pScene, 2);
      pCam = new THREE.PerspectiveCamera(30, 1, 1, 3000);
      pPainter.camQ = pCam.quaternion;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round((canvas.clientWidth || 66) * dpr), h = Math.round((canvas.clientHeight || 54) * dpr);
    canvas.width = w; canvas.height = h;
    if (!rt || rt.width !== w || rt.height !== h) { rt = new THREE.WebGLRenderTarget(w, h); buf = new Uint8Array(w * h * 4); }
    const savedRng = rngState, savedId = NEXT_ID;
    const u = new Unit(key, 0, 0, 0);
    rngState = savedRng; NEXT_ID = savedId;
    const fake = { units: [u], projs: [], parts: [], flashes: [], bolts: [], beams: [], time: 0, over: false, lost: [0, 0], shake: 0 };
    for (let i = 0; i < 60; i++) { updateUnit(u, fake, false); stepBody(u.body); }
    pPainter.unit(u); pPainter.end();
    const S = u.S, c = u.body.pts[J.CHEST];
    pCam.aspect = w / h; pCam.updateProjectionMatrix();
    pCam.position.set(c.x + 100 * S, c.y + 28 * S, c.z + 125 * S);
    pCam.lookAt(c.x + 4 * S, c.y - 7 * S, c.z);
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(pScene, pCam);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
  }

  return { init, resize, render, pick, rotate, pan, zoom, resetView, setAuto, portrait, isAuto: () => cam.auto };
})();
