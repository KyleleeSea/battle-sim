'use strict';
// Game state, deployment, the main loop and the page's controls.

const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('en-US');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SFX = (() => {
  let ac = null, out = null, noiseBuf = null, muted = false;
  const last = {};
  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      out = ac.createGain(); out.gain.value = 0.5; out.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function noise(dur, type, freq, gain) {
    const t = ac.currentTime, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(out); src.start(t, Math.random() * 0.5); src.stop(t + dur);
  }
  function tone(f0, f1, dur, type, gain) {
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur);
  }
  const bank = {
    hit: () => noise(0.09, 'bandpass', 1100 + Math.random() * 500, 0.35),
    clank: () => { tone(1800, 1200, 0.08, 'square', 0.05); noise(0.06, 'highpass', 3000, 0.2); },
    thud: () => noise(0.22, 'lowpass', 260, 0.7),
    thunk: () => noise(0.05, 'bandpass', 700, 0.25),
    twang: () => tone(620, 240, 0.12, 'triangle', 0.08),
    whoosh: () => noise(0.25, 'bandpass', 600, 0.15),
    boom: () => { noise(0.7, 'lowpass', 380, 0.9); tone(90, 40, 0.5, 'sine', 0.4); },
    horn: () => { tone(196, 200, 0.9, 'sawtooth', 0.07); tone(294, 300, 0.9, 'sawtooth', 0.04); },
    click: () => tone(900, 600, 0.04, 'square', 0.03),
    tick: () => tone(660, 660, 0.12, 'square', 0.05),
  };
  return {
    unlock() { init(); if (ac && ac.state === 'suspended') ac.resume(); },
    play(name) {
      if (muted || !ac || ac.state !== 'running' || G.fastForward) return;
      const now = performance.now();
      if (now - (last[name] || 0) < 45) return;
      last[name] = now;
      try { bank[name](); } catch (e) { /* audio is optional */ }
    },
    toggle() { muted = !muted; return muted; },
  };
})();

const W = { units: [], projs: [], parts: [], flashes: [], bolts: [], beams: [], time: 0, state: 'place', over: false, winner: -1, shake: 0, lost: [0, 0], total: [0, 0], battleTime: 0, endT: 0 };

const G = {
  mode: 'sandbox',            // 'sandbox' or 'online'
  armies: [[], []],           // per team: [{key, x, z}] with whole-number positions
  budgets: [2000, 5000, 10000, Infinity], budgetIdx: 1,
  tool: 'peasant', slow: false, clock: 0,
  editable: [true, true],
  countdown: null, bannerShown: false, fastForward: false,
};

const budgetNow = () => G.budgets[G.budgetIdx];
const spent = team => G.armies[team].reduce((s, a) => s + TYPES[a.key].cost, 0);
const teamAt = x => (x < -ZONE_GAP ? 0 : x > ZONE_GAP ? 1 : -1);
const inField = (x, z) => Math.abs(x) <= FIELD_X - 12 && z >= 12 && z <= FIELD_Z - 12;

// ---------- armies ----------
function encodeArmy(list) {
  return list.map(a => String.fromCharCode(97 + ORDER.indexOf(a.key)) + (a.x + 800).toString(36).padStart(3, '0') + a.z.toString(36).padStart(2, '0')).join('');
}

// Turns any string into a legal army for `team`. Both players run this on both armies, so it must be deterministic.
function decodeArmy(str, team, budget) {
  const out = [];
  if (typeof str !== 'string') return out;
  let cost = 0;
  for (let i = 0; i + 6 <= str.length && out.length < 300; i += 6) {
    const key = ORDER[str.charCodeAt(i) - 97];
    const x = parseInt(str.slice(i + 1, i + 4), 36) - 800, z = parseInt(str.slice(i + 4, i + 6), 36);
    if (!key || !Number.isFinite(x) || !Number.isFinite(z) || teamAt(x) !== team || !inField(x, z)) continue;
    if (cost + TYPES[key].cost > budget) break;
    cost += TYPES[key].cost;
    out.push({ key, x, z });
  }
  return out;
}

