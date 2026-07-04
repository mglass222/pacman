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

const FRIGHT_FLASH_TIME = 2.5;
const FRIGHT_FLASHES = 5;
const DOT_STALL_FRAMES = 1;
const PELLET_STALL_FRAMES = 3;
const EAT_GHOST_PAUSE = 0.45;
const GHOST_NO_UP_TURNS = new Set(['12,11', '15,11', '12,23', '15,23']);
const PAC_MOUTH_FRAMES = [0.06, 0.28, 0.52, 0.28];
const GHOST_FOOT_RATE = 8;
const FRIGHT_BLUE = '#0000BB';
const FRIGHT_FACE = '#FFB897';
const PAC_RADIUS = TILE * 0.72;
const GHOST_HALF_W = TILE * 0.68;
const GHOST_TOP = TILE * 0.72;
const GHOST_BOTTOM = TILE * 0.68;
const MAZE_PATH_EXPAND = TILE * 0.25;
const MAZE_CORNER_RADIUS = TILE * 0.24;
const OUTER_MAZE_RADIUS = TILE * 0.48;

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

function frightTimeForLevel(lvl) {
    if (lvl === 1) return 6;
    if (lvl <= 4) return 5;
    if (lvl <= 8) return 3;
    if (lvl <= 16) return 2;
    return 1;
}

function levelSpeedScale() {
    if (level <= 1) return 1;
    if (level <= 4) return 1.04;
    if (level <= 20) return 1.08;
    return 1.02;
}

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
let activeFrightTime;
let ghostsEatenInPower;
let dotsAtFruit;
let globalDotCounter;
let stateTimer;
let eatGhostPauseTimer;
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
    activeFrightTime = frightTimeForLevel(level);
    ghostsEatenInPower = 0;
    dotsAtFruit = 0;
    stateTimer = READY_TIME;
    eatGhostPauseTimer = 0;
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

