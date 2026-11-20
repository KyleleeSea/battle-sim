'use strict';
// Battlefields. `env` changes the physics (it is part of every battle, online too); `look` is for the renderer.

// ---------- terrain layouts ----------
// Built with integer-exact maths only, so every machine (both players online) gets identical terrain.
function layoutRng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
}
const overlaps = (a, b) => a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];

// A row of buildings between x0 and x1 in the band z0..z1, with alleys between them.
// o: { w: [min, max], gap: [min, max], hs: [heights], kind, low (chance of a climbable shed), skip (chance of an empty lot), jit }
function buildingRow(out, x0, x1, z0, z1, rnd, o, avoid) {
  let x = x0;
  while (x < x1 - 36) {
    let w = o.w[0] + Math.floor(rnd() * (o.w[1] - o.w[0]));
    if (x + w > x1 || x1 - (x + w) < 40) w = x1 - x;
    const jit = o.jit || 0;
    const za = z0 + Math.floor(rnd() * jit), zb = z1 - Math.floor(rnd() * jit);
    const low = rnd() < (o.low || 0), h = low ? 22 + Math.floor(rnd() * 5) : o.hs[Math.floor(rnd() * o.hs.length)];
    const b = [x, x + w, za, zb, h, low && o.lowKind ? o.lowKind : o.kind];
    if (rnd() >= (o.skip || 0) && !(avoid || []).some(a => overlaps(a, b))) out.push(b);
    x += w + o.gap[0] + Math.floor(rnd() * (o.gap[1] - o.gap[0]));
  }
}

// One of the great walls, split where it has an open gateway (gates: [{ at, w, h, state }], along the wall's long axis).
// Returns the physics blocks; the renderer reads the same description from look.walls.
function wallBlocks(w) {
  const along = w.x1 - w.x0 > w.z1 - w.z0, a0 = along ? w.x0 : w.z0, a1 = along ? w.x1 : w.z1;
  const cuts = (w.gates || []).filter(g => g.state === 'broken').map(g => [g.at - g.w / 2, g.at + g.w / 2]).sort((p, q) => p[0] - q[0]);
  const out = [];
  let s = a0;
  for (const [c0, c1] of cuts.concat([[a1, a1]])) {
    if (c0 > s) out.push(along ? [s, c0, w.z0, w.z1, w.h, 'greatwall'] : [w.x0, w.x1, s, c0, w.h, 'greatwall']);
    s = c1;
  }
  return out;
}

const TROST_WALLS = [
  { x0: -2600, x1: 2600, z0: -300, z1: -240, h: 360, gates: [] },                                     // Wall Rose
  { x0: 840, x1: 900, z0: -240, z1: 1300, h: 300, gates: [{ at: 280, w: 150, h: 120, state: 'broken' }] },   // the outer gate, kicked in
  { x0: -900, x1: -840, z0: -240, z1: 1300, h: 300, gates: [{ at: 280, w: 130, h: 110, state: 'closed' }] },  // the inner gate
];
const TROST = (() => {
  const b = [], rnd = layoutRng(845);
  const keep = [
    [-690, -490, 120, 222],    // supply HQ
    [-140, 140, 0, 560],       // the plaza in front of the church
    [520, 720, 330, 480],      // the boulder and the rubble by the gate
    [600, 720, 120, 220],
  ];
  b.push([-680, -500, 128, 214, 62, 'hall']);
  b.push([-118, -62, 140, 196, 118, 'tower']);
  b.push([548, 636, 366, 448, 68, 'boulder']);
  for (const r of [[640, 690, 340, 372, 13], [600, 640, 150, 182, 10], [662, 712, 176, 214, 16], [690, 716, 380, 420, 9], [470, 500, 190, 214, 8]]) b.push(r.concat('rubble'));
  const bands = [[22, 104, [42, 46, 48, 52]], [126, 206, [38, 42, 46]], [352, 430, [36, 40, 44]], [454, 532, [30, 34, 36]]];
  const segs = [[-712, -470], [-410, -140], [140, 410], [470, 712]];
  for (const [z0, z1, hs] of bands) for (const [x0, x1] of segs) {
    buildingRow(b, x0, x1, z0, z1, rnd, { w: [62, 104], gap: [26, 36], hs, kind: 'house', low: 0.16, jit: 8 }, keep);
  }
  for (const w of TROST_WALLS) b.push(...wallBlocks(w));
  return b;
})();

