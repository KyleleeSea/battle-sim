# Mostly Accurate Battle Sim

A wobbly 3D ragdoll battle sandbox in the browser. Place two armies, press **Fight!**, and watch physics sort it out.

**Play:** https://kyleleesea.github.io/battle-sim/

## Units

Squirrel, Peasant, Squire, Hoplite, Berserker, Knight, Ninja, Archer, Musketeer, Stone Thrower, Bomber, Wizard, Storm Caller, Healer, Sumo, LeBron James and Giant.

## Controls

- Click your half of the field to place the selected unit; drag to paint a crowd; right-click to remove.
- Right-drag turns the camera, scroll zooms, Shift-drag pans. During a battle, left-drag also turns the camera.
- Keys: Space to fight, 1–9 to pick units, E for the eraser, R to reset the view, C for the cinematic camera.

## Online duels

Press **Play online**, then **Host a match** and send your friend the invite link (or the 4-letter code).
The two browsers connect directly over WebRTC; [PeerJS](https://peerjs.com)'s free public server only introduces them.

While you deploy, your opponent sees your units only as black "?" stand-ins: just their positions are sent. The full
army is sent when you press Ready, and both armies are revealed when the battle starts.

Only armies and a "ready" number travel between players. The simulation is deterministic (seeded random numbers and
hand-written trig, so every browser computes the same floating-point results), so both screens play out the exact same
battle. If you change the simulation, bump `PROTO` in `net.js` so players on old and new builds refuse to match.

## Running locally

No build step. Serve the folder with any static server, for example:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Files

- `physics.js`: Verlet ragdolls, seeded random numbers, deterministic trig
- `units.js`: unit roster, AI, poses and melee
- `projectiles.js`: arrows, bullets, boulders, fireballs, explosions, particles
- `painter3d.js`, `scene3d.js`: three.js rendering, camera and scenery
- `game.js`: deployment, battle loop and controls
- `net.js`: peer-to-peer matches
