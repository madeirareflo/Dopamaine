const scale = [0, 2, 4, 7, 9];
const profiles = [
  { wave: 'triangle', attack: 680, tail: .12, slide: .58 },
  { wave: 'triangle', attack: 360, tail: .078, slide: .36 },
  { wave: 'square', attack: 540, tail: .15, slide: .78 },
  { wave: 'sine', attack: 1250, tail: .21, slide: .75 },
];

export class Synth {
  muted = false;

  unlock() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    if (!this.context) {
      try {
        this.context = new Audio();
      } catch {
        return;
      }
      this.output = this.context.createGain();
      this.output.gain.value = this.muted ? 0 : .55;
      const limiter = this.context.createDynamicsCompressor();
      this.output.connect(limiter).connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.output) this.output.gain.setTargetAtTime(muted ? 0 : .55, this.context.currentTime, .015);
  }

  tone(frequency, end, wave, volume, duration, start) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(end, start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + .005);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope).connect(this.output);
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
  }

  play(profile, combo, fever, mode) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const step = Math.min(combo - 1, 14);
    const pitch = (mode === 'bubbles' ? 246.94 : 220) * 2 ** ((scale[step % 5] + 12 * Math.floor(step / 5)) / 12);
    const { wave, attack, tail, slide } = profiles[profile];
    this.tone(pitch, pitch, wave, wave === 'square' ? .043 : .12, tail, now);
    this.tone(attack, attack * slide, 'sine', .15, mode === 'keys' ? .028 : .048, now);
    if (combo >= 10) this.tone(82, 43, 'sine', .16, .13, now);
    if (fever) this.tone(pitch * 2, pitch * 2, 'sine', .045, .21, now + .028);
  }

  celebrate(rarity) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const notes = [[0, 7, 12], [0, 4, 7, 12], [0, 4, 7, 12, 16], [0, 4, 7, 12, 16, 19, 24]][rarity];
    notes.forEach((note, index) => {
      const pitch = 349.23 * 2 ** (note / 12);
      this.tone(pitch, pitch, index === 0 ? 'triangle' : 'sine', .10, .25 + rarity * .06, now + index * .043);
    });
  }

  critical() {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    this.tone(94, 40, 'sine', .23, .18, now);
    this.tone(1318.51, 1318.51, 'sine', .10, .24, now + .016);
    this.tone(1975.53, 1975.53, 'sine', .042, .17, now + .035);
  }

  crack(step) {
    if (!this.context || this.muted) return;
    const pitch = [392, 523.25, 659.25][step - 1];
    this.tone(pitch, pitch, 'triangle', .13, .14, this.context.currentTime);
  }

  tick() {
    if (!this.context || this.muted) return;
    this.tone(630, 530, 'sine', .05, .045, this.context.currentTime);
  }

  reward(big = false) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    [0, 4, 7, 12, ...(big ? [16, 19] : [])].forEach((step, index) => {
      const pitch = 440 * 2 ** (step / 12);
      this.tone(pitch, pitch, 'sine', .115, .32, now + index * .055);
    });
  }
}