function block(list, key, team, cols, rows, front, gap) {
  const sign = team === 0 ? -1 : 1, gz = Math.min(gap * 0.9, (FIELD_Z - 50) / Math.max(1, rows - 1));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      list.push({ key, x: Math.round(sign * (front + c * gap + (r % 2) * gap * 0.3)), z: Math.round(FIELD_Z / 2 + (r - (rows - 1) / 2) * gz) });
    }
  }
}

const PRESETS = {
  mob:     { name: 'Peasant mob', build: (L, t) => { block(L, 'peasant', t, 5, 10, 110, 24); block(L, 'archer', t, 1, 8, 260, 30); block(L, 'wizard', t, 1, 2, 330, 90); } },
  giants:  { name: 'Two giants', build: (L, t) => { block(L, 'hoplite', t, 1, 6, 110, 34); block(L, 'giant', t, 1, 2, 190, 140); block(L, 'archer', t, 1, 6, 330, 34); } },
  wall:    { name: 'Shield wall', build: (L, t) => { block(L, 'hoplite', t, 2, 8, 110, 30); block(L, 'archer', t, 1, 10, 210, 28); } },
  rush:    { name: 'Berserker rush', build: (L, t) => { block(L, 'berserker', t, 2, 6, 120, 34); block(L, 'thrower', t, 1, 4, 300, 60); } },
  archers: { name: 'Archer line', build: (L, t) => { block(L, 'squire', t, 1, 10, 110, 28); block(L, 'archer', t, 2, 10, 190, 28); } },
  magic:   { name: 'Wizard school', build: (L, t) => { block(L, 'squire', t, 1, 8, 110, 32); block(L, 'peasant', t, 2, 10, 150, 24); block(L, 'wizard', t, 1, 6, 260, 44); } },
  knights: { name: 'Knights and muskets', build: (L, t) => { block(L, 'knight', t, 1, 6, 120, 40); block(L, 'musketeer', t, 1, 10, 230, 34); } },
  clan:    { name: 'Ninja clan', build: (L, t) => { block(L, 'ninja', t, 1, 8, 110, 36); block(L, 'bomber', t, 1, 6, 220, 44); block(L, 'healer', t, 1, 2, 300, 80); } },
  stable:  { name: 'Sumo stable', build: (L, t) => { block(L, 'sumo', t, 1, 4, 130, 70); block(L, 'healer', t, 1, 4, 230, 50); block(L, 'archer', t, 1, 8, 300, 36); } },
  storm:   { name: 'Storm front', build: (L, t) => { block(L, 'squire', t, 1, 10, 110, 30); block(L, 'musketeer', t, 1, 6, 200, 40); block(L, 'storm', t, 1, 4, 280, 60); block(L, 'healer', t, 1, 3, 340, 70); } },
};
const SCENARIOS = {
  uprising: { name: 'Farmers vs Giants', sides: ['mob', 'giants'] },
  wall:     { name: 'Shield wall vs Berserkers', sides: ['wall', 'rush'] },
  archers:  { name: 'Archer duel', sides: ['archers', 'archers'] },
  magic:    { name: 'Wizard chaos', sides: ['magic', 'mob'] },
  ninjas:   { name: 'Ninjas vs Knights', sides: ['clan', 'knights'] },
  sumo:     { name: 'Sumo vs Storm', sides: ['stable', 'storm'] },
};

function presetArmy(key, team) {
  const L = [];
  PRESETS[key].build(L, team);
  return decodeArmy(encodeArmy(L.filter(a => inField(a.x, a.z))), team, budgetNow());
}

// Replaces one side's deployment and its standing units.
function setArmy(team, list) {
  G.armies[team] = list;
  if (W.state !== 'place') return;
  W.units = W.units.filter(u => u.team !== team);
  for (const a of list) W.units.push(new Unit(a.key, team, a.x, a.z));
}

function armyChanged(team) {
  hud();
  if (G.mode === 'online') Net.armyChanged(team);
}

function placeAt(team, key, x, z) {
  x = Math.round(x); z = Math.round(z);
  if (!inField(x, z) || teamAt(x) !== team) return false;
  if (spent(team) + TYPES[key].cost > budgetNow()) { toast(`${TEAM[team].name} is out of gold.`); return false; }
  G.armies[team].push({ key, x, z });
  W.units.push(new Unit(key, team, x, z));
  SFX.play('click');
  armyChanged(team);
  return true;
}

