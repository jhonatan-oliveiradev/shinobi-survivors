# SHINOBI SURVIVORS

**A Ruptura do Véu** — an original 3D anime-styled browser roguelite.

Version **0.3.0** introduces original differentiated enemy silhouettes (four factions and a custom animated boss), animated energy fissures, ringed valley landmarks, GPU-instanced airborne Flux motes, stylized shading, and angular swept-wind projectile graphics. All art is procedural and native Three.js: no copied anime or game assets.

Version **0.2.0** adds an original animated Aya Sen character rig, attack warning indicators, spatial enemy separation, impact particles, camera feedback, a boss HP bar and original synthesized audio.

A compact, playable vertical slice: move, dash, defeat invading creatures, collect Flux, upgrade your Arts, unlock the Tempest Trama, activate Resonance and confront the Sentinela Partida.

## Getting started

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Open the local Vite URL. The project is fully client-side in this prototype: no accounts, keys or backend are required.

## Controls

| Input | Action |
| --- | --- |
| WASD or arrows | Move relative to the camera |
| Right-click + drag | Rotate camera |
| Mouse wheel | Zoom |
| Space or Shift | Dash (short invulnerability) |
| M | Toggle sound effects (stored locally) |
| R | Activate Resonance at 100 Flux |
| Esc or P | Pause / resume |

Attacks automatically aim at nearby creatures. Level-up pauses the game so you can pick one of three Arts. Collect upgrades for **Fio de Vendaval** (2) and **Eco Errante** (1) to unlock the Tempest Trama.

## Quality

```bash
npm run typecheck
npm run test
npm run build
```

## Technical decisions

- React handles menus, HUD and level-up choices. It does **not** update each enemy every frame.
- Three.js runs a capped frame delta game loop and uses GPU-instanced enemies and impact effects.
- Aya's fully original procedural joint-based rig animates running, striking, dashing, scarf movement, hurt reactions and Resonance. It is not a production glTF character.
- Enemy attacks now have visible windups, and enemies steer apart using a spatial grid.
- Web Audio synthesizes lightweight original sound effects after a user gesture; audio can be muted.
- Projectile/experience objects and procedural scenery use original geometry; there are no external art dependencies.
- Best kill score is saved locally, with a fallback when storage is disabled.
- This is an intentionally small first slice: one original shinobi, one arena and one boss. Additional characters, sound, mobile controls, localization, networking and long-term progression are planned later.

See [design document](docs/GDD.md).

## Original IP

Shinobi Survivors is an original universe. Do not contribute copyrighted characters, music, symbols, logos or ripped assets from third-party anime or games. The project is not affiliated with any existing manga or anime franchise.
