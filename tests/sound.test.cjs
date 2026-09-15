const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function audio() {
    const nodes = [];
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {},
        exponentialRampToValueAtTime(value) { assert.ok(value > 0); },
        cancelScheduledValues() {}, setTargetAtTime() {} });
    const node = type => {
        const n = { kind: type, connections: [], gain: param(), frequency: param(), Q: param(),
            threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), delayTime: param(),
            connect(dest) { this.connections.push(dest); }, disconnect() { this.disconnected = true; },
            start() {}, stop(at) { assert.ok(Number.isFinite(at)); this.stopTime = at; } };
        nodes.push(n); return n;
    };
    class AudioContext {
        currentTime = 10;
        state = 'running';
        destination = node('destination');
        createGain() { return node('gain'); }
        createOscillator() { return node('oscillator'); }
        createBiquadFilter() { return node('filter'); }
        createDynamicsCompressor() { return node('compressor'); }
        createDelay() { return node('delay'); }
    }
    const context = vm.createContext({ window: { AudioContext }, gameState: 'playing', frightTimer: 0 });
    vm.runInContext(fs.readFileSync(require.resolve('../sound.js'), 'utf8') + '\nvar sound = new SoundManager();', context);
    return { nodes, run: code => vm.runInContext(code, context) };
}

test('every one-shot routes through the master and releases its source nodes', () => {
    const a = audio();
    a.run('sound.waka(); sound.eatGhost(); sound.eatFruit(); sound.startFright(); sound.death(); sound.playIntro(); sound.levelComplete()');
    const sources = a.nodes.filter(n => n.kind === 'oscillator');
    assert.ok(sources.length > 50);
    for (const n of sources) { assert.ok(n.stopTime > 10); n.onended(); assert.ok(n.disconnected); }
    const destination = a.nodes.find(n => n.kind === 'destination');
    assert.deepEqual(a.nodes.filter(n => n.connections.includes(destination)).map(n => n.kind), ['compressor']);
});

test('loops fade and disconnect on transitions without rebuilding each frame', () => {
    const a = audio();
    a.run('sound.updateSiren(0, 248)');
    const count = a.nodes.length;
    a.run('sound.updateSiren(0, 248)');
    assert.equal(a.nodes.length, count);
    a.run('sound.updateSiren(200, 248)');
    assert.equal(a.run('sound.sirenLevel'), 3);
    a.run('frightTimer = 6; sound.updateSiren(200, 248)');
    assert.equal(a.run('sound.lastMode'), 'frightened');
    a.run('gameState = "death"; sound.updateSiren(200, 248)');
    for (const n of a.nodes.filter(n => n.kind === 'oscillator')) {
        assert.ok(n.stopTime > 10);
        n.onended();
        assert.ok(n.disconnected);
    }
    assert.equal(a.run('sound.sirenNodes'), null);
    assert.equal(a.run('sound.frightNodes'), null);
});

test('audio-unavailable browsers safely skip all effects', () => {
    const context = vm.createContext({ window: {} });
    vm.runInContext(fs.readFileSync(require.resolve('../sound.js'), 'utf8') + '\nvar sound = new SoundManager();', context);
    assert.doesNotThrow(() => vm.runInContext('sound.waka(); sound.startSiren(); sound.startFright(); sound.playIntro(); sound.levelComplete();', context));
});