function eraseAt(x, z, r) {
  for (const team of [0, 1]) {
    if (!G.editable[team]) continue;
    const keep = G.armies[team].filter(a => (a.x - x) ** 2 + (a.z - z) ** 2 > r * r);
    if (keep.length !== G.armies[team].length) { setArmy(team, keep); armyChanged(team); }
  }
}

// ---------- battle flow ----------
function startBattle(seed) {
  NEXT_ID = 1; seedRng(seed);
  W.units = [];
  for (const team of [0, 1]) for (const a of G.armies[team]) W.units.push(new Unit(a.key, team, a.x, a.z));
  W.projs = []; W.parts = []; W.flashes = []; W.bolts = []; W.beams = []; W.lost = [0, 0];
  W.total = [G.armies[0].length, G.armies[1].length];
  W.time = 0; W.battleTime = 0; W.state = 'battle'; W.over = false; W.winner = -1; W.endT = 0;
  G.bannerShown = false; hideBanner(); hover = null;
  SFX.play('horn'); hud();
}

function backToDeploy() {
  W.state = 'place'; W.over = false; W.projs = []; W.parts = []; W.flashes = []; W.bolts = []; W.beams = [];
  W.units = [];
  setArmy(0, G.armies[0]); setArmy(1, G.armies[1]);
  G.bannerShown = false; hideBanner(); hud();
}

function step() {
  const active = W.state === 'battle' || W.state === 'over';
  W.time += DT;
  for (const u of W.units) updateUnit(u, W, active);
  separate(W.units);
  for (const u of W.units) stepBody(u.body);
  updateProjectiles(W);
  updateParticles(W);
  if (W.shake > 0) W.shake = Math.max(0, W.shake - DT * 30);
  if (W.state === 'battle') { W.battleTime += DT; checkWin(); }
}

function checkWin() {
  const alive = [0, 0];
  for (const u of W.units) if (u.alive) alive[u.team]++;
  if (alive[0] && alive[1] && W.battleTime < 240) return;
  W.state = 'over'; W.over = true; W.endT = W.time;
  W.winner = alive[0] === alive[1] ? -1 : alive[0] > alive[1] ? 0 : 1;
  if (G.mode === 'online') Net.battleEnded(W.winner);
}

// Replays a battle forward without drawing, for someone arriving after it started.
function fastForward(steps) {
  G.fastForward = true;
  for (let i = 0; i < steps && W.state === 'battle'; i++) step();
  G.fastForward = false;
}

function fightPressed() {
  SFX.unlock();
  if (G.mode === 'online') { Net.fightPressed(); return; }
  if (W.state === 'place') {
    if (!G.armies[0].length || !G.armies[1].length) { toast('Place at least one unit on each side.'); return; }
    startBattle((Math.random() * 4294967296) >>> 0);
  } else backToDeploy();
}

// ---------- page chrome ----------
let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

function showBanner() {
  G.bannerShown = true;
  const w = W.winner, seat = G.mode === 'online' ? Net.seat() : null;
  const title = $('bannerTitle');
  title.className = w === 0 ? 'red' : w === 1 ? 'blue' : '';
  if (seat !== null) title.textContent = w === -1 ? 'Draw' : w === seat ? 'You win!' : 'You lose';
  else title.textContent = w === -1 ? 'Nobody wins' : `${TEAM[w].name} wins!`;
  $('bannerStats').textContent = `Red lost ${W.lost[0]} of ${W.total[0]} \u00b7 Blue lost ${W.lost[1]} of ${W.total[1]} \u00b7 ${Math.round(W.endT)} s`;
  $('againBtn').textContent = G.mode === 'online' ? 'Next round' : 'Rewind battle';
  $('banner').hidden = false;
}
function hideBanner() { $('banner').hidden = true; }

function canEdit() {
  return W.state === 'place' && !G.countdown && (G.mode === 'sandbox' || Net.canEdit());
}

