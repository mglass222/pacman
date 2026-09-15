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
            // A restrained master bus keeps repeated chomps and overlapping rewards comfortable.
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.7;
            this.compressor = this.ctx.createDynamicsCompressor();
            this.compressor.threshold.value = -18;
            this.compressor.knee.value = 12;
            this.compressor.ratio.value = 4;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.16;
            this.master.connect(this.compressor);
            this.compressor.connect(this.ctx.destination);
            // One quiet, non-feedback echo adds space to rewards, never to the chomp loop.
            this.echo = this.ctx.createDelay(0.5);
            this.echo.delayTime.value = 0.105;
            this.echoTone = this.ctx.createBiquadFilter();
            this.echoTone.type = 'lowpass';
            this.echoTone.frequency.value = 2300;
            this.echoGain = this.ctx.createGain();
            this.echoGain.gain.value = 0.14;
            this.echo.connect(this.echoTone);
            this.echoTone.connect(this.echoGain);
            this.echoGain.connect(this.master);
            if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        } catch (e) {
            this.enabled = false;
        }
    }

    _tone(freq, start, dur, vol, type = 'triangle', endFreq, spacious = false) {
        if (!this.enabled || freq <= 0) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
        filter.type = 'lowpass';
        filter.Q.value = 0.65;
        filter.frequency.setValueAtTime(Math.min(6500, freq * 5), start);
        filter.frequency.exponentialRampToValueAtTime(Math.max(280, freq * 1.3), start + dur);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(vol, start + Math.min(0.008, dur * 0.2));
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.45), start + dur * 0.55);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        if (spacious) gain.connect(this.echo);
        osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
        osc.start(start);
        osc.stop(start + dur + 0.015);
    }

    // Rounded synth body plus a faint octave glint: the old melody, a new material.
    _chime(freq, start, dur, vol = 0.1) {
        this._tone(freq, start, dur, vol, 'triangle', undefined, true);
        this._tone(freq * 2.002, start + 0.004, dur * 0.65, vol * 0.22, 'sine', undefined, true);
    }

    waka() {
        if (!this.enabled) return;
        const t = this.ctx.currentTime;
        const dur = 0.042;
        const a = this.wakaToggle ? 390 : 520;
        const b = this.wakaToggle ? 520 : 390;
        this._tone(a, t, dur + 0.012, 0.15, 'triangle', b);
        this._tone(b * 0.5, t + dur * 0.2, dur, 0.065, 'sine', a * 0.5);
        this.wakaToggle = !this.wakaToggle;
    }

    eatGhost() {
        if (!this.enabled) return;
        const notes = [392, 523, 659, 784, 1047, 1319];
        const stepDur = 0.045;
        for (let i = 0; i < notes.length; i++) {
            const t = this.ctx.currentTime + i * stepDur;
            this._chime(notes[i], t, stepDur * 2.2, 0.13);
            this._tone(notes[i] * 0.5, t, stepDur * 1.3, 0.05, 'sine');
        }
    }

    eatFruit() {
        if (!this.enabled) return;
        const notes = [[523, 0.06], [0, 0.02], [659, 0.06], [0, 0.02], [784, 0.12]];
        let t = 0;
        for (const [freq, dur] of notes) {
            if (freq > 0) {
                const start = this.ctx.currentTime + t;
                this._chime(freq, start, dur + 0.11, 0.14);
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
            this._tone(starts[i], t0 + t, dur, 0.13, 'triangle', Math.max(70, starts[i] * 0.56));
            t += dur * 0.92;
        }
        this._tone(196, t0 + t + 0.03, 0.3, 0.15, 'sine', 55);
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
                this._chime(freq, start, dur * 1.05, 0.1);
                if (freq >= N.E5) this._tone(freq / 2, start, dur * 0.9, 0.04, 'sine');
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
                this._chime(freq, start, dur + 0.09, 0.12);
                this._tone(freq / 2, start, dur, 0.035, 'sine');
            }
            t += dur;
        }
    }

    _stopLoop(nodes) {
        if (!nodes) return null;
        const t = this.ctx.currentTime;
        for (const g of nodes.gains) {
            g.gain.cancelScheduledValues(t);
            g.gain.setTargetAtTime(0.0001, t, 0.012);
        }
        for (const osc of nodes.oscs) {
            osc.onended = () => {
                osc.disconnect();
                if (++nodes.ended === nodes.oscs.length) {
                    for (const node of nodes.cleanup) node.disconnect();
                }
            };
            osc.stop(t + 0.07);
        }
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

        carrier.type = 'triangle';
        carrier.frequency.value = baseFreq;
        sub.type = 'sine';
        sub.frequency.value = baseFreq / 2;

        // Keep the chase's rising urgency, with a rounded sweep instead of a hard reset.
        lfo.type = 'triangle';
        lfo.frequency.value = modRate;
        lfoGain.gain.value = modDepth;
        subLfoGain.gain.value = baseFreq * 0.2;

        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);
        lfo.connect(subLfoGain);
        subLfoGain.connect(sub.frequency);

        sirenGain.gain.setValueAtTime(0.0001, t);
        sirenGain.gain.linearRampToValueAtTime(0.045, t + 0.08);

        carrier.connect(sirenGain);
        sub.connect(sirenGain);
        sirenGain.connect(this.master);

        carrier.start(t);
        sub.start(t);
        lfo.start(t);

        this.sirenNodes = { oscs: [carrier, sub, lfo], gains: [sirenGain], cleanup: [sirenGain, lfoGain, subLfoGain], ended: 0 };
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

        carrier.type = 'triangle';
        carrier.frequency.value = 185;
        pulse.type = 'sine';
        pulse.frequency.value = 92;

        lfo.type = 'sine';
        lfo.frequency.value = 7.5;
        lfoGain.gain.value = 70;

        lfo.connect(lfoGain);
        lfoGain.connect(carrier.frequency);
        lfoGain.connect(pulse.frequency);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.055, t + 0.06);

        carrier.connect(gain);
        pulse.connect(gain);
        gain.connect(this.master);

        carrier.start(t);
        pulse.start(t);
        lfo.start(t);

        this.frightNodes = { oscs: [carrier, pulse, lfo], gains: [gain], cleanup: [gain, lfoGain], ended: 0 };
    }

    stopFrightenedLoop() {
        this.frightNodes = this._stopLoop(this.frightNodes);
    }

    startFright() {
        if (!this.enabled) return;
        this.stopSiren();
        const t = this.ctx.currentTime;
        this._tone(156, t, 0.16, 0.16, 'triangle', 624, true);
        this._tone(312, t + 0.06, 0.22, 0.09, 'sine', 936, true);
        this._chime(1248, t + 0.12, 0.2, 0.065);
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

        const newLevel = eaten < total * 0.25 ? 0 : eaten < total * 0.5 ? 1 : eaten < total * 0.75 ? 2 : 3;
        if (newLevel !== this.sirenLevel) {
            this.sirenLevel = newLevel;
            this.startSiren();
        }
    }
}