const SHIGANSHINA_WALLS = [
  { x0: -2600, x1: 2600, z0: -300, z1: -240, h: 340, gates: [] },                                    // Wall Maria
  { x0: 840, x1: 900, z0: -240, z1: 1300, h: 280, gates: [{ at: 280, w: 140, h: 120, state: 'crystal' }] },   // outer gate, sealed by Eren's hardening
  { x0: -900, x1: -840, z0: -240, z1: 1300, h: 280, gates: [{ at: 280, w: 130, h: 110, state: 'closed' }] },  // inner gate
];
const SHIGANSHINA = (() => {
  const b = [], rnd = layoutRng(850);
  const keep = [[-150, -90, 0, 560]];
  // The district: ruined houses, roofs smashed, rubble in the streets. East of x = 180 the Beast Titan's
  // barrage has flattened everything: open ground, craters and a few thrown rocks.
  const bands = [[24, 104, [40, 44, 48]], [128, 208, [34, 38, 44]], [352, 430, [34, 38, 42]], [456, 532, [28, 32, 36]]];
  const segs = [[-712, -460], [-400, -150], [-90, 170]];
  for (const [z0, z1, hs] of bands) for (const [x0, x1] of segs) {
    buildingRow(b, x0, x1, z0, z1, rnd, { w: [58, 96], gap: [28, 40], hs, kind: 'ruin', low: 0.25, lowKind: 'ruin', skip: 0.2, jit: 10 }, keep);
  }
  for (const r of [[-440, -410, 240, 270, 12], [-130, -96, 300, 330, 10], [120, 160, 230, 262, 14], [-610, -580, 300, 322, 9]]) b.push(r.concat('rubble'));
  // Rocks the Beast Titan threw.
  for (const r of [[260, 300, 120, 158, 26], [380, 410, 380, 410, 20], [520, 566, 190, 232, 30], [610, 640, 460, 490, 18], [300, 330, 470, 500, 16], [470, 500, 70, 98, 22]]) b.push(r.concat('boulder'));
  for (const w of SHIGANSHINA_WALLS) b.push(...wallBlocks(w));
  return b;
})();

const LIBERIO = (() => {
  const b = [];
  // The plaza with Willy Tybur's stage (facing west, toward the audience) and the theatre behind it.
  b.push([150, 290, 196, 364, 26, 'stage']);
  b.push([300, 352, 150, 410, 104, 'theatre']);
  // Brick blocks on a street grid: streets run east-west at z 168..236 and 372..424, north-south at x -560..-490 and 500..560.
  const rnd = layoutRng(854);
  const left = [[-712, -560], [-490, -230]], right = [[380, 500], [560, 712]];
  const bands = [[20, 168, [64, 72, 80]], [236, 372, [60, 70, 78, 88]], [424, 540, [56, 62, 68]]];
  for (const [z0, z1, hs] of bands) {
    for (const [x0, x1] of left.concat(right)) {
      // Each city block: two or three buildings with narrow passages.
      let x = x0;
      while (x < x1 - 40) {
        let w = 56 + Math.floor(rnd() * 50);
        if (x + w > x1 || x1 - (x + w) < 46) w = x1 - x;
        b.push([x, x + w, z0 + 6, z1 - 6, hs[Math.floor(rnd() * hs.length)], 'brick']);
        x += w + 22 + Math.floor(rnd() * 10);
      }
    }
  }
  // The internment zone's low wall along the back street, with a checkpoint gap.
  b.push([-712, -470, 4, 14, 22, 'lowwall'], [-420, -230, 4, 14, 22, 'lowwall']);
  return b;
})();