function hud() {
  const budget = budgetNow();
  for (const team of [0, 1]) {
    const n = G.armies[team].length;
    let alive = 0;
    for (const u of W.units) if (u.team === team && u.alive) alive++;
    $(`count${team}`).textContent = W.state === 'place' ? `${n} unit${n === 1 ? '' : 's'}` : `${alive} of ${W.total[team]} standing`;
    $(`gold${team}`).textContent = W.state === 'place' ? `${fmt(spent(team))} / ${budget === Infinity ? 'no limit' : fmt(budget)}` : `${W.lost[team]} down`;
  }
  const c = G.mode === 'online' ? Net.controls() : W.state === 'place'
    ? { label: 'Fight!', sub: 'or press Space', disabled: false, ready: false }
    : { label: 'Rewind', sub: 'back to deployment', disabled: false, ready: false };
  $('fightLabel').textContent = c.label; $('fightSub').textContent = c.sub;
  $('fightBtn').disabled = c.disabled; $('fightBtn').classList.toggle('is-ready', !!c.ready);
  const edit = canEdit();
  $('dock').classList.toggle('locked', !edit);
  $('clearBtn').disabled = !edit; $('presetSel').disabled = !edit;
  $('budgetBtn').disabled = !edit || (G.mode === 'online' && !Net.isHost());
  $('budgetBtn').textContent = `Budget ${budget === Infinity ? '\u221e' : fmt(budget)}`;
  $('hint').hidden = !edit;
}

function selectTool(key) {
  G.tool = key;
  for (const b of document.querySelectorAll('.card')) b.setAttribute('aria-pressed', String(b.dataset.key === key));
  const t = TYPES[key];
  $('hintUnit').textContent = t ? `${t.name}: ${t.cost} gold, ${t.hp} HP. ${t.blurb}` : 'Eraser: click or drag over units to send them home.';
}

function initTray() {
  const tray = $('tray');
  ORDER.concat('erase').forEach((key, i) => {
    const b = document.createElement('button');
    b.className = 'card'; b.dataset.key = key; b.type = 'button';
    const t = TYPES[key];
    b.innerHTML = `<canvas class="portrait" aria-hidden="true"></canvas><span class="card-name"></span><span class="card-cost"></span>`;
    b.querySelector('.card-name').textContent = t ? t.name : 'Eraser';
    b.querySelector('.card-cost').textContent = t ? `${t.cost}` : 'free';
    b.title = t ? `${t.name} (${i + 1}): ${t.blurb}` : 'Eraser (E)';
    b.addEventListener('click', () => { SFX.unlock(); selectTool(key); });
    tray.appendChild(b);
    const cv2 = b.querySelector('canvas');
    if (t) requestAnimationFrame(() => View.portrait(cv2, key));
    else drawEraser(cv2);
  });
}

function drawEraser(c) {
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth || 64, h = c.clientHeight || 56;
  c.width = w * dpr; c.height = h * dpr;
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.translate(w / 2, h / 2); x.rotate(-0.5);
  x.fillStyle = "#f08072"; x.strokeStyle = PAL.ink; x.lineWidth = 2;
  x.beginPath(); x.roundRect(-16, -9, 32, 18, 4); x.fill(); x.stroke();
  x.fillStyle = '#fbf3e2'; x.beginPath(); x.roundRect(4, -9, 12, 18, [0, 4, 4, 0]); x.fill(); x.stroke();
}

function fillPresetSelect() {
  const sel = $('presetSel');
  sel.innerHTML = '';
  const add = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; sel.appendChild(o); };
  if (G.mode === 'sandbox') {
    add('', 'Load a battle\u2026');
    for (const [k, s] of Object.entries(SCENARIOS)) add('s:' + k, s.name);
  } else add('', 'Load an army\u2026');
  for (const [k, p] of Object.entries(PRESETS)) add('p:' + k, (G.mode === 'sandbox' ? 'Both sides: ' : '') + p.name);
}

function loadPreset(v) {
  if (!v) return;
  const [kind, key] = v.split(':');
  if (kind === 's') {
    const s = SCENARIOS[key];
    setArmy(0, presetArmy(s.sides[0], 0)); setArmy(1, presetArmy(s.sides[1], 1));
    armyChanged(0); armyChanged(1);
  } else {
    for (const team of [0, 1]) if (G.editable[team]) { setArmy(team, presetArmy(key, team)); armyChanged(team); }
  }
}

