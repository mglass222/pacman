// ==================== CONSTANTS ====================
const TILE = 16;
const COLS = 28;
const ROWS = 31;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;

const MAZE = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.#####.##.#####.######",
    "     #.#####.##.#####.#     ",
    "     #.##          ##.#     ",
    "     #.## ###--### ##.#     ",
    "######.## #      # ##.######",
    "          #      #          ",
    "######.## #      # ##.######",
    "     #.## ######## ##.#     ",
    "     #.##          ##.#     ",
    "     #.## ######## ##.#     ",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#.####.#####.##.#####.####.#",
    "#o..##................##..o#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################",
];

const T = { WALL: 0, DOT: 1, PELLET: 2, EMPTY: 3, DOOR: 4 };
const DIR = {
    UP:    { x: 0, y: -1, name: 'up' },
    DOWN:  { x: 0, y: 1, name: 'down' },
    LEFT:  { x: -1, y: 0, name: 'left' },
    RIGHT: { x: 1, y: 0, name: 'right' },
    NONE:  { x: 0, y: 0, name: 'none' },
};

const SPEED = {
    pacman: 1.6,
    pacmanDots: 1.45,
    ghost: 1.5,
    ghostFright: 1.15,
    ghostTunnel: 0.8,
    ghostEyes: 3.2,
};

const SCATTER_CHASE = [
    { mode: 'scatter', t: 7 },
    { mode: 'chase',   t: 20 },
    { mode: 'scatter', t: 7 },
    { mode: 'chase',   t: 20 },
    { mode: 'scatter', t: 5 },
    { mode: 'chase',   t: 20 },
    { mode: 'scatter', t: 5 },
    { mode: 'chase',   t: Infinity },
];

const FRIGHT_TIME = 7;
const FRIGHT_FLASH_TIME = 2.5;
const FRIGHT_FLASHES = 5;

const GHOST_COLORS = {
    blinky: '#FF0000',
    pinky:  '#FFB8FF',
    inky:   '#00FFFF',
    clyde:  '#FFB852',
};

const SCATTER_TARGET = {
    blinky: { col: 25, row: -3 },
    pinky:  { col: 2,  row: -3 },
    inky:   { col: 27, row: 31 },
    clyde:  { col: 0,  row: 31 },
};

// Classic arcade fruit set, in progression order. `shape` selects the drawing
// routine in drawFruit(); `color` is used for the HUD bonus indicator.
const FRUITS = [
    { shape: 'cherry',     name: 'Cherry',     score: 100,  color: '#FF0000' },
    { shape: 'strawberry', name: 'Strawberry', score: 300,  color: '#FF3030' },
    { shape: 'orange',     name: 'Orange',     score: 500,  color: '#FF9A00' },
    { shape: 'apple',      name: 'Apple',      score: 700,  color: '#E81414' },
    { shape: 'melon',      name: 'Melon',      score: 1000, color: '#74D838' },
    { shape: 'galaxian',   name: 'Galaxian',   score: 2000, color: '#23D7FF' },
    { shape: 'bell',       name: 'Bell',       score: 3000, color: '#FFD21E' },
    { shape: 'key',        name: 'Key',        score: 5000, color: '#58CBFF' },
];

// Arcade fruit-by-level: cherry, strawberry, orange x2, apple x2, melon x2,
// galaxian x2, bell x2, then key from level 13 onward. Index into FRUITS.
const FRUIT_BY_LEVEL = [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7];

function fruitForLevel(lvl) {
    return FRUITS[FRUIT_BY_LEVEL[Math.min(lvl - 1, FRUIT_BY_LEVEL.length - 1)]];
}

const READY_TIME = 2.2;
const DEATH_ANIM_TIME = 2.0;
const LEVEL_COMPLETE_TIME = 3.0;

function reverseDir(d) {
    if (d === DIR.UP) return DIR.DOWN;
    if (d === DIR.DOWN) return DIR.UP;
    if (d === DIR.LEFT) return DIR.RIGHT;
    if (d === DIR.RIGHT) return DIR.LEFT;
    return DIR.NONE;
}

// ==================== STATE ====================
let canvas, ctx;
let grid;
let totalDots, dotsEaten;
let score, level, lives;
let gameState;
let scatterChaseIndex;
let scatterChaseTimer;
let frightTimer;
let ghostsEatenInPower;
let dotsAtFruit;
let globalDotCounter;
let stateTimer;
let frameCount;
let pacman, ghosts;
let fruit;
let sound;
let mazeCanvas, mazeCtx;
let running = false;
let lastTime = 0;
let accumulator = 0;
const FRAME_TIME = 1000 / 60;

// ==================== INIT ====================
window.addEventListener('load', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    document.getElementById('start-btn').addEventListener('click', startGame);
    setupInput();
    fitToWindow();
    window.addEventListener('resize', fitToWindow);
});

// Scale the whole game up to fill the browser's vertical height while keeping
// its aspect ratio (and not overflowing horizontally on narrow windows).
function fitToWindow() {
    const container = document.getElementById('game-container');
    if (!container) return;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (!w || !h) return;
    const scale = Math.min(window.innerWidth / w, window.innerHeight / h) * 0.98;
    container.style.transform = 'scale(' + scale + ')';
}

