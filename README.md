# Mostly Accurate Battle Sim

A wobbly 3D ragdoll battle sandbox in the browser. Place two armies, press **Fight!**, and watch physics sort it out.

**Play:** https://kyleleesea.github.io/battle-sim/

## Units

38 of them. The serious ones: Peasant, Squire, Hoplite, Berserker, Knight, Ninja, Archer, Musketeer, Stone Thrower, Bomber,
Wizard, Storm Caller, Healer, Sumo and Giant. The less serious ones:

| Unit | Trick |
|---|---|
| Chicken | Pecks ankles. Ten gold each, so bring a hundred. |
| Squirrel | Pounces in swarms. |
| Grandma | Rolling pin. |
| Fishmonger | A fish slap that sends people flying. |
| Scarecrow | Enemies can't resist attacking it. |
| Monkey | Throws banana peels; whoever steps on one slips over. |
| Jester | Cream pies that leave targets staggering, blinded. |
| Pirate | A hand cannon firing real cannonballs. |
| Cupid | Love arrows make enemies switch sides for six seconds. |
| Bard | Music that makes nearby allies fight and run faster. |
| Disco Dancer | Every enemy nearby has to stop and dance. |
| Witch | Turns enemies into chickens. Giants included. |
| Robot | A laser that never misses. |
| Treant | A grumpy old oak that swats whole rows aside. |
| LeBron James | Bouncing basketballs from range, slam dunks up close. |
| Fish | Summons little fish, three at a time. |
| Databrick | A literal brick. Hops onto people; very hard to break. |
| Hog Rider | Rides a hog. Very fast, has a hammer. |
| Miner | Tunnels underground and pops up behind enemy lines. |
| DJ Khaled | Another one: pumps up allies and clones one every other song. |
| Mega Knight | Leaps onto crowds and lands like a meteor. |
| Dragon | A Chinese dragon in a rice hat. Breathes fire in a wide cone. |
| Ultraman | Fifty metres tall, to scale. Crushes what's underfoot; fires the Specium Ray. |

## Maps

| Map | Twist |
|---|---|
| Meadow | None. Rolling green hills. |
| Basketball Court | Polished hardwood in an arena: feet slip and bodies slide. |
| Desert | Soft sand: everyone trudges slower and stops sliding sooner. |
| Frozen Lake | Ice: feet skid and knocked-over units slide a long way. |
| The Moon | Low gravity: hits send units much higher and further. |
| Volcano | A rock island in a lava lake, with lava pools down the middle. Lava burns. |
| Candy Land | Jelly ground: everything that falls bounces. |

Online, the host picks the map.

## Controls

- Click your half of the field to place the selected unit; drag to paint a crowd; right-click to remove.
- Right-drag turns the camera, scroll zooms, Shift-drag pans. During a battle, left-drag also turns the camera.
- Game speed: 0.3×, 1×, 2×, 4× or 8× from the top bar, or step it with [ and ]. Speed is local, so online opponents can watch at different speeds.
- Keys: Space to fight, 1–9 to pick units, E for the eraser, R to reset the view, C for the cinematic camera.

## Online duels

Press **Play online**, then **Host a match** and send your friend the invite link (or the 4-letter code).
The two browsers connect directly over WebRTC; [PeerJS](https://peerjs.com)'s free public server only introduces them.

While you deploy, your opponent sees your units only as black "?" stand-ins: just their positions are sent. The full
army is sent when you press Ready, and both armies are revealed when the battle starts.

Only armies and a "ready" number travel between players. The simulation is deterministic (seeded random numbers and
hand-written trig, so every browser computes the same floating-point results), so both screens play out the exact same
battle. If you change the simulation, bump `PROTO` in `net.js` (and the `?v=` on the script tags in `index.html`) so players on old and new builds refuse to match and browsers fetch fresh files.

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