// ---------- canvas, input, loop ----------
const cv = $('cv');
const touches = new Map();
let drag = null, hover = null;

function resize() {
  const r = cv.getBoundingClientRect();
  const top = $('topbar').getBoundingClientRect().bottom - r.top;
  const bottom = r.bottom - $('dock').getBoundingClientRect().top;
  View.resize(r.width, r.height, top + 6, bottom + 6);
}

function canvasPt(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

function applyTool(sx, sy, erase) {
  const g = View.pick(sx, sy);
  if (!g) return;
  const { x, z } = g;
  if (erase) { eraseAt(x, z, 26); return; }
  const team = teamAt(x);
  if (team < 0 || !inField(x, z)) return;
  if (!G.editable[team]) { if (!drag || !drag.warned) toast(`That's ${TEAM[team].name}'s side.`); if (drag) drag.warned = true; return; }
  const gap = 18 * TYPES[G.tool].S * Math.sqrt(TYPES[G.tool].fat || 1);
  if (drag && drag.last && (drag.last.x - x) ** 2 + (drag.last.z - z) ** 2 < gap * gap) return;
  if (placeAt(team, G.tool, x, z) && drag) drag.last = { x, z };
}

function updateHover(sx, sy) {
  const g = View.pick(sx, sy);
  if (!g) { hover = null; return; }
  const team = teamAt(g.x);
  hover = { x: g.x, z: g.z, key: G.tool, team: Math.max(0, team), erase: G.tool === 'erase', ok: team >= 0 && inField(g.x, g.z) && G.editable[team] };
}

function pinchInfo() {
  const [a, b] = [...touches.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}

// Left drag paints units while deploying and turns the camera during a battle. Right drag turns the camera
// (a right click without dragging removes units). Shift or middle drag pans. Two fingers pinch and pan.
cv.addEventListener('pointerdown', e => {
  SFX.unlock();
  cv.setPointerCapture(e.pointerId);
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) { drag = { mode: 'pinch', ...pinchInfo() }; return; }
  if (touches.size > 2) return;
  const [sx, sy] = canvasPt(e);
  const base = { x: e.clientX, y: e.clientY, sx, sy, moved: 0, last: null };
  if (e.button === 1 || (e.button === 0 && e.shiftKey)) drag = { ...base, mode: 'pan' };
  else if (e.button === 2) drag = { ...base, mode: 'rotate', clickErase: canEdit() };
  else if (canEdit()) {
    drag = { ...base, mode: G.tool === 'erase' ? 'erase' : 'paint' };
    applyTool(sx, sy, drag.mode === 'erase');
  } else drag = { ...base, mode: 'rotate' };
});
cv.addEventListener('pointermove', e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const [sx, sy] = canvasPt(e);
  if (e.pointerType === 'mouse') updateHover(sx, sy);
  if (!drag) return;
  if (drag.mode === 'pinch') {
    if (touches.size < 2) return;
    const p = pinchInfo();
    View.zoom(drag.d / p.d); View.pan(p.mx - drag.mx, p.my - drag.my);
    Object.assign(drag, p);
    return;
  }
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  if (drag.mode === 'rotate') View.rotate(dx, dy);
  else if (drag.mode === 'pan') View.pan(dx, dy);
  else if (canEdit()) applyTool(sx, sy, drag.mode === 'erase');
});
function endPointer(e) {
  touches.delete(e.pointerId);
  if (drag && drag.mode === 'rotate' && drag.clickErase && drag.moved < 5 && canEdit()) applyTool(drag.sx, drag.sy, true);
  if (!touches.size || (drag && drag.mode === 'pinch')) drag = null;
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = null; });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { e.preventDefault(); View.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1); }, { passive: false });

function tickCountdown(dt) {
  const c = G.countdown, el = $('countdown');
  const before = Math.ceil(c.t);
  c.t -= dt;
  const now = Math.ceil(c.t);
  if (c.t <= 0) { G.countdown = null; el.hidden = true; c.done(); return; }
  el.hidden = false; el.textContent = String(now);
  if (now !== before) SFX.play('tick');
}

