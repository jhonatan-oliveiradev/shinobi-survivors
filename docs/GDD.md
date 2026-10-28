# Shinobi Survivors — GDD v1.0

## Vision
Free-to-play browser-based 3D survivors-like with fast onboarding, expressive original anime-ninja combat, striking evolutions and strong replayability.

## Original world
The **Veil Fracture** shattered structures controlling the **Flux**. Enemies called **Voids** now emerge through the landscape. Shinobi from autonomous Bastions enter **Trials** to stabilize the world.

## Three planned heroes
- **Aya Sen** — agile wind specialist, initial playable hero. Resonance: Eye of the Storm.
- **Oren Vale** — stone guardian; shields and counters. Post-MVP.
- **Nemi Voss** — Weaver of Echoes; repeats actions and places energy traps. Post-MVP.

## Vertical slice v0.1
- One procedural original arena: Vale do Véu.
- One stylized original provisional character.
- Automated projectile Arts, active dash, Flux meter, timed Resonance.
- Upgrade cards and **Tempest Trama** for wind+echo synergy.
- Four-minute Trial, enemy waves, a boss and local best score.
- Desktop browser; no authentication and no monetization.

## Later milestones
- Professional models/animations, polished VFX, audio, accessibility and onboarding.
- More Arts, three heroes, balanced builds, elite variations and multiple arenas.
- Optional leaderboards and multiplayer only after the core loop is fun.

## IP guardrails
All names, symbols, silhouettes, costumes, stories and Arts must be original. Inspiration is genre-level: ninja combat, elemental mastery and roguelite progression. No copyrighted material from Naruto or any other franchise.

## Acceptance criteria for this slice
1. Press Play and enter an interactable 3D arena.
2. WASD moves the hero relative to camera; camera follows smoothly.
3. Monsters spawn, chase, damage the player and die from automatic Arts.
4. Defeated enemies drop XP; leveling offers three choices.
5. Wind 2 + Echo 1 unlocks Tempest Trama; R activates Resonance with full Flux.
6. Dash, pause/resume, victory/defeat, restart and local best score work.
7. TypeScript check, tests and production build pass in CI.

## v0.2 combat-feel vertical slice
- Original articulated model of Aya Sen; procedural animation for running, attacks, dash, resonance and damage.
- Instanced spark trails and impact bursts, camera reactions, high-visibility enemy windups, spatial separation and boss health presentation.
- Lightweight synthesized SFX with persistently stored mute preference.
- No external character models, voice clips, or music from protected franchises.
- Next: manual cross-browser gameplay QA, graphical profiling, original Blender-authored rig and professional animation set.

## v0.3 Original 3D art direction
- Enemies have individually recognisable silhouettes: Veil Shade (twin horns / dark mask), Thorn Runner (narrow spear form), Bulwark (heavy shoulders), Flux Lantern (floating halo), and Fractured Sentinel boss (animated stone torso, copper crown and energy heart).
- Vale do Véu gains distant basalt cliff layers, six perimeter relics, fragmented energy breach and instanced Flux motes. Decals and monuments are decorative and do not alter collision.
- Aya and enemies use quantized toon lighting. Wind Arts use bespoke angular flowing blades, with golden Trama variant.
- Maintain original-IP requirements: visual forms, names, silhouettes, narrative and effects are original. Asset pipeline remains procedural for the vertical slice; professional Blender/glTF characters are a future production milestone.
- Art goals: silhouettes distinguishable at normal camera distance, combat decals above terrain, no frame-time regression with 100+ enemies, and readable windups on the new meshes.