function startGame() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('game-wrap').classList.remove('hidden');
    fitToWindow();
    sound = new SoundManager();
    score = 0;
    level = 1;
    lives = 3;
    initLevel(true);
    if (!running) {
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function initLevel(playIntro) {
    parseMaze();
    renderMazeOffscreen();
    dotsEaten = 0;
    globalDotCounter = 0;
    scatterChaseIndex = 0;
    scatterChaseTimer = SCATTER_CHASE[0].t;
    frightTimer = 0;
    ghostsEatenInPower = 0;
    dotsAtFruit = 0;
    stateTimer = READY_TIME;
    frameCount = 0;
    if (sound) sound.lastMode = 'none';

    pacman = new PacMan();
    ghosts = [
        new Ghost('blinky'),
        new Ghost('pinky'),
        new Ghost('inky'),
        new Ghost('clyde'),
    ];

    fruit = null;
    gameState = 'ready';

    updateHUD();
    if (playIntro) sound.playIntro();
}

function parseMaze() {
    grid = [];
    totalDots = 0;
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) {
            const ch = MAZE[r][c];
            let tile;
            if (ch === '#') tile = T.WALL;
            else if (ch === '.') tile = T.DOT;
            else if (ch === 'o') tile = T.PELLET;
            else if (ch === '-') tile = T.DOOR;
            else tile = T.EMPTY;
            grid[r][c] = tile;
            if (tile === T.DOT || tile === T.PELLET) totalDots++;
        }
    }
}

// ==================== MAZE HELPERS ====================
function tileAt(col, row) {
    if (row < 0 || row >= ROWS) return T.WALL;
    if (col < 0 || col >= COLS) return T.WALL;
    return grid[row][col];
}

function isWall(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    return grid[row][col] === T.WALL;
}

function isOutside(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
    if (grid[row][col] !== T.EMPTY) return false;
    if (row === 14) return false;
    return (col <= 4 || col >= 23);
}

function isWallOrOutside(col, row) {
    return isWall(col, row) || isOutside(col, row);
}

function inTunnel(col, row) {
    return row === 14 && (col <= 5 || col >= 22);
}

function canEnter(col, row, entity) {
    if (col < 0 || col >= COLS) return row === 14;
    const t = tileAt(col, row);
    if (t === T.WALL) return false;
    if (t === T.DOOR) return !!(entity && entity.isGhost && entity.eyes);
    return true;
}

function colToX(col) { return col * TILE + TILE / 2; }
function rowToY(row) { return row * TILE + TILE / 2; }
function xToCol(x) { return Math.floor(x / TILE); }
function yToRow(y) { return Math.floor(y / TILE); }

// ==================== PAC-MAN ====================
class PacMan {
    constructor() {
        this.x = colToX(13.5);
        this.y = rowToY(23);
        this.dir = DIR.LEFT;
        this.nextDir = DIR.NONE;
        this.mouthAngle = 0;
        this.mouthDir = 1;
        this.dead = false;
        this.deathAngle = 0;
    }

    get speed() {
        const col = xToCol(this.x);
        const row = yToRow(this.y);
        let s = (tileAt(col, row) === T.DOT || tileAt(col, row) === T.PELLET) ? SPEED.pacmanDots : SPEED.pacman;
        return s;
    }

    update() {
        if (this.dead) return;
        const col = xToCol(this.x);
        const row = yToRow(this.y);
        const cx = colToX(col);
        const cy = rowToY(row);
        const spd = this.speed;

        if (Math.abs(this.x - cx) <= spd / 2 + 0.1 && Math.abs(this.y - cy) <= spd / 2 + 0.1) {
            this.x = cx;
            this.y = cy;
            this.eat(col, row);
            if (this.nextDir !== DIR.NONE) {
                if (canEnter(col + this.nextDir.x, row + this.nextDir.y, this)) {
                    this.dir = this.nextDir;
                }
            }
            if (!canEnter(col + this.dir.x, row + this.dir.y, this)) {
                this.dir = DIR.NONE;
            }
        }

        if (this.dir !== DIR.NONE) {
            this.x += this.dir.x * spd;
            this.y += this.dir.y * spd;
            this.mouthAngle += this.mouthDir * 0.15;
            if (this.mouthAngle > 0.4) { this.mouthAngle = 0.4; this.mouthDir = -1; }
            if (this.mouthAngle < 0) { this.mouthAngle = 0; this.mouthDir = 1; }
        }

        if (this.x < -TILE / 2) this.x += CANVAS_W;
        if (this.x > CANVAS_W + TILE / 2) this.x -= CANVAS_W;
    }

    eat(col, row) {
        const t = tileAt(col, row);
        if (t === T.DOT) {
            grid[row][col] = T.EMPTY;
            dotsEaten++;
            globalDotCounter++;
            score += 10;
            try { sound.waka(); } catch (e) {}
            checkFruitSpawn();
            checkGhostRelease();
            updateHUD();
        } else if (t === T.PELLET) {
            grid[row][col] = T.EMPTY;
            dotsEaten++;
            globalDotCounter++;
            score += 50;
            checkFruitSpawn();
            checkGhostRelease();
            triggerFrightened();
            updateHUD();
        }
    }

    draw() {
        ctx.save();
        if (this.dead) {
            ctx.translate(this.x, this.y);
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            const a = this.deathAngle;
            if (a < Math.PI) {
                ctx.arc(0, 0, TILE * 0.55, a, Math.PI * 2 - a);
                ctx.lineTo(0, 0);
                ctx.fill();
            }
            ctx.restore();
            return;
        }
        ctx.translate(this.x, this.y);
        let rot = 0;
        if (this.dir === DIR.RIGHT) rot = 0;
        else if (this.dir === DIR.DOWN) rot = Math.PI / 2;
        else if (this.dir === DIR.LEFT) rot = Math.PI;
        else if (this.dir === DIR.UP) rot = -Math.PI / 2;
        ctx.rotate(rot);
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        const ma = this.dir === DIR.NONE ? 0.1 : this.mouthAngle;
        ctx.arc(0, 0, TILE * 0.55, ma, Math.PI * 2 - ma);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.restore();
    }
}

// ==================== GHOST ====================
class Ghost {
    constructor(name) {
        this.name = name;
        this.color = GHOST_COLORS[name];
        this.scatterTarget = SCATTER_TARGET[name];
        this.mode = 'scatter';
        this.frightened = false;
        this.eyes = false;
        this.released = false;
        this.inHouse = name !== 'blinky';
        this.releasedTimer = 0;
        this.frame = 0;
        this.isGhost = true;
        this.reversePending = false;
        this.setStartPosition();
        this.dir = this.inHouse ? DIR.UP : DIR.LEFT;
        this.startCol = this.tileCol;
        this.startRow = this.tileRow;
    }