const SALTA_WALLS = [
  { x0: -2600, x1: 200, z0: -300, z1: -240, h: 170, gates: [], fort: true },
  { x0: -940, x1: -880, z0: -240, z1: 1300, h: 170, gates: [{ at: 280, w: 110, h: 90, state: 'closed' }], fort: true },
];
const SALTA = (() => {
  const b = [];
  // Fort Salta's plateau on the Alliance side, in three terraces anyone can climb.
  b.push([-720, -480, 30, 530, 66, 'rock'], [-480, -420, 70, 490, 44, 'rock'], [-420, -362, 110, 450, 22, 'rock']);
  // Outcrops in no-man's-land, and the crushed remains of whatever the Wall Titans walked over.
  b.push([-170, -104, 58, 124, 28, 'rock'], [-60, 6, 380, 436, 18, 'rock'], [40, 118, 420, 486, 24, 'rock']);
  for (const r of [[300, 360, 100, 150, 14], [520, 600, 360, 410, 16], [200, 244, 480, 520, 10], [640, 700, 190, 230, 12]]) b.push(r.concat('rubble'));
  for (const w of SALTA_WALLS) b.push(...wallBlocks(w));
  return b;
})();

// The walled districts keep everyone inside the fight: nobody is thrown out behind the great Walls.
const AOT_BOUNDS = { x: FIELD_X + 80, z0: -60, z1: FIELD_Z + 60 };

