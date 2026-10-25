'use strict';
// The 3D stage: renderer, lights, scenery, the orbiting camera, ground picking and unit portraits.

const View = (() => {
  let renderer, scene, camera, painter, ghost, world = null, mapId = null, sized = false;
  const zones = [];
  const cam = { tx: 0, ty: 20, tz: FIELD_Z / 2, theta: 0, phi: 1, dist: 1300, auto: false };
  let W0 = 1, H0 = 1, insetTop = 0, insetBottom = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const tmpM = new THREE.Matrix4(), tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();

  function init(canvas) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 5, 14000);
    buildZones(); buildGhost();
    setMap('meadow');
    painter = new Painter(scene, 700);
    painter.camQ = camera.quaternion;
    return true;
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

  // Swaps the scenery, sky and lighting for another map.
  function setMap(id) {
    if (id === mapId) return;
    if (world) world.dispose();
    world = World.build(scene, id);
    mapId = id;
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
  // `tall`: height of the tallest unit on the field, so a 50 m Ultraman fits in the frame.
  function resetView(tall) {
    cam.tx = 0; cam.ty = 20; cam.tz = FIELD_Z / 2 + 30; cam.theta = 0; cam.phi = 1.08; cam.dist = fitDist() * 0.82;
    if (tall > 300) { cam.ty = tall * 0.38; cam.phi = 1.25; cam.dist = Math.min(8000, Math.max(cam.dist, tall * 2.1)); }
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
  function zoom(f) { cam.dist = clamp(cam.dist * f, 200, 8000); }
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

    world.update(ui.clock);
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
    const fake = { units: [u], projs: [], parts: [], flashes: [], bolts: [], beams: [], hazards: [], callouts: [], time: 0, over: false, lost: [0, 0], shake: 0 };
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

  return { init, resize, render, pick, rotate, pan, zoom, resetView, setAuto, setMap, portrait, isAuto: () => cam.auto };
})();