    setStartPosition() {
        if (this.name === 'blinky') {
            this.x = colToX(13.5);
            this.y = rowToY(11);
            this.tileCol = 13;
            this.tileRow = 11;
        } else if (this.name === 'pinky') {
            this.x = colToX(13.5);
            this.y = rowToY(14);
            this.tileCol = 13;
            this.tileRow = 14;
        } else if (this.name === 'inky') {
            this.x = colToX(11.5);
            this.y = rowToY(14);
            this.tileCol = 11;
            this.tileRow = 14;
        } else if (this.name === 'clyde') {
            this.x = colToX(15.5);
            this.y = rowToY(14);
            this.tileCol = 15;
            this.tileRow = 14;
        }
    }

    get currentSpeed() {
        if (this.eyes) return SPEED.ghostEyes;
        const col = xToCol(this.x);
        const row = yToRow(this.y);
        if (inTunnel(col, row)) return SPEED.ghostTunnel;
        if (this.frightened) return SPEED.ghostFright;
        return SPEED.ghost;
    }

    getReleaseDots() {
        if (this.name === 'pinky') return 0;
        if (this.name === 'inky') return 30;
        if (this.name === 'clyde') return 60;
        return 0;
    }

    update() {
        this.frame++;

        if (this.inHouse) {
            this.updateInHouse();
            return;
        }

        const oldX = this.x;
        const oldY = this.y;

        if (this.dir === DIR.NONE || (this.dir.x === 0 && this.dir.y === 0)) {
            this.dir = this.chooseDirection(xToCol(this.x), yToRow(this.y));
        }

        let col = xToCol(this.x);
        let row = yToRow(this.y);
        let cx = colToX(col);
        let cy = rowToY(row);
        let spd = this.currentSpeed;

        const atCenter = Math.abs(this.x - cx) <= spd / 2 + 0.5 && Math.abs(this.y - cy) <= spd / 2 + 0.5;

        if (atCenter) {
            this.x = cx;
            this.y = cy;
            col = xToCol(this.x);
            row = yToRow(this.y);

            if (this.eyes && col >= 11 && col <= 16 && row >= 13 && row <= 15) {
                this.revive();
                return;
            }

            if (this.reversePending) {
                this.dir = reverseDir(this.dir);
                this.reversePending = false;
            }

            this.dir = this.chooseDirection(col, row);
            spd = this.currentSpeed;
        }

        this.x += this.dir.x * spd;
        this.y += this.dir.y * spd;

        if (Math.abs(this.x - oldX) < 0.001 && Math.abs(this.y - oldY) < 0.001) {
            this.dir = this.chooseDirection(xToCol(this.x), yToRow(this.y));
            this.x += this.dir.x * spd;
            this.y += this.dir.y * spd;
        }

        if (this.x < -TILE / 2) this.x += CANVAS_W;
        if (this.x > CANVAS_W + TILE / 2) this.x -= CANVAS_W;
    }

    updateInHouse() {
        const homeY = rowToY(14);
        if (!this.released) {
            const offset = Math.sin(this.frame * 0.08) * 3;
            this.y = homeY + offset;
            const needed = this.getReleaseDots();
            if (globalDotCounter >= needed || this.releasedTimer > 0) {
                this.released = true;
            }
        }

        if (this.released) {
            const targetX = colToX(13.5);
            if (Math.abs(this.x - targetX) > 0.5) {
                this.x += Math.sign(targetX - this.x) * 1.0;
                this.y = homeY;
            } else {
                this.x = targetX;
                this.y -= 1.0;
                if (this.y <= rowToY(11)) {
                    this.y = rowToY(11);
                    this.inHouse = false;
                    this.dir = DIR.LEFT;
                }
            }
        }
    }

    revive() {
        this.eyes = false;
        this.frightened = false;
        this.x = colToX(13.5);
        this.y = rowToY(14);
        this.inHouse = true;
        this.released = false;
        this.releasedTimer = 0.5;
        this.dir = DIR.UP;
        this.mode = SCATTER_CHASE[scatterChaseIndex].mode;
    }