const MAPS = {
  meadow: {
    name: 'Meadow', blurb: 'Rolling green hills. Nothing unusual happens here.',
    env: {},
    look: {
      skyTop: '#5aa6df', horizon: '#cfe9f3', fog: [2800, 8000], ground: '#7db250', stripes: ['#97cb66', '#88bf59'],
      hemi: ['#e4f3ff', '#6f8f45', 0.78], sun: ['#fff4e0', 0.78], hills: ['#8fbf7a', '#a7cba0'],
      scenery: 'trees', clouds: { color: '#ffffff', count: 12 },
    },
  },
  court: {
    name: 'Basketball Court', blurb: 'Polished hardwood under the arena lights. Feet slip and bodies slide.',
    env: { friction: 0.88, traction: 0.7, bounce: 0.3 },
    look: {
      skyTop: '#07080f', horizon: '#141829', fog: [3200, 9500], ground: '#23273a', court: true, stripes: ['#d9a066', '#cf955b'],
      hemi: ['#fff6e8', '#4a3a2a', 0.9], sun: ['#ffffff', 0.75], hills: null,
      scenery: 'arena', clouds: null,
    },
  },
  office: {
    name: 'Tech Office', blurb: 'An open-plan office on thick carpet: nobody slides very far.',
    env: { friction: 0.5 },
    look: {
      skyTop: '#d9e2ec', horizon: '#eef2f6', fog: [3200, 9500], ground: '#9aa4b3', carpet: true, stripes: ['#5d6b85', '#56637c'],
      hemi: ['#ffffff', '#9aa3ad', 0.95], sun: ['#ffffff', 0.55], hills: null,
      scenery: 'office', clouds: null,
    },
  },
  arena: {
    name: 'Epic Arena', blurb: 'A walled colosseum: nobody gets thrown out of the fight.',
    env: { wall: { rx: FIELD_X + 170, rz: FIELD_Z / 2 + 200, cz: FIELD_Z / 2 } },
    look: {
      skyTop: '#d9824a', horizon: '#f2c48a', fog: [3200, 9500], ground: '#c9a36a', stripes: ['#d6b27c', '#d0ab74'],
      hemi: ['#fff1d6', '#8a6a45', 0.85], sun: ['#ffd9a0', 0.85], hills: null,
      scenery: 'colosseum', clouds: { color: '#fff1e0', count: 6 },
    },
  },
  space: {
    name: 'Outer Space', blurb: 'A platform floating in space. Very low gravity, and anyone knocked off it drifts away for good.',
    env: { grav: 170, friction: 0.75, platform: { x: FIELD_X + 90, z0: -90, z1: FIELD_Z + 90 } },
    look: {
      skyTop: '#02030a', horizon: '#060816', fog: [12000, 16000], ground: null, plates: true, stripes: ['#5d6470', '#565d68'],
      hemi: ['#b9c8ff', '#2a2f44', 0.6], sun: ['#ffffff', 1.0], hills: null,
      scenery: 'space', clouds: null, stars: true, starsAll: true,
    },
  },
  desert: {
    name: 'Desert', blurb: 'Soft sand: everyone trudges a little slower and stops sliding sooner.',
    env: { friction: 0.5, traction: 0.8 },
    look: {
      skyTop: '#e39a52', horizon: '#f7dcae', fog: [2600, 8000], ground: '#dcbb76', stripes: ['#e8cb8b', '#dfc07c'],
      hemi: ['#fff1d6', '#b8925a', 0.8], sun: ['#ffe2b0', 0.85], hills: ['#d9b06a', '#e6c48a'],
      scenery: 'cacti', clouds: { color: '#fff4e2', count: 4 },
    },
  },
  winter: {
    name: 'Frozen Lake', blurb: 'Slippery ice. Feet skid, and anyone knocked over slides a long way.',
    env: { friction: 0.985, traction: 0.3 },
    look: {
      skyTop: '#8fa9c8', horizon: '#e8f0f7', fog: [1600, 6500], ground: '#eef3f7', stripes: ['#c6e3f2', '#b9dbee'], cracks: true,
      hemi: ['#f2f7ff', '#9fb2c4', 0.85], sun: ['#ffffff', 0.6], hills: ['#e9eff5', '#dfe8f0'],
      scenery: 'pines', clouds: { color: '#e1e7ee', count: 14 }, snow: true,
    },
  },
  moon: {
    name: 'The Moon', blurb: 'Low gravity. Anything that gets hit goes a very long way.',
    env: { grav: 260, friction: 0.8 },
    look: {
      skyTop: '#03040b', horizon: '#0b0d1c', fog: [9000, 14000], ground: '#8f8f97', stripes: ['#a3a3aa', '#9a9aa1'], dots: true,
      hemi: ['#c9d2ff', '#3a3a44', 0.45], sun: ['#ffffff', 1.05], hills: ['#76767e', '#84848c'],
      scenery: 'craters', clouds: null, stars: true, earth: true,
    },
  },
  volcano: {
    name: 'Volcano', blurb: 'A rock island in a lake of lava, with lava pools down the middle. Anything in the lava burns.',
    env: { lava: true, pools: [[0, 120, 55], [0, 280, 55], [0, 440, 55]] },
    look: {
      skyTop: '#2b1414', horizon: '#a8502c', fog: [2000, 7000], ground: '#ff6a1f', lavaGround: true, stripes: ['#4d423f', '#453a37'],
      hemi: ['#ffb38a', '#4a1a10', 0.7], sun: ['#ff9a6a', 0.75], hills: ['#3a2c2a', '#45302b'],
      scenery: 'basalt', clouds: { color: '#5a4a4a', count: 10 }, embers: true, volcano: true,
    },
  },
  candy: {
    name: 'Candy Land', blurb: 'Jelly ground: everything that falls bounces.',
    env: { bounce: 0.6, friction: 0.6 },
    look: {
      skyTop: '#ff8fcf', horizon: '#ffe3f3', fog: [2600, 8000], ground: '#ffc6e4', stripes: ['#b8f2d8', '#fff0f7'],
      hemi: ['#fff0fa', '#d98fbf', 0.85], sun: ['#fff5fb', 0.7], hills: ['#ffb3d9', '#c9b3ff'],
      scenery: 'lollipops', clouds: { color: '#ffd6ee', count: 12 },
    },
  },
  trost: {
    name: 'Trost District', blurb: 'The Battle of Trost: streets of half-timbered houses below Wall Rose, the outer gate kicked in. Soldiers keep to the streets; scouts and Titans take the rooftops.',
    env: { friction: 0.72, blocks: TROST, bounds: AOT_BOUNDS },
    look: {
      skyTop: '#7a828e', horizon: '#c7cacd', fog: [2400, 8200], ground: '#7d7566', cobble: true, stripes: ['#a39a88', '#968d7c'],
      hemi: ['#e8ecf0', '#6a6458', 0.88], sun: ['#f2f2ee', 0.55], hills: ['#7f8f6a', '#8c9a76'],
      scenery: 'district', district: 'trost', walls: TROST_WALLS, clouds: { color: '#d3d6da', count: 18 },
      smoke: [[700, -140], [-260, -170], [1200, 300], [420, -900], [-1300, -200]], flares: true,
    },
  },
  shiganshina: {
    name: 'Shiganshina District', blurb: 'Ruined Shiganshina at dusk, the outer gate sealed with crystal. Broken houses and rubble to the west; open ground to the east, flattened by the Beast Titan\'s rocks.',
    env: { friction: 0.7, blocks: SHIGANSHINA, bounds: AOT_BOUNDS },
    look: {
      skyTop: '#33335c', horizon: '#f0a35e', fog: [2200, 7800], ground: '#7a6a52', cobble: true, rubbleField: true, stripes: ['#968569', '#8b7a5f'],
      hemi: ['#ffd2a8', '#4a3a40', 0.72], sun: ['#ffae6a', 0.95], sunPos: [1600, 520, -300], hills: ['#5e5a4a', '#6a644f'],
      scenery: 'district', district: 'shiganshina', walls: SHIGANSHINA_WALLS, clouds: { color: '#e9b28a', count: 10 },
      smoke: [[-520, -150], [60, -130], [-1150, 380], [1500, 100]], fires: [[-600, 60, 44], [-300, 470, 36], [-30, 160, 38], [120, 400, 34]], embers: true,
    },
  },
  liberio: {
    name: 'Liberio', blurb: 'Marley\'s internment zone on festival night: brick blocks four storeys high, Willy Tybur\'s stage on the plaza. The streets are narrow; only ODM gear and Titans get onto the roofs.',
    env: { friction: 0.68, blocks: LIBERIO, bounds: AOT_BOUNDS },
    look: {
      skyTop: '#060a1c', horizon: '#26294a', fog: [2000, 7200], ground: '#46464f', pave: true, stripes: ['#5c5c66', '#55555e'],
      hemi: ['#8ea2d8', '#2a2430', 0.62], sun: ['#c9d6ff', 0.42], sunPos: [-900, 1600, 400], hills: null,
      scenery: 'district', district: 'liberio', clouds: { color: '#2a2d44', count: 10 }, stars: true,
      fires: [[-640, 300, 78], [620, 470, 66], [-300, 90, 72]], embers: true, searchlights: true, airship: true, lamps: true,
    },
  },
  rumbling: {
    name: 'Fort Salta', blurb: 'The Rumbling: the Alliance\'s last stand on Fort Salta\'s rock terraces (climbable step by step) while the Wall Titans\' steam rolls in over trampled ground.',
    env: { friction: 0.66, blocks: SALTA, bounds: AOT_BOUNDS },
    look: {
      skyTop: '#3a0f0a', horizon: '#c4532a', fog: [2600, 9000], ground: '#4a3a30', ash: true, stripes: ['#5a463a', '#524035'],
      hemi: ['#ffb08a', '#3a1a12', 0.7], sun: ['#ff9a6a', 0.85], sunPos: [1400, 900, -600], hills: ['#3a2a24', '#45302a'],
      scenery: 'district', district: 'salta', walls: SALTA_WALLS, clouds: { color: '#6a3a30', count: 14 },
      embers: true, steamClouds: true, wallTitans: true,
    },
  },
};
const MAP_ORDER = ['meadow', 'court', 'office', 'arena', 'desert', 'winter', 'moon', 'space', 'volcano', 'candy', 'trost', 'shiganshina', 'liberio', 'rumbling'];

function setEnv(id) {
  Object.assign(ENV, ENV_DEFAULT, (MAPS[id] || MAPS.meadow).env);
  GRAV = ENV.grav;
  buildTerrain();
}
