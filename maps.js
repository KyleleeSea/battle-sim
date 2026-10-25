'use strict';
// Battlefields. `env` changes the physics (it is part of every battle, online too); `look` is for the renderer.

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
};
const MAP_ORDER = ['meadow', 'court', 'desert', 'winter', 'moon', 'volcano', 'candy'];

function setEnv(id) {
  Object.assign(ENV, ENV_DEFAULT, (MAPS[id] || MAPS.meadow).env);
  GRAV = ENV.grav;
}