    chooseDirection(col, row) {
        const dirs = [DIR.UP, DIR.LEFT, DIR.DOWN, DIR.RIGHT];
        const valid = [];
        for (const d of dirs) {
            if (d.x === -this.dir.x && d.y === -this.dir.y && (this.dir.x !== 0 || this.dir.y !== 0)) continue;
            if (canEnter(col + d.x, row + d.y, this)) valid.push(d);
        }

        if (valid.length === 0) {
            return reverseDir(this.dir);
        }

        if (this.frightened) {
            return valid[Math.floor(Math.random() * valid.length)];
        }

        const target = this.getTarget();
        let best = valid[0];
        let bestDist = Infinity;
        for (const d of valid) {
            const nc = col + d.x;
            const nr = row + d.y;
            const dx = nc - target.col;
            const dy = nr - target.row;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
                bestDist = dist;
                best = d;
            }
        }
        return best;
    }

    getTarget() {
        if (this.eyes) {
            return { col: 13.5, row: 14 };
        }
        if (this.frightened) {
            return null;
        }
        const mode = SCATTER_CHASE[scatterChaseIndex].mode;
        if (mode === 'scatter') return this.scatterTarget;

        const pc = xToCol(pacman.x);
        const pr = yToRow(pacman.y);
        const pdir = pacman.dir;

        if (this.name === 'blinky') {
            return { col: pc, row: pr };
        }
        if (this.name === 'pinky') {
            return { col: pc + pdir.x * 4, row: pr + pdir.y * 4 };
        }
        if (this.name === 'inky') {
            const ahead = { col: pc + pdir.x * 2, row: pr + pdir.y * 2 };
            const blinky = ghosts[0];
            const bc = xToCol(blinky.x);
            const br = yToRow(blinky.y);
            return { col: ahead.col * 2 - bc, row: ahead.row * 2 - br };
        }
        if (this.name === 'clyde') {
            const dx = pc - xToCol(this.x);
            const dy = pr - yToRow(this.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 8) return { col: pc, row: pr };
            return this.scatterTarget;
        }
        return { col: pc, row: pr };
    }

    scare() {
        if (this.eyes) return;
        this.frightened = true;
        this.reversePending = true;
    }

    draw() {
        const flicker = this.frightened && frightTimer < FRIGHT_FLASH_TIME &&
            Math.floor((FRIGHT_TIME - frightTimer) / (FRIGHT_FLASH_TIME / FRIGHT_FLASHES / 2)) % 2 === 0;
        const bodyColor = this.eyes ? null :
            (this.frightened ? (flicker ? '#FFFFFF' : '#2121DE') : this.color);
        const r = TILE * 0.55;

        if (!this.eyes) {
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 1, r, Math.PI, 0);
            ctx.lineTo(this.x + r, this.y + r - 1);
            const wave = this.frame % 2;
            const segments = 3;
            const segW = (r * 2) / segments;
            for (let i = 0; i < segments; i++) {
                const fromX = this.x + r - i * segW;
                const toX = fromX - segW;
                if (i % 2 === wave) {
                    ctx.lineTo(fromX - segW / 2, this.y + r - 1 - segW / 2);
                } else {
                    ctx.lineTo(fromX - segW / 2, this.y + r - 1 + segW / 3);
                }
                ctx.lineTo(toX, this.y + r - 1);
            }
            ctx.closePath();
            ctx.fill();

            if (this.frightened) {
                ctx.fillStyle = flicker ? '#FF0000' : '#FFFFFF';
                const eyeY = this.y - 2;
                ctx.beginPath();
                ctx.arc(this.x - 3, eyeY, 1.8, 0, Math.PI * 2);
                ctx.arc(this.x + 4, eyeY, 1.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = flicker ? '#FF0000' : '#FFFFFF';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                const my = this.y + 4;
                ctx.moveTo(this.x - 5, my);
                ctx.lineTo(this.x - 3, my - 2);
                ctx.lineTo(this.x - 1, my);
                ctx.lineTo(this.x + 1, my - 2);
                ctx.lineTo(this.x + 3, my);
                ctx.lineTo(this.x + 5, my - 2);
                ctx.stroke();
                return;
            }
        }

        const eyeOffsets = {
            left:  { px: -2, py: 0 },
            right: { px: 2, py: 0 },
            up:    { px: 0, py: -2 },
            down:  { px: 0, py: 2 },
            none:  { px: 0, py: 0 },
        };
        const off = eyeOffsets[this.dir.name] || eyeOffsets.none;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 2, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 4, this.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.eyes ? '#FF0000' : '#0000FF';
        ctx.beginPath();
        ctx.arc(this.x - 3 + off.px, this.y - 2 + off.py, 1.6, 0, Math.PI * 2);
        ctx.arc(this.x + 4 + off.px, this.y - 2 + off.py, 1.6, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== GAME LOGIC ====================
function triggerFrightened() {
    for (const g of ghosts) {
        g.scare();
    }
    frightTimer = FRIGHT_TIME;
    ghostsEatenInPower = 0;
    try { sound.startFright(); } catch (e) {}
}

function checkGhostRelease() {
    for (const g of ghosts) {
        if (g.inHouse && !g.released) {
            if (globalDotCounter >= g.getReleaseDots()) {
                g.released = true;
            }
        }
    }
}

function checkFruitSpawn() {
    if (!fruit && dotsAtFruit === 0 && dotsEaten === 70) {
        spawnFruit();
        dotsAtFruit = 70;
    } else if (!fruit && dotsAtFruit === 70 && dotsEaten === 170) {
        spawnFruit();
        dotsAtFruit = 170;
    }
}

function spawnFruit() {
    const f = fruitForLevel(level);
    fruit = {
        x: colToX(13.5),
        y: rowToY(17),
        type: f,
        timer: 9,
    };
}

function checkCollisions() {
    for (const g of ghosts) {
        if (g.eyes || g.inHouse) continue;
        const dx = g.x - pacman.x;
        const dy = g.y - pacman.y;
        if (Math.abs(dx) < TILE * 0.6 && Math.abs(dy) < TILE * 0.6) {
            if (g.frightened) {
                g.eyes = true;
                g.frightened = false;
                const pts = [200, 400, 800, 1600][ghostsEatenInPower];
                ghostsEatenInPower++;
                score += pts;
                try { sound.eatGhost(); } catch (e) {}
                showScorePopup(g.x, g.y, pts);
                updateHUD();
            } else if (!pacman.dead) {
                pacmanDeath();
            }
        }
    }

    if (fruit && fruit.timer > 0) {
        const dx = fruit.x - pacman.x;
        const dy = fruit.y - pacman.y;
        if (Math.abs(dx) < TILE * 0.7 && Math.abs(dy) < TILE * 0.7) {
            score += fruit.type.score;
            showScorePopup(fruit.x, fruit.y, fruit.type.score);
            try { sound.eatFruit(); } catch (e) {}
            fruit = null;
            updateHUD();
        }
    }
}

let scorePopups = [];

function showScorePopup(x, y, pts) {
    scorePopups.push({ x, y, pts, life: 1.0 });
}

function pacmanDeath() {
    pacman.dead = true;
    gameState = 'death';
    stateTimer = DEATH_ANIM_TIME;
    try { sound.stopSiren(); sound.stopFrightenedLoop(); sound.lastMode = 'none'; sound.death(); } catch (e) {}
}

function updateModeTimers(dt) {
    if (frightTimer > 0) {
        frightTimer -= dt;
        if (frightTimer <= 0) {
            frightTimer = 0;
            for (const g of ghosts) {
                if (g.frightened) {
                    g.frightened = false;
                }
            }
        }
        return;
    }

    scatterChaseTimer -= dt;
    if (scatterChaseTimer <= 0 && scatterChaseIndex < SCATTER_CHASE.length - 1) {
        scatterChaseIndex++;
        scatterChaseTimer = SCATTER_CHASE[scatterChaseIndex].t;
        for (const g of ghosts) {
            if (!g.frightened && !g.eyes && !g.inHouse) {
                g.reversePending = true;
            }
        }
    }
}

function update(dt) {
    frameCount++;

    if (gameState === 'ready') {
        stateTimer -= dt;
        if (stateTimer <= 0) {
            gameState = 'playing';
        }
        return;
    }

    if (gameState === 'death') {
        stateTimer -= dt;
        pacman.deathAngle += dt * Math.PI * 1.1;
        if (stateTimer <= 0) {
            lives--;
            updateHUD();
            if (lives <= 0) {
                gameState = 'gameover';
                showOverlay('GAME OVER', 'Press SPACE to play again');
                return;
            }
            pacman = new PacMan();
            ghosts = [new Ghost('blinky'), new Ghost('pinky'), new Ghost('inky'), new Ghost('clyde')];
            // Keep globalDotCounter intact across deaths so already-released ghosts
            // re-emerge immediately instead of being re-trapped in the house.
            frightTimer = 0;
            gameState = 'ready';
            stateTimer = READY_TIME;
        }
        return;
    }

    if (gameState === 'levelcomplete') {
        stateTimer -= dt;
        if (stateTimer <= 0) {
            level++;
            initLevel(true);
        }
        return;
    }

    if (gameState === 'gameover') return;

    updateModeTimers(dt);

    pacman.update();
    for (const g of ghosts) {
        try { g.update(); } catch (e) { console.error('Ghost update error:', e, g.name); }
    }

    if (fruit && fruit.timer > 0) {
        fruit.timer -= dt;
        if (fruit.timer <= 0) fruit = null;
    }

    for (const g of ghosts) {
        if (g.releasedTimer > 0) g.releasedTimer -= dt;
    }

    checkCollisions();

    for (let i = scorePopups.length - 1; i >= 0; i--) {
        scorePopups[i].life -= dt * 1.5;
        if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
    }

    if (dotsEaten >= totalDots) {
        gameState = 'levelcomplete';
        stateTimer = LEVEL_COMPLETE_TIME;
        try { sound.stopSiren(); sound.stopFrightenedLoop(); sound.lastMode = 'none'; sound.levelComplete(); } catch (e) {}
    }

    try { sound.updateSiren(dotsEaten, totalDots); } catch (e) {}
}

// ==================== RENDER ====================
function renderMazeOffscreen() {
    if (!mazeCanvas) {
        mazeCanvas = document.createElement('canvas');
        mazeCanvas.width = CANVAS_W;
        mazeCanvas.height = CANVAS_H;
        mazeCtx = mazeCanvas.getContext('2d');
    }
    const savedCtx = ctx;
    ctx = mazeCtx;
    mazeCtx.fillStyle = '#000';
    mazeCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawMaze();
    ctx = savedCtx;
}

function render() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (gameState === 'levelcomplete') {
        const flash = Math.floor(frameCount / 8) % 2;
        drawMaze(flash ? '#FFFFFF' : '#2121DE');
        drawDots();
        return;
    }

    if (mazeCanvas) {
        ctx.drawImage(mazeCanvas, 0, 0);
    } else {
        drawMaze();
    }
    drawDots();
    drawFruit();
    pacman.draw();
    for (const g of ghosts) g.draw();
    drawScorePopups();

    if (gameState === 'ready') {
        drawCenterText('READY!', '#FFFF00', colToX(13.5), rowToY(17));
    }
}

function drawMaze(colorOverride) {
    const wallColor = colorOverride || '#2121DE';

    ctx.strokeStyle = wallColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'square';

    ctx.beginPath();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const t = grid[r][c];
            if (t === T.WALL || t === T.DOOR) continue;
            if (isOutside(c, r)) continue;

            const x = c * TILE;
            const y = r * TILE;

            if (isWallOrOutside(c, r - 1)) { ctx.moveTo(x, y); ctx.lineTo(x + TILE, y); }
            if (isWallOrOutside(c, r + 1)) { ctx.moveTo(x, y + TILE); ctx.lineTo(x + TILE, y + TILE); }
            if (isWallOrOutside(c - 1, r)) { ctx.moveTo(x, y); ctx.lineTo(x, y + TILE); }
            if (isWallOrOutside(c + 1, r)) { ctx.moveTo(x + TILE, y); ctx.lineTo(x + TILE, y + TILE); }
        }
    }
    ctx.stroke();

    ctx.strokeStyle = '#FFB8DE';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === T.DOOR) {
                ctx.beginPath();
                ctx.moveTo(c * TILE + 1, r * TILE + TILE / 2);
                ctx.lineTo((c + 1) * TILE - 1, r * TILE + TILE / 2);
                ctx.stroke();
            }
        }
    }
}

