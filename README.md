# Pac-Man — After Hours

A modern visual take on the browser-based arcade classic, built with HTML, CSS, and vanilla JavaScript. Neon maze contours, shaded characters, glowing power pellets, and a responsive arcade cabinet surround the original maze and game rules.

**[Published game →](https://mglass222.github.io/pacman/)** (reflects the last deployed version)

## Controls

- **Arrow keys** or **WASD** to move; swipe across the maze on touch screens.
- Click **LET’S PLAY**, or press **Enter / Space** on the title screen.
- **P** to pause/resume, or tap/click the maze to pause and use the resume button. Switching away from the page pauses automatically.
- **M** to mute/unmute; a sound button is also available on the title screen and pause overlay.
- Click **PLAY AGAIN**, or press **Enter / Space** after game over.

Your personal best is stored locally in your browser. The game remains playable if browser storage is unavailable. Reduced-motion preferences disable the new pellet pulse and level-completion flashing.

## Local development

Open `index.html` directly, or serve this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then visit `http://127.0.0.1:4173`. No build step or runtime dependencies are required. The optional Google Fonts stylesheet falls back to system sans-serif fonts offline.

## Checks

Requires Node.js 18 or later:

```sh
node --check game.js
node --check sound.js
node --test tests/*.test.cjs
```

The tests cover the title preview, maze and ghost setup, dot/power scoring, frightened rendering, pause/resume, mute, game over, replay, personal-best persistence, and level progression. Browser playtesting is still needed to assess visual layout, keyboard/touch input, and audio.

## After Hours audio

The shared `sound.js` synthesizer keeps the familiar cues and melodies, using rounded triangle/sine voices, filtered note attacks, quiet reward echoes, and a compressed master bus. Chase and frightened loops fade on transitions and release their audio nodes. The four chase intensity stages use consistent maze-progress thresholds.

Open `sound-preview.html` through the same local server to audition all nine effects individually. Each selection replaces the previous sound; loop previews stop after four seconds. This page uses the exact sound engine loaded by the game.

Starting a run hides all page chrome and score panels and fits the complete maze to the screen without stretching or cropping. Native browser fullscreen is requested when supported; embedded browsers use the full available viewport. Press Escape to leave native fullscreen.
