# CMRASC Invaders

Refactored ES module version of the original single-file CMRASC Invaders game.

## Run

No build step is required. Serve the folder from a local static server because the game uses ES modules:

```bash
python -m http.server 5173
```

Then open:

```text
http://localhost:5173/
```

## Structure

```text
cmrasc-invaders/
├── index.html
├── css/
│   ├── style.css
│   ├── animations.css
│   └── responsive.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── player.js
│   ├── enemy.js
│   ├── bullet.js
│   ├── collision.js
│   ├── ui.js
│   ├── audio.js
│   └── utils.js
└── assets/
    ├── sprites/
    │   ├── player/
    │   ├── enemies/
    │   ├── bosses/
    │   ├── bullets/
    │   └── effects/
    ├── images/
    │   └── players/
    ├── audio/
    └── icons/
```

## Asset Map

- Original fighter card image 1 -> `assets/images/players/sachin-card.jpg`
- Original fighter card image 2 -> `assets/images/players/vishruth-card.jpg`
- Original `SACHIN_SHIP` PNG -> `assets/sprites/player/sachin-ship.png`
- Original `VISHRUTH_SHIP` PNG -> `assets/sprites/player/vishruth-ship.png`

## Module Responsibilities

- `main.js`: bootstraps UI, audio, and game.
- `game.js`: main loop, state management, rendering orchestration, waves.
- `player.js`: player movement, rendering, health shield, shooting entry point.
- `enemy.js`: enemy creation, movement, boss behavior, drops, enemy rendering.
- `bullet.js`: player bullets, aimed enemy bullets, reload timing, rendering.
- `collision.js`: bullet hits, enemy hits, pickup and damage processing.
- `ui.js`: screens, HUD, touch controls, keyboard fallback, notifications.
- `audio.js`: future-ready audio manager with no-op methods for current parity.
- `utils.js`: constants, draw helpers, random star/particle helpers, formatting.