function drawDots() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const t = grid[r][c];
            if (t === T.DOT) {
                ctx.fillStyle = '#FFB897';
                ctx.beginPath();
                ctx.arc(colToX(c), rowToY(r), 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (t === T.PELLET) {
                const pulse = 4 + Math.sin(frameCount * 0.2) * 1.5;
                ctx.fillStyle = '#FFB897';
                ctx.beginPath();
                ctx.arc(colToX(c), rowToY(r), pulse, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

// ---- Pixel-art fruit sprites (16x16), styled after the arcade originals ----
const SPRITE_PAL = {
    '.': null,
    R: '#E31010', H: '#FF8E8E',
    G: '#19B219', L: '#5FD65F', E: '#0C7A0C',
    O: '#FF9A1E',
    Y: '#FFD21E',
    W: '#FFFFFF',
    B: '#2A7BFF',
    C: '#5AC8FF',
    N: '#8A5A22',
};

const SPRITES = {
    cherry: [
        "................",
        ".........LL.....",
        "........GLL.....",
        ".......G.G......",
        "......G...G.....",
        ".....G....G.....",
        ".....G....G.....",
        "....G.....G.....",
        "....G.....G.....",
        "...RRR...RRR....",
        "..RRRRR.RRRRR...",
        "..RHRRR.RRHRR...",
        "..RRRRR.RRRRR...",
        "..RRRRR.RRRRR...",
        "...RRR...RRR....",
        "................",
    ],
    strawberry: [
        "................",
        "......EGE.......",
        "....GGGGGGG.....",
        "..GGG.GGG.GGG...",
        ".RRRRRRRRRRRRR..",
        ".RWRRRWRRRWRRR..",
        ".RRRRRRRRRRRRR..",
        "..RWRRRWRRRWR...",
        "..RRRRRRRRRRR...",
        "...RWRRRWRRR....",
        "...RRRRRRRRR....",
        "....RWRRRWR.....",
        ".....RRRRR......",
        "......RRR.......",
        ".......R........",
        "................",
    ],
    orange: [
        "................",
        ".......NN.......",
        ".......NNLLL....",
        ".......NLLL.....",
        "....OOOOOOOO....",
        "...OOOOOOOOOO...",
        "..OOOOOOOOOOOO..",
        "..OOWWOOOOOOOO..",
        ".OOOOOOOOOOOOOO.",
        ".OOOOOOOOOOOOOO.",
        ".OOOOOOOOOOOOOO.",
        "..OOOOOOOOOOOO..",
        "...OOOOOOOOOO...",
        "....OOOOOOOO....",
        ".....OOOOOO.....",
        "................",
    ],
    apple: [
        "................",
        ".......N........",
        ".......N.LL.....",
        "......N.LLLL....",
        "....RR.N.RR.....",
        "...RRRRRRRRRR...",
        "..RRRRRRRRRRRR..",
        ".RRRRRRRRRRRRRR.",
        ".RRWRRRRRRRRRRR.",
        ".RRRRRRRRRRRRRR.",
        ".RRRRRRRRRRRRRR.",
        "..RRRRRRRRRRRR..",
        "..RRRRRRRRRRRR..",
        "...RRRR..RRRR...",
        "....RR....RR....",
        "................",
    ],
    melon: [
        "................",
        ".......N........",
        "......NN........",
        "....LLLLLLLL....",
        "..LLLLLLLLLLLL..",
        ".LLLLLLLLLLLLLL.",
        ".LLELLELLELLELL.",
        ".LLELLELLELLELL.",
        ".LLELLELLELLELL.",
        ".LLELLELLELLELL.",
        ".LLLLLLLLLLLLLL.",
        "..LLLLLLLLLLLL..",
        "...LLLLLLLLLL...",
        "....LLLLLLLL....",
        "......LLLL......",
        "................",
    ],
    galaxian: [
        "................",
        ".......WW.......",
        ".......YY.......",
        "......YYYY......",
        "......YRRY......",
        "......YRRY......",
        ".....YYYYYY.....",
        ".B...YYYYYY...B.",
        ".BB.YYYYYYYY.BB.",
        "BBBBYYYYYYYYBBBB",
        "BBB.YYYYYYYY.BBB",
        "B...YYYYYYYY...B",
        ".....YY..YY.....",
        "....YY....YY....",
        "...YY......YY...",
        "................",
    ],
    bell: [
        "................",
        ".......YY.......",
        ".......YY.......",
        "......YYYY......",
        ".....YYWYYY.....",
        ".....YYWYYY.....",
        "....YYWYYYYY....",
        "....YYWYYYYY....",
        "...YYYWYYYYYY...",
        "...YYYWYYYYYY...",
        "..YYYYWYYYYYYY..",
        "..YYYYYYYYYYYY..",
        ".YYYYYYYYYYYYYY.",
        ".YYYYYYYYYYYYYY.",
        ".WWWWWWWWWWWWWW.",
        ".......YY.......",
    ],
    key: [
        "................",
        "......CCCC......",
        ".....CC..CC.....",
        ".....CC..CC.....",
        ".....CC..CC.....",
        "......CCCC......",
        ".......CC.......",
        ".......CC.......",
        ".......CC.......",
        ".......CC.......",
        ".......CCC......",
        ".......CC.......",
        ".......CCC......",
        ".......CC.......",
        ".......CC.......",
        "................",
    ],
};

function drawSpriteOn(c, pix, cx, cy, px) {
    const rows = pix.length, cols = pix[0].length;
    const ox = cx - (cols * px) / 2;
    const oy = cy - (rows * px) / 2;
    for (let r = 0; r < rows; r++) {
        const line = pix[r];
        for (let col = 0; col < cols; col++) {
            const color = SPRITE_PAL[line[col]];
            if (!color) continue;
            c.fillStyle = color;
            c.fillRect(ox + col * px, oy + r * px, px, px);
        }
    }
}

// On-screen size of the in-maze fruit (world pixels). One tile is 16px.
const FRUIT_SIZE = 22;
const spriteCanvasCache = {};

function getSpriteCanvas(shape) {
    if (spriteCanvasCache[shape]) return spriteCanvasCache[shape];
    const cv = document.createElement('canvas');
    cv.width = 16;
    cv.height = 16;
    drawSpriteOn(cv.getContext('2d'), SPRITES[shape] || SPRITES.cherry, 8, 8, 1);
    spriteCanvasCache[shape] = cv;
    return cv;
}

function drawFruit() {
    if (!fruit) return;
    const img = getSpriteCanvas(fruit.type.shape);
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;   // keep the pixels crisp when scaled
    ctx.drawImage(img, fruit.x - FRUIT_SIZE / 2, fruit.y - FRUIT_SIZE / 2, FRUIT_SIZE, FRUIT_SIZE);
    ctx.imageSmoothingEnabled = prev;
}

function drawScorePopups() {
    ctx.font = 'bold 12px "Courier New"';
    ctx.textAlign = 'center';
    for (const p of scorePopups) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = '#00FFFF';
        ctx.fillText(p.pts, p.x, p.y - 10);
    }
    ctx.globalAlpha = 1;
}

function drawCenterText(text, color, x, y) {
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

// ==================== HUD ====================
function updateHUD() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    const livesEl = document.getElementById('lives');
    livesEl.innerHTML = '';
    for (let i = 0; i < lives - 1; i++) {
        const icon = document.createElement('div');
        icon.className = 'life-icon';
        livesEl.appendChild(icon);
    }
    const fruitRow = document.getElementById('fruit-row');
    fruitRow.replaceChildren();
    // Arcade-style row of the recent levels' fruits, newest on the right (max 7).
    const start = Math.max(1, level - 6);
    for (let lvl = start; lvl <= level; lvl++) {
        const f = fruitForLevel(lvl);
        const cv = document.createElement('canvas');
        cv.width = 32;
        cv.height = 32;
        cv.className = 'fruit-icon';
        drawSpriteOn(cv.getContext('2d'), SPRITES[f.shape], 16, 16, 2);
        fruitRow.appendChild(cv);
    }
}

function showOverlay(text, subtext) {
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    const txt = document.getElementById('overlay-text');
    txt.textContent = text;
    if (subtext) {
        txt.innerHTML = text + '<br><span style="font-size:14px;color:#fff;letter-spacing:2px">' + subtext + '</span>';
    }
}

function hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
}

// ==================== INPUT ====================
function setupInput() {
    document.addEventListener('keydown', (e) => {
        if (!pacman) return;
        if (gameState === 'gameover' && (e.key === ' ' || e.key === 'Enter')) {
            hideOverlay();
            score = 0;
            level = 1;
            lives = 3;
            initLevel(true);
            e.preventDefault();
            return;
        }
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': pacman.nextDir = DIR.UP; e.preventDefault(); break;
            case 'ArrowDown': case 's': case 'S': pacman.nextDir = DIR.DOWN; e.preventDefault(); break;
            case 'ArrowLeft': case 'a': case 'A': pacman.nextDir = DIR.LEFT; e.preventDefault(); break;
            case 'ArrowRight': case 'd': case 'D': pacman.nextDir = DIR.RIGHT; e.preventDefault(); break;
        }
    });
}

// ==================== GAME LOOP ====================
function gameLoop(timestamp) {
    try {
        const delta = Math.min(timestamp - lastTime, 100);
        lastTime = timestamp;
        accumulator += delta;

        while (accumulator >= FRAME_TIME) {
            update(FRAME_TIME / 1000);
            accumulator -= FRAME_TIME;
        }

        render();
    } catch (e) {
        console.error('Game loop error:', e);
    }
    requestAnimationFrame(gameLoop);
}

// ==================== SOUND ====================
class SoundManager {
    constructor() {
        this.ctx = null;
        this.wakaToggle = false;
        this.enabled = true;
        this.sirenNodes = null;
        this.frightNodes = null;
        this.sirenLevel = -1;
        this.lastMode = 'none';
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.ctx.state === 'suspended') this.ctx.resume();
        } catch (e) {
            this.enabled = false;
        }
    }

    _connect(osc, gain, vol) {
        gain.gain.value = vol;
        osc.connect(gain);
        gain.connect(this.ctx.destination);
    }

    waka() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        const dur = 0.07;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        if (this.wakaToggle) {
            osc.frequency.setValueAtTime(280, t);
            osc.frequency.linearRampToValueAtTime(520, t + dur * 0.5);
            osc.frequency.linearRampToValueAtTime(280, t + dur);
        } else {
            osc.frequency.setValueAtTime(520, t);
            osc.frequency.linearRampToValueAtTime(280, t + dur * 0.5);
            osc.frequency.linearRampToValueAtTime(520, t + dur);
        }
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
        this.wakaToggle = !this.wakaToggle;
    }

    eatGhost() {
        if (!this.enabled) return;
        const notes = [262, 330, 392, 523, 659, 784, 988, 1175];
        const stepDur = 0.035;
        for (let i = 0; i < notes.length; i++) {
            const t = this.ctx.currentTime + i * stepDur;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(notes[i], t);
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 1.5);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + stepDur * 1.5);
        }
    }

    eatFruit() {
        if (!this.enabled) return;
        const notes = [[523, 0.06], [0, 0.02], [659, 0.06], [0, 0.02], [784, 0.12]];
        let t = 0;
        for (const [freq, dur] of notes) {
            if (freq > 0) {
                const start = this.ctx.currentTime + t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.12, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(start);
                osc.stop(start + dur);
            }
            t += dur;
        }
    }

    death() {
        if (!this.enabled) return;
        const t0 = this.ctx.currentTime;
        // The arcade death is a series of descending downward "swoops", each
        // starting a little lower than the last, not one smooth glide.
        const swoops = 8;
        let f = 1000;
        let t = 0;
        for (let i = 0; i < swoops; i++) {
            const dur = 0.13;
            const start = t0 + t;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(f, start);
            osc.frequency.exponentialRampToValueAtTime(f * 0.5, start + dur);
            gain.gain.setValueAtTime(0.12, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + dur);
            f *= 0.82;
            t += dur * 0.92;
        }
        // final low blip
        const start = t0 + t;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(60, start + 0.3);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.3);
    }

    playIntro() {
        if (!this.enabled) return;
        const N = {
            DS5: 622.25, E5: 659.25, F5: 698.46, FS5: 739.99,
            G5: 783.99, GS5: 830.61, A5: 880.00, B5: 987.77,
            C6: 1046.50, R: 0
        };
        const a = 0.105;   // quick arpeggio note
        const h = 0.17;    // held note
        // Transcribed from the arcade intro: descending major-triad arpeggio
        // figures answered by a rising chromatic climb, over two phrases.
        const melody = [
            [N.B5, a], [N.FS5, a], [N.DS5, h], [N.B5, a], [N.FS5, a], [N.DS5, h],
            [N.C6, a], [N.G5, a], [N.E5, h], [N.G5, a], [N.E5, h], [N.R, a],
            [N.B5, a], [N.FS5, a], [N.DS5, h], [N.B5, a], [N.FS5, a], [N.DS5, h],
            [N.DS5, a], [N.E5, a], [N.F5, a], [N.FS5, a], [N.G5, a], [N.GS5, a],
            [N.A5, a], [N.B5, h * 2.4],
        ];

        let t = 0;
        for (const [freq, dur] of melody) {
            if (freq > 0) {
                const start = this.ctx.currentTime + t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.1, start + 0.01);
                gain.gain.setValueAtTime(0.1, start + dur * 0.7);
                gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(start);
                osc.stop(start + dur);
            }
            t += dur;
        }
    }

    levelComplete() {
        if (!this.enabled) return;
        const N = {
            C5: 523, D5: 587, E5: 659, F5: 698, G5: 784,
            A5: 880, B5: 988, C6: 1047, R: 0
        };
        const melody = [
            [N.C5, 0.08], [N.E5, 0.08], [N.G5, 0.08], [N.C6, 0.12],
            [N.R, 0.03],
            [N.B5, 0.08], [N.G5, 0.08], [N.E5, 0.08], [N.C5, 0.12],
            [N.R, 0.03],
            [N.D5, 0.08], [N.F5, 0.08], [N.A5, 0.08], [N.D5, 0.12],
            [N.R, 0.15],
            [N.G5, 0.15], [N.C6, 0.15], [N.E5, 0.15],
        ];
        let t = 0;
        for (const [freq, dur] of melody) {
            if (freq > 0) {
                const start = this.ctx.currentTime + t;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.1, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(start);
                osc.stop(start + dur);
            }
            t += dur;
        }
    }

    _stopLoop(nodes) {
        if (!nodes) return null;
        try {
            for (const n of nodes.oscs) {
                try { n.stop(this.ctx.currentTime + 0.05); } catch (e) {}
            }
            for (const g of nodes.gains) {
                try { g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05); } catch (e) {}
            }
        } catch (e) {}
        return null;
    }

    startSiren() {
        if (!this.enabled) return;
        this.sirenNodes = this._stopLoop(this.sirenNodes);
        const t = this.ctx.currentTime;
        const lvl = Math.max(0, Math.min(3, this.sirenLevel));
        const baseFreq = [110, 125, 142, 162][lvl];
        const modRate = [5.0, 5.6, 6.3, 7.2][lvl];
        const modDepth = baseFreq * 0.5;

        const carrier = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const sirenGain = this.ctx.createGain();

        carrier.type = 'square';
        carrier.frequency.value = baseFreq;

        // A rising sawtooth ramp that snaps back each cycle reads as a siren,
        // unlike a smooth sine vibrato. Rate/pitch climb as dots are cleared.
        lfo.type = 'sawtooth';
        lfo.frequency.value = modRate;
        lfoGain.gain.value = modDepth;

        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);

        sirenGain.gain.value = 0.05;

        carrier.connect(sirenGain);
        sirenGain.connect(this.ctx.destination);

        carrier.start(t);
        lfo.start(t);

        this.sirenNodes = { oscs: [carrier, lfo], gains: [sirenGain] };
    }

    stopSiren() {
        this.sirenNodes = this._stopLoop(this.sirenNodes);
    }

    startFrightenedLoop() {
        if (!this.enabled) return;
        this.frightNodes = this._stopLoop(this.frightNodes);
        const t = this.ctx.currentTime;

        const carrier = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        carrier.type = 'square';
        carrier.frequency.value = 200;

        lfo.type = 'square';
        lfo.frequency.value = 9;
        lfoGain.gain.value = 80;

        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);

        gain.gain.value = 0.05;

        carrier.connect(gain);
        gain.connect(this.ctx.destination);

        carrier.start(t);
        lfo.start(t);

        this.frightNodes = { oscs: [carrier, lfo], gains: [gain] };
    }

    stopFrightenedLoop() {
        this.frightNodes = this._stopLoop(this.frightNodes);
    }

    startFright() {
        if (!this.enabled) return;
        this.stopSiren();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(360, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    updateSiren(eaten, total) {
        if (!this.enabled) return;
        if (gameState !== 'playing') {
            this.stopSiren();
            this.stopFrightenedLoop();
            this.lastMode = 'none';
            return;
        }

        if (frightTimer > 0) {
            if (this.lastMode !== 'frightened') {
                this.stopSiren();
                this.startFrightenedLoop();
                this.lastMode = 'frightened';
            }
            return;
        }

        if (this.lastMode !== 'siren') {
            this.stopFrightenedLoop();
            const newLevel = eaten < total * 0.25 ? 0 : eaten < total * 0.5 ? 1 : eaten < total * 0.75 ? 2 : 3;
            this.sirenLevel = newLevel;
            this.startSiren();
            this.lastMode = 'siren';
            return;
        }

        const newLevel = eaten < total * 0.3 ? 0 : eaten < total * 0.6 ? 1 : 2;
        if (newLevel !== this.sirenLevel) {
            this.sirenLevel = newLevel;
            this.startSiren();
        }
    }
}
