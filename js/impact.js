const FREEZE = 36;
const HOLD_DELAY = 220;
const HOLD_MAX = 2500;
const ECHO_LIMIT = 48;

export class Impact {
  constructor(field, audio, effects, reduced, feedback) {
    this.field = field;
    this.audio = audio;
    this.effects = effects;
    this.reduced = reduced;
    this.feedback = feedback;
    this.pending = [];
    this.echoes = Array.from({ length: ECHO_LIMIT }, () => ({ at: 0 }));
    this.reset();
  }

  reset() {
    this.cancelHold();
    this.until = this.novaEnd = this.novaCharge = this.lastNovaTap = 0;
    this.pending.length = 0;
    this.echoIndex = 0;
    this.echoes.forEach(item => { item.at = 0; });
    this.field.classList.remove('supernova');
  }

  hit(now, release) {
    if (this.reduced()) {
      release();
      return;
    }
    if (this.until <= now) this.until = now + FREEZE;
    this.pending.push(release);
  }

  novaTap(now, duration = 5000) {
    if (now < this.novaEnd) return;
    const gap = now - this.lastNovaTap;
    if (this.lastNovaTap && gap > 540) this.novaCharge *= .55;
    this.lastNovaTap = now;
    this.novaCharge = Math.min(36, this.novaCharge + 1);
    if (this.novaCharge < 36) return;
    this.novaDuration = duration;
    this.novaEnd = now + duration;
    this.field.classList.add('supernova');
    this.audio.supernova();
    this.feedback.start(now);
  }

  echo(now, x, y, color, combo) {
    if (combo < 30) return;
    const count = combo >= 50 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const slot = this.echoes[this.echoIndex++ % ECHO_LIMIT];
      slot.at = now + 180 + i * 90;
      slot.x = x + (i ? 15 : -15);
      slot.y = y + (i ? -10 : 10);
      slot.color = color;
      slot.note = (combo + i * 2) % 5;
    }
  }

  begin(id, now) {
    if (!this.hold) this.hold = { id, start: now, ratio: 0, engaged: false };
  }

  end(id, now) {
    const hold = this.hold;
    if (!hold || hold.id !== id) return;
    const elapsed = now - hold.start;
    this.cancelHold();
    if (elapsed >= HOLD_DELAY) this.feedback.gravity(Math.min(1, (elapsed - HOLD_DELAY) / (HOLD_MAX - HOLD_DELAY)), now);
  }

  cancelHold(id) {
    if (!this.hold || (id !== undefined && this.hold.id !== id)) return;
    this.hold = null;
    this.audio.gravityEnd();
    this.field.style.removeProperty('--gravity');
    this.field.classList.remove('charging');
  }

  motion(now, fever, dt) {
    if (this.novaEnd && now >= this.novaEnd) {
      this.novaEnd = 0;
      this.novaCharge = this.lastNovaTap = 0;
      this.field.classList.remove('supernova');
      this.hit(now, this.feedback.detonate);
    }
    if (!fever && !this.novaEnd) this.novaCharge = this.lastNovaTap = 0;
    if (this.hold && now - this.hold.start >= HOLD_DELAY) {
      const hold = this.hold;
      if (!hold.engaged) {
        hold.engaged = true;
        this.audio.gravityStart();
        this.field.classList.add('charging');
      }
      const next = Math.min(1, (now - hold.start - HOLD_DELAY) / (HOLD_MAX - HOLD_DELAY));
      if (next !== hold.ratio) {
        hold.ratio = next;
        this.audio.gravityPitch(next);
      }
      this.field.style.setProperty('--gravity', next + .12);
    }
    if (now < this.until) return 0;
    while (this.pending.length) this.pending.shift()();
    for (const item of this.echoes) {
      if (!item.at || item.at > now) continue;
      item.at = 0;
      this.effects.emit(item.x, item.y, item.color, this.reduced() ? 2 : 5);
      this.audio.echo(item.note);
    }
    return this.novaEnd && this.novaEnd - now <= 400 && !this.reduced() ? dt * .25 : dt;
  }

  trace(x, y, now) {
    if (now >= this.novaEnd || this.reduced() || now - (this.lastTrace || 0) < 18) return;
    this.lastTrace = now;
    this.effects.emit(x, y, '#84fff0', 4, '', true);
  }
}