function isGhostNoUpTurn(col, row, ghost) {
    if (!ghost || ghost.frightened || ghost.eyes) return false;
    return GHOST_NO_UP_TURNS.has(col + ',' + row);
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
        this.stallFrames = 0;
    }

    get speed() {
        const col = xToCol(this.x);
        const row = yToRow(this.y);
        let s = (tileAt(col, row) === T.DOT || tileAt(col, row) === T.PELLET) ? SPEED.pacmanDots : SPEED.pacman;
        return s * levelSpeedScale();
    }

    update() {
        if (this.dead) return;
        if (this.stallFrames > 0) {
            this.stallFrames--;
            return;
        }
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
            this.stallFrames = DOT_STALL_FRAMES;
            try { sound.waka(); } catch (e) {}
            checkFruitSpawn();
            checkGhostRelease();
            updateHUD();
        } else if (t === T.PELLET) {
            grid[row][col] = T.EMPTY;
            dotsEaten++;
            globalDotCounter++;
            score += 50;
            this.stallFrames = PELLET_STALL_FRAMES;
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
            const a = Math.min(Math.PI, this.deathAngle);
            const radius = PAC_RADIUS * Math.max(0, 1 - Math.max(0, this.deathAngle - Math.PI) * 0.8);
            if (radius > 0.5) {
                ctx.arc(0, 0, radius, -Math.PI / 2 + a, Math.PI * 1.5 - a);
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
        const mouthIndex = Math.floor(frameCount / 4) % PAC_MOUTH_FRAMES.length;
        const ma = this.dir === DIR.NONE ? 0.04 : PAC_MOUTH_FRAMES[mouthIndex];
        ctx.arc(0, 0, PAC_RADIUS, ma, Math.PI * 2 - ma);
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
        let s = SPEED.ghost * levelSpeedScale();
        if (this.name === 'blinky') {
            const remaining = totalDots - dotsEaten;
            if (remaining <= 10) s += 0.35;
            else if (remaining <= 20) s += 0.18;
        }
        return s;
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
            if (d === DIR.UP && isGhostNoUpTurn(col, row, this)) continue;
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
        const aheadTile = (n) => {
            if (pdir === DIR.UP) return { col: pc - n, row: pr - n };
            return { col: pc + pdir.x * n, row: pr + pdir.y * n };
        };

        if (this.name === 'blinky') {
            return { col: pc, row: pr };
        }
        if (this.name === 'pinky') {
            return aheadTile(4);
        }
        if (this.name === 'inky') {
            const ahead = aheadTile(2);
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
        const flashWindow = Math.min(FRIGHT_FLASH_TIME, activeFrightTime);
        const flicker = this.frightened && flashWindow > 0 && frightTimer < flashWindow &&
            Math.floor((activeFrightTime - frightTimer) / (flashWindow / FRIGHT_FLASHES / 2)) % 2 === 0;
        const bodyColor = this.eyes ? null : (this.frightened ? (flicker ? '#FFFFFF' : FRIGHT_BLUE) : this.color);
        const faceColor = this.frightened ? (flicker ? '#FF0000' : FRIGHT_FACE) : '#0000FF';
        const x = Math.round(this.x);
        const y = Math.round(this.y);

        if (!this.eyes) {
            const halfW = GHOST_HALF_W;
            const top = y - GHOST_TOP;
            const sideTop = y - TILE * 0.22;
            const footY = y + GHOST_BOTTOM;
            const footHigh = y + TILE * 0.34;
            const footLow = y + TILE * 0.72;
            const wave = Math.floor(this.frame / GHOST_FOOT_RATE) % 2;

            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.moveTo(x - halfW, footY);
            ctx.lineTo(x - halfW, sideTop);
            ctx.quadraticCurveTo(x - halfW, top, x, top);
            ctx.quadraticCurveTo(x + halfW, top, x + halfW, sideTop);
            ctx.lineTo(x + halfW, footY);
            const footTips = wave === 0
                ? [[x + 6, footHigh], [x + 2, footLow], [x - 2, footHigh], [x - 6, footLow], [x - halfW, footY]]
                : [[x + 6, footLow], [x + 2, footHigh], [x - 2, footLow], [x - 6, footHigh], [x - halfW, footY]];
            for (const [fx, fy] of footTips) ctx.lineTo(fx, fy);
            ctx.closePath();
            ctx.fill();

            if (this.frightened) {
                ctx.fillStyle = faceColor;
                ctx.fillRect(x - 6, y - 5, 3, 3);
                ctx.fillRect(x + 4, y - 5, 3, 3);
                ctx.strokeStyle = faceColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - 7, y + 5);
                ctx.lineTo(x - 5, y + 3);
                ctx.lineTo(x - 2, y + 5);
                ctx.lineTo(x, y + 3);
                ctx.lineTo(x + 2, y + 5);
                ctx.lineTo(x + 5, y + 3);
                ctx.lineTo(x + 7, y + 5);
                ctx.stroke();
                return;
            }
        }

        const eyeOffsets = {
            left:  { px: -2.8, py: 0 },
            right: { px: 2.8, py: 0 },
            up:    { px: 0, py: -2.8 },
            down:  { px: 0, py: 2.8 },
            none:  { px: 0, py: 0 },
        };
        const off = eyeOffsets[this.dir.name] || eyeOffsets.none;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(x - 5, y - 4, 3.5, 4.8, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 5, y - 4, 3.5, 4.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0000FF';
        ctx.beginPath();
        ctx.arc(x - 5 + off.px, y - 4 + off.py, 2, 0, Math.PI * 2);
        ctx.arc(x + 5 + off.px, y - 4 + off.py, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== GAME LOGIC ====================
function triggerFrightened() {
    for (const g of ghosts) {
        g.scare();
    }
    activeFrightTime = frightTimeForLevel(level);
    frightTimer = activeFrightTime;
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
                eatGhostPauseTimer = EAT_GHOST_PAUSE;
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

    if (eatGhostPauseTimer > 0) {
        eatGhostPauseTimer -= dt;
        for (let i = scorePopups.length - 1; i >= 0; i--) {
            scorePopups[i].life -= dt * 0.8;
            if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
        }
        return;
    }

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
    const wallColor = colorOverride || '#2727FF';
    const wallShadow = colorOverride ? colorOverride : '#00006F';

    const drawMazeEdges = (color, width) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'round';

        const isOpenTile = (c, r) => {
            if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
            const t = grid[r][c];
            return t !== T.WALL && t !== T.DOOR && !isOutside(c, r);
        };

        const key = (x, y) => x + ',' + y;
        const edges = [];
        const addEdge = (sx, sy, ex, ey, nx, ny) => {
            edges.push({ sx, sy, ex, ey, nx, ny, dx: ex - sx, dy: ey - sy });
        };
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!isOpenTile(c, r)) continue;
                if (isWallOrOutside(c, r - 1)) addEdge(c, r, c + 1, r, 0, -1);
                if (isWallOrOutside(c + 1, r) && !(r === 14 && c === COLS - 1)) addEdge(c + 1, r, c + 1, r + 1, 1, 0);
                if (isWallOrOutside(c, r + 1)) addEdge(c + 1, r + 1, c, r + 1, 0, 1);
                if (isWallOrOutside(c - 1, r) && !(r === 14 && c === 0)) addEdge(c, r + 1, c, r, -1, 0);
            }
        }

        const incident = new Map();
        const vertexEdges = new Map();
        const addIncident = (x, y) => {
            const vertexKey = key(x, y);
            incident.set(vertexKey, (incident.get(vertexKey) || 0) + 1);
        };
        edges.forEach((edge, index) => {
            addIncident(edge.sx, edge.sy);
            addIncident(edge.ex, edge.ey);
            for (const vertexKey of [key(edge.sx, edge.sy), key(edge.ex, edge.ey)]) {
                if (!vertexEdges.has(vertexKey)) vertexEdges.set(vertexKey, []);
                vertexEdges.get(vertexKey).push(index);
            }
        });

        const starts = new Map();
        edges.forEach((edge, index) => {
            const startKey = key(edge.sx, edge.sy);
            if (!starts.has(startKey)) starts.set(startKey, []);
            starts.get(startKey).push(index);
        });

        const used = new Set();
        const contours = [];
        const chooseNext = (from, candidates) => {
            const prevDx = from.dx;
            const prevDy = from.dy;
            let best = candidates[0];
            let bestScore = -Infinity;
            for (const index of candidates) {
                const next = edges[index];
                const dot = prevDx * next.dx + prevDy * next.dy;
                const cross = prevDx * next.dy - prevDy * next.dx;
                const score = (cross < 0 ? 4 : 0) + (dot > 0 ? 2 : 0) + (cross === 0 ? 1 : 0);
                if (score > bestScore) {
                    best = index;
                    bestScore = score;
                }
            }
            return best;
        };

        for (let i = 0; i < edges.length; i++) {
            if (used.has(i)) continue;
            const contour = [];
            let index = i;
            while (index !== undefined && !used.has(index)) {
                const edge = edges[index];
                contour.push(edge);
                used.add(index);
                const nextEdges = (starts.get(key(edge.ex, edge.ey)) || []).filter((next) => !used.has(next));
                index = nextEdges.length ? chooseNext(edge, nextEdges) : undefined;
                if (index === i) break;
            }
            if (contour.length) contours.push(contour);
        }

        const turnsInto = (from, to) => from && to && (from.dx !== to.dx || from.dy !== to.dy);
        const isSimpleVertex = (x, y) => (incident.get(key(x, y)) || 0) === 2;
        const jointPoint = (from, to, x, y) => ({
            x: x * TILE + (from.nx + to.nx) * MAZE_PATH_EXPAND,
            y: y * TILE + (from.ny + to.ny) * MAZE_PATH_EXPAND,
        });
        const neighborAtVertex = (edge, x, y) => {
            const candidates = vertexEdges.get(key(x, y)) || [];
            for (const index of candidates) {
                const other = edges[index];
                if (other === edge) continue;
                if (other.dx !== edge.dx || other.dy !== edge.dy) return other;
            }
            return null;
        };
        const pointOnEdge = (edge, atEnd, trim) => {
            const x = (atEnd ? edge.ex : edge.sx) * TILE + edge.nx * MAZE_PATH_EXPAND;
            const y = (atEnd ? edge.ey : edge.sy) * TILE + edge.ny * MAZE_PATH_EXPAND;
            const sign = atEnd ? -1 : 1;
            return {
                x: x + edge.dx * trim * sign,
                y: y + edge.dy * trim * sign,
            };
        };
        const openEndpoint = (edge, atEnd) => {
            const vx = atEnd ? edge.ex : edge.sx;
            const vy = atEnd ? edge.ey : edge.sy;
            const neighbor = neighborAtVertex(edge, vx, vy);
            return neighbor ? jointPoint(edge, neighbor, vx, vy) : pointOnEdge(edge, atEnd, 0);
        };

        ctx.beginPath();
        for (const contour of contours) {
            const closed = contour.length > 1 &&
                contour[0].sx === contour[contour.length - 1].ex &&
                contour[0].sy === contour[contour.length - 1].ey;
            const startEdge = contour[0];
            const previousEdge = closed ? contour[contour.length - 1] : null;
            const startTurn = turnsInto(previousEdge, startEdge) && isSimpleVertex(startEdge.sx, startEdge.sy);
            let start;
            if (turnsInto(previousEdge, startEdge) && !startTurn) {
                start = jointPoint(previousEdge, startEdge, startEdge.sx, startEdge.sy);
            } else if (!previousEdge) {
                start = openEndpoint(startEdge, false);
            } else {
                start = pointOnEdge(startEdge, false, startTurn ? MAZE_CORNER_RADIUS : 0);
            }
            ctx.moveTo(start.x, start.y);

            for (let i = 0; i < contour.length; i++) {
                const edge = contour[i];
                const next = i === contour.length - 1 ? (closed ? contour[0] : null) : contour[i + 1];
                const turns = turnsInto(edge, next);
                const simpleTurn = turns && isSimpleVertex(edge.ex, edge.ey);
                let end;
                if (turns && !simpleTurn) {
                    end = jointPoint(edge, next, edge.ex, edge.ey);
                } else if (!next) {
                    end = openEndpoint(edge, true);
                } else {
                    end = pointOnEdge(edge, true, simpleTurn ? MAZE_CORNER_RADIUS : 0);
                }
                ctx.lineTo(end.x, end.y);
                if (turns) {
                    if (simpleTurn) {
                        const turn = jointPoint(edge, next, edge.ex, edge.ey);
                        const nextStart = pointOnEdge(next, false, MAZE_CORNER_RADIUS);
                        ctx.quadraticCurveTo(turn.x, turn.y, nextStart.x, nextStart.y);
                    }
                }
            }
            if (closed) ctx.closePath();
        }
        ctx.stroke();
        ctx.restore();
    };

    const drawOuterEdge = (color, width, inset) => {
        const gapTop = 13 * TILE;
        const gapBottom = 16 * TILE;
        const left = inset;
        const right = CANVAS_W - inset;
        const top = inset;
        const bottom = CANVAS_H - inset;
        const radius = Math.max(0, OUTER_MAZE_RADIUS - inset * 0.35);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(left + radius, top);
        ctx.lineTo(right - radius, top);
        ctx.quadraticCurveTo(right, top, right, top + radius);
        ctx.lineTo(right, gapTop);
        ctx.moveTo(right, gapBottom);
        ctx.lineTo(right, bottom - radius);
        ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
        ctx.lineTo(left + radius, bottom);
        ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
        ctx.lineTo(left, gapBottom);
        ctx.moveTo(left, gapTop);
        ctx.lineTo(left, top + radius);
        ctx.quadraticCurveTo(left, top, left + radius, top);
        ctx.stroke();
        ctx.restore();
    };

    drawOuterEdge(wallShadow, 3, 0.75);
    drawOuterEdge(wallColor, 1.5, 0.75);
    drawOuterEdge(wallShadow, 3, 5.75);
    drawOuterEdge(wallColor, 1.5, 5.75);
    drawMazeEdges(wallShadow, 3);
    drawMazeEdges(wallColor, 1.5);

    ctx.strokeStyle = '#FFB8FF';
    ctx.lineWidth = 2;
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
                ctx.fillRect(colToX(c) - 2, rowToY(r) - 2, 4, 4);
            } else if (t === T.PELLET) {
                if (Math.floor(frameCount / 8) % 2 !== 0) continue;
                ctx.fillStyle = '#FFB897';
                ctx.beginPath();
                ctx.arc(colToX(c), rowToY(r), 6, 0, Math.PI * 2);
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

    _tone(freq, start, dur, vol, type, endFreq) {
        if (freq <= 0) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, start);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(vol, start + Math.min(0.006, dur * 0.25));
        gain.gain.setValueAtTime(vol, start + dur * 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.01);
    }

    waka() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        const dur = 0.042;
        const a = this.wakaToggle ? 390 : 520;
        const b = this.wakaToggle ? 520 : 390;
        this._tone(a, t, dur, 0.075, 'square', b);
        this._tone(b * 0.5, t + dur * 0.35, dur * 0.75, 0.035, 'square', a * 0.5);
        this.wakaToggle = !this.wakaToggle;
    }

    eatGhost() {
        if (!this.enabled) return;
        const notes = [392, 523, 659, 784, 1047, 1319];
        const stepDur = 0.045;
        for (let i = 0; i < notes.length; i++) {
            const t = this.ctx.currentTime + i * stepDur;
            this._tone(notes[i], t, stepDur * 1.25, 0.12, 'square');
            this._tone(notes[i] * 0.5, t, stepDur, 0.035, 'square');
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
        const starts = [1245, 1175, 1047, 988, 880, 784, 698, 622, 523, 440];
        let t = 0;
        for (let i = 0; i < starts.length; i++) {
            const dur = 0.09 + i * 0.008;
            this._tone(starts[i], t0 + t, dur, 0.105, 'square', Math.max(70, starts[i] * 0.56));
            t += dur * 0.92;
        }
        this._tone(196, t0 + t + 0.03, 0.24, 0.09, 'square', 55);
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
                this._tone(freq, start, dur * 0.9, 0.085, 'square');
                if (freq >= N.E5) this._tone(freq / 2, start, dur * 0.85, 0.035, 'square');
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
        const baseFreq = [95, 108, 124, 142][lvl];
        const modRate = [4.5, 5.1, 5.8, 6.6][lvl];
        const modDepth = baseFreq * 0.72;

        const carrier = this.ctx.createOscillator();
        const sub = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const subLfoGain = this.ctx.createGain();
        const sirenGain = this.ctx.createGain();

        carrier.type = 'square';
        carrier.frequency.value = baseFreq;
        sub.type = 'square';
        sub.frequency.value = baseFreq / 2;

        // A rising sawtooth ramp that snaps back each cycle reads as a siren,
        // unlike a smooth sine vibrato. Rate/pitch climb as dots are cleared.
        lfo.type = 'sawtooth';
        lfo.frequency.value = modRate;
        lfoGain.gain.value = modDepth;
        subLfoGain.gain.value = baseFreq * 0.2;

        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);
        lfo.connect(subLfoGain);
        subLfoGain.connect(sub.frequency);

        sirenGain.gain.value = 0.038;

        carrier.connect(sirenGain);
        sub.connect(sirenGain);
        sirenGain.connect(this.ctx.destination);

        carrier.start(t);
        sub.start(t);
        lfo.start(t);

        this.sirenNodes = { oscs: [carrier, sub, lfo], gains: [sirenGain] };
    }

    stopSiren() {
        this.sirenNodes = this._stopLoop(this.sirenNodes);
    }

    startFrightenedLoop() {
        if (!this.enabled) return;
        this.frightNodes = this._stopLoop(this.frightNodes);
        const t = this.ctx.currentTime;

        const carrier = this.ctx.createOscillator();
        const pulse = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        carrier.type = 'square';
        carrier.frequency.value = 185;
        pulse.type = 'square';
        pulse.frequency.value = 92;

        lfo.type = 'square';
        lfo.frequency.value = 7.5;
        lfoGain.gain.value = 70;

        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);
        lfoGain.connect(pulse.frequency);

        gain.gain.value = 0.044;

        carrier.connect(gain);
        pulse.connect(gain);
        gain.connect(this.ctx.destination);

        carrier.start(t);
        pulse.start(t);
        lfo.start(t);

        this.frightNodes = { oscs: [carrier, pulse, lfo], gains: [gain] };
    }

    stopFrightenedLoop() {
        this.frightNodes = this._stopLoop(this.frightNodes);
    }

    startFright() {
        if (!this.enabled) return;
        this.stopSiren();
        const t = this.ctx.currentTime;
        this._tone(156, t, 0.09, 0.11, 'square', 330);
        this._tone(312, t + 0.06, 0.12, 0.085, 'square', 210);
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
