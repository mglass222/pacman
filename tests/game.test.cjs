const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the real game state machine without audio hardware or a browser.
function game() {
    const events = {};
    const elements = new Map();
    const storage = new Map();
    let depth = 0;
    const drawing = new Proxy({}, {
        get(target, key) {
            if (key in target) return target[key];
            if (key === 'save') return () => depth++;
            if (key === 'restore') return () => { assert.ok(depth > 0); depth--; };
            if (key === 'createRadialGradient') return () => ({ addColorStop() {} });
            return () => {};
        },
        set(target, key, value) { target[key] = value; return true; },
    });
    function element() {
        return {
            textContent: '', style: {}, classList: { add() {}, remove() {} }, clientWidth: 448,
            children: [], addEventListener() {}, setAttribute() {}, blur() {},
            appendChild(child) { this.children.push(child); }, replaceChildren() { this.children = []; },
            getContext() { return drawing; },
        };
    }
    const sandbox = {
        console, performance: { now: () => 0 }, requestAnimationFrame() {}, HTMLButtonElement: class {},
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        document: {
            body: element(), addEventListener() {}, createElement: element,
            getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
        },
        window: {
            devicePixelRatio: 2, matchMedia: () => ({ matches: false }),
            addEventListener(name, fn) { events[name] = fn; },
        },
    };
    const context = vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(require.resolve('../sound.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(require.resolve('../game.js'), 'utf8'), context);
    events.load();
    return { run: code => vm.runInContext(code, context), elements, depth: () => depth, storage };
}

test('title preview preserves maze, four ghosts, spare lives and high-resolution canvas', () => {
    const g = game();
    assert.equal(g.run('gameState'), 'title');
    assert.equal(g.run('totalDots'), 248);
    assert.equal(g.run('ghosts.length'), 4);
    assert.equal(g.run('lives'), 3);
    assert.equal(g.run('canvas.width'), 896);
    assert.equal(g.depth(), 0);
});

test('dot and power-pellet scoring and frightened rendering retain arcade rules', () => {
    const g = game();
    g.run('startGame(); gameState = "playing"; pacman.eat(1, 1)');
    assert.equal(g.run('score'), 10);
    g.run('pacman.eat(1, 3); render()');
    assert.equal(g.run('score'), 60);
    assert.equal(g.run('dotsEaten'), 2);
    assert.equal(g.run('frightTimer'), 6);
    assert.equal(g.run('ghosts.filter(g => g.frightened).length'), 4);
    assert.equal(g.depth(), 0, 'frightened ghosts restore drawing state');
    assert.equal(g.elements.get('score').textContent, '000060');
});

test('pause freezes simulation, resume advances it, and mute toggles independently', () => {
    const g = game();
    g.run('startGame(); gameState = "playing"; togglePause()');
    const before = g.run('pacman.x');
    g.run('gameLoop(1000)');
    assert.equal(g.run('pacman.x'), before);
    g.run('toggleSound(); togglePause(); gameLoop(1100)');
    assert.notEqual(g.run('pacman.x'), before);
    assert.equal(g.run('muted'), true);
    assert.equal(g.run('paused'), false);
});

test('death, game over and replay reset the run while retaining the personal best', () => {
    const g = game();
    g.run('startGame(); score = 1230; updateHUD(); lives = 1; gameState = "death"; stateTimer = 0; update(1 / 60)');
    assert.equal(g.run('gameState'), 'gameover');
    assert.equal(g.storage.get('pacman-after-hours-best'), '1230');
    g.run('restartGame()');
    assert.equal(g.run('score'), 0);
    assert.equal(g.run('lives'), 3);
    assert.equal(g.run('bestScore'), 1230);
    assert.equal(g.run('gameState'), 'ready');
    assert.equal(g.elements.get('pause-btn').disabled, false);
});

test('level completion rebuilds the maze and fruit progression without losing score', () => {
    const g = game();
    g.run('startGame(); score = 2000; gameState = "levelcomplete"; stateTimer = 0; update(1 / 60); render()');
    assert.equal(g.run('level'), 2);
    assert.equal(g.run('score'), 2000);
    assert.equal(g.run('totalDots - dotsEaten'), 248);
    assert.equal(g.run('fruitForLevel(level).shape'), 'strawberry');
    assert.equal(g.depth(), 0);
});