let acc = 0, lastT = performance.now(), frameN = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now; G.clock += dt;
  if (G.countdown) tickCountdown(dt);
  acc += dt * (G.slow ? 0.3 : 1);
  let n = 0;
  while (acc >= DT && n < 5) { step(); acc -= DT; n++; }
  if (n === 5) acc = 0;
  if (W.state === 'over' && !G.bannerShown && W.time - W.endT > 1.2) showBanner();
  View.render(W, { clock: G.clock, placing: W.state === 'place', editable: G.editable, ghost: W.state === 'place' && canEdit() ? hover : null, reducedMotion });
  if (++frameN % 12 === 0) hud();
  requestAnimationFrame(frame);
}

function wireControls() {
  $('fightBtn').addEventListener('click', fightPressed);
  $('againBtn').addEventListener('click', () => { if (G.mode === 'online') Net.nextRound(); else backToDeploy(); });
  $('clearBtn').addEventListener('click', () => { for (const t of [0, 1]) if (G.editable[t]) { setArmy(t, []); armyChanged(t); } });
  $('presetSel').addEventListener('change', e => { loadPreset(e.target.value); e.target.value = ''; });
  $('budgetBtn').addEventListener('click', () => {
    G.budgetIdx = (G.budgetIdx + 1) % G.budgets.length;
    if (G.mode === 'online' && G.budgetIdx === G.budgets.length - 1) G.budgetIdx = 0; // online matches keep a limit
    for (const t of [0, 1]) if (G.editable[t]) { setArmy(t, decodeArmy(encodeArmy(G.armies[t]), t, budgetNow())); armyChanged(t); }
    if (G.mode === 'online') Net.budgetChanged();
    hud();
  });
  $('slowBtn').addEventListener('click', () => { G.slow = !G.slow; $('slowBtn').setAttribute('aria-pressed', String(G.slow)); });
  $('soundBtn').addEventListener('click', () => { SFX.unlock(); const m = SFX.toggle(); $('soundBtn').setAttribute('aria-pressed', String(!m)); $('soundBtn').textContent = m ? 'Sound off' : 'Sound on'; });
  $('zoomIn').addEventListener('click', () => View.zoom(0.8));
  $('zoomOut').addEventListener('click', () => View.zoom(1.25));
  $('viewBtn').addEventListener('click', () => View.resetView());
  const orbit = on => { View.setAuto(on); $('orbitBtn').setAttribute('aria-pressed', String(on)); };
  $('orbitBtn').addEventListener('click', () => orbit(!View.isAuto()));
  window.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); if (!$('fightBtn').disabled) fightPressed(); }
    else if (/^Digit[1-9]$/.test(e.code)) selectTool(ORDER[+e.code.slice(5) - 1]);
    else if (e.key === 'e' || e.key === 'E') selectTool('erase');
    else if (e.key === 'r' || e.key === 'R') View.resetView();
    else if (e.key === 'c' || e.key === 'C') orbit(!View.isAuto());
    else if (e.key === 'ArrowLeft') View.rotate(-30, 0);
    else if (e.key === 'ArrowRight') View.rotate(30, 0);
    else if (e.key === 'ArrowUp') View.rotate(0, -20);
    else if (e.key === 'ArrowDown') View.rotate(0, 20);
  });
  const ro = new ResizeObserver(resize);
  [cv, $('topbar'), $('dock')].forEach(el => ro.observe(el));
}

function start(data) {
  data = data || {};
  if (!View.init(cv)) { $('noGl').hidden = false; return; }
  resize();
  initTray(); selectTool('peasant'); fillPresetSelect(); wireControls();
  if (Number.isInteger(data.budgetIdx) && G.budgets[data.budgetIdx] !== undefined) G.budgetIdx = data.budgetIdx;
  if (data.armies && Array.isArray(data.armies)) {
    for (const t of [0, 1]) setArmy(t, decodeArmy(data.armies[t], t, budgetNow()));
  } else loadPreset('s:uprising');
  window.claude?.hot?.snapshot?.(() => ({ armies: G.armies.map(encodeArmy), budgetIdx: G.budgetIdx }));
  hud();
  requestAnimationFrame(t => { lastT = t; frame(t); });
  Net.init();
}
