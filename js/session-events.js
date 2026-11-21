const MIRROR_MS = 9000;
const DOMINO_MS = 125;
const RATE_SIZE = 64;
const WAVE_SIZE = 32;

export class SessionEvents {
  constructor(field, hud, { emit, mirror, double, collect, reduced }) {
    this.field = field;
    this.hud = hud;
    this.emit = emit;
    this.mirror = mirror;
    this.double = double;
    this.collect = collect;
    this.reduced = reduced;
    this.times = new Float64Array(RATE_SIZE);
    this.waves = Array.from({ length: WAVE_SIZE }, () => ({ at: 0 }));
    this.readout = document.querySelectorAll('[data-session]');
    this.records = document.querySelector('#session-records');
    this.reset();
  }

  reset() {
    this.end = this.ready = this.run = this.seconds = this.mirrorHits = 0;
    this.head = this.size = this.waveIndex = this.switchRun = this.switchWaves = 0;
    this.last = this.lastSwitch = this.switchWaveAt = -Infinity;
    this.nextPaint = this.reactivity = 0;
    this.stats = { combo: 0, chain: 0, rate: 0, fragments: 0 };
    this.dirty = true;
    for (const wave of this.waves) wave.at = 0;
    this.hud.hidden = true;
    this.field.classList.remove('mirror');
    this.field.style.removeProperty('--note-glow');
    this.paint();
  }

  best(key, value) {
    if (value <= this.stats[key]) return;
    this.stats[key] = value;
    this.dirty = true;
  }

  earned(amount) {
    if (amount <= 0) return;
    this.stats.fragments += amount;
    this.dirty = true;
  }

  action(now, combo) {
    this.best('combo', combo);
    while (this.size && now - this.times[this.head] >= 1000) {
      this.head = (this.head + 1) % RATE_SIZE;
      this.size--;
    }
    this.times[(this.head + this.size) % RATE_SIZE] = now;
    if (this.size === RATE_SIZE) this.head = (this.head + 1) % RATE_SIZE;
    else this.size++;
    this.best('rate', this.size);
    this.run = now - this.last <= 550 ? this.run + 1 : 1;
    this.last = now;
    if (this.run >= 14 && now >= this.ready) {
      this.end = now + MIRROR_MS;
      this.ready = this.end + 28000;
      this.mirrorHits = 0;
      this.paintMirror(now);
      this.mirror();
    }
    const mirrored = this.active(now);
    if (mirrored && ++this.mirrorHits === 12) this.collect('mirror');
    return mirrored;
  }

  active(now) {
    return now < this.end;
  }

  switch(now, x, y, color) {
    this.switchRun = now - this.lastSwitch <= 320 ? this.switchRun + 1 : 1;
    this.lastSwitch = now;
    if (this.switchRun < 3 || now - this.switchWaveAt < 90) return;
    this.switchWaveAt = now;
    this.queue(now, x, y, color, true);
  }

  chain(now, size, x, y, color) {
    this.best('chain', size);
    this.queue(now, x, y, color, false);
    if (size === 5) this.collect('chain');
  }

  queue(now, x, y, color, isSwitch) {
    const wave = this.waves[this.waveIndex++ % WAVE_SIZE];
    wave.at = now + DOMINO_MS;
    wave.x = x;
    wave.y = y;
    wave.color = color;
    wave.isSwitch = isSwitch;
  }

  note(pitch, combo, fever) {
    this.reactivity = Math.max(this.reactivity, Math.min(1, .18 + pitch / 2200 + combo / 130 + (fever ? .12 : 0)));
  }

  paintMirror(now) {
    const seconds = Math.max(0, Math.ceil((this.end - now) / 1000));
    if (seconds === this.seconds) return;
    this.seconds = seconds;
    this.hud.textContent = seconds ? '◐ Espelho · ' + seconds + ' s' : '';
    this.hud.hidden = !seconds;
    this.field.classList.toggle('mirror', Boolean(seconds));
  }

  paint() {
    for (const item of this.readout) item.textContent = this.stats[item.dataset.session];
    this.dirty = false;
  }

  frame(now, dt) {
    this.paintMirror(now);
    for (const wave of this.waves) {
      if (!wave.at || wave.at > now) continue;
      wave.at = 0;
      this.emit(wave.x, wave.y, wave.color, this.reduced() ? 2 : 8);
      this.double(wave.isSwitch);
      if (wave.isSwitch && ++this.switchWaves === 5) this.collect('switch');
    }
    if (this.reactivity > 0) {
      this.reactivity = Math.max(0, this.reactivity - dt * 3.8);
      if (!this.reduced()) this.field.style.setProperty('--note-glow', this.reactivity.toFixed(2));
    }
    if (this.dirty && this.records.open && now >= this.nextPaint) {
      this.nextPaint = now + 120;
      this.paint();
    }
  }
}
