/**
 * Procedural audio via Web Audio API — no external assets required.
 * Works offline and keeps the package small for stores.
 */
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.musicNodes = null;
    this.musicPlaying = false;
  }

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.35;
    this.master.connect(this.ctx.destination);
  }

  async unlock() {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  tone(freq, dur, type = 'square', gain = 0.08, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur = 0.08, gain = 0.05) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buffer;
    g.gain.value = gain;
    src.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  jump() {
    this.tone(180, 0.1, 'sine', 0.045, 320);
    this.noise(0.04, 0.02);
  }

  slide() {
    this.noise(0.12, 0.045);
    this.tone(90, 0.14, 'sine', 0.03, 50);
  }

  land(impact = 0.4) {
    this.noise(0.08 + impact * 0.06, 0.03 + impact * 0.05);
    this.tone(70, 0.08, 'sine', 0.025 + impact * 0.03, 40);
  }

  footstep() {
    this.noise(0.045, 0.018);
    this.tone(85 + Math.random() * 25, 0.05, 'sine', 0.012);
  }

  coin() {
    this.tone(880, 0.08, 'sine', 0.05, 1320);
    this.tone(1320, 0.1, 'sine', 0.03);
  }

  nearMiss() {
    this.tone(140, 0.15, 'sawtooth', 0.03, 60);
    this.noise(0.08, 0.03);
  }

  carPass() {
    this.tone(110, 0.28, 'sawtooth', 0.04, 55);
    this.tone(70, 0.34, 'sine', 0.03, 40);
    this.noise(0.18, 0.05);
  }

  horn() {
    this.tone(392, 0.22, 'square', 0.035);
    this.tone(330, 0.22, 'square', 0.028);
  }

  hit() {
    this.noise(0.28, 0.14);
    this.tone(70, 0.32, 'sawtooth', 0.1, 32);
  }

  caught() {
    this.tone(220, 0.25, 'sine', 0.06, 70);
    this.tone(165, 0.4, 'triangle', 0.05, 50);
    this.noise(0.32, 0.08);
  }

  ui() {
    this.tone(520, 0.06, 'sine', 0.05);
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    const t = this.ctx.currentTime;

    // City traffic bed — filtered rumble, not a chiptune loop
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const traffic = this.ctx.createBufferSource();
    traffic.buffer = buffer;
    traffic.loop = true;
    const trafficFilter = this.ctx.createBiquadFilter();
    trafficFilter.type = 'lowpass';
    trafficFilter.frequency.value = 280;
    trafficFilter.Q.value = 0.7;
    const trafficGain = this.ctx.createGain();
    trafficGain.gain.value = 0.045;
    traffic.connect(trafficFilter);
    trafficFilter.connect(trafficGain);
    trafficGain.connect(this.master);
    traffic.start();

    const pad = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    pad.type = 'sine';
    pad.frequency.value = 62;
    padGain.gain.value = 0.018;
    pad.connect(padGain);
    padGain.connect(this.master);
    pad.start();

    const air = this.ctx.createOscillator();
    const airGain = this.ctx.createGain();
    air.type = 'triangle';
    air.frequency.value = 98;
    airGain.gain.value = 0.008;
    air.connect(airGain);
    airGain.connect(this.master);
    air.start();

    this.musicNodes = { traffic, trafficFilter, trafficGain, pad, padGain, air, airGain };
    this._nextHorn = t + 4 + Math.random() * 6;
  }

  stopMusic() {
    if (!this.musicNodes) return;
    try {
      Object.values(this.musicNodes).forEach((n) => {
        if (n.stop) n.stop();
        if (n.disconnect) n.disconnect();
      });
    } catch {
      /* already stopped */
    }
    this.musicNodes = null;
    this.musicPlaying = false;
  }

  setMusicIntensity(speedNorm) {
    if (!this.musicNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.musicNodes.trafficGain) {
      this.musicNodes.trafficGain.gain.setTargetAtTime(0.04 + speedNorm * 0.05, t, 0.4);
    }
    if (this.musicNodes.trafficFilter) {
      this.musicNodes.trafficFilter.frequency.setTargetAtTime(240 + speedNorm * 220, t, 0.5);
    }
    if (this.musicPlaying && t > (this._nextHorn || 0)) {
      if (Math.random() < 0.55) this.horn();
      this._nextHorn = t + 5 + Math.random() * 9;
    }
  }
}
