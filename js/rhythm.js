export class Rhythm {
  constructor(field, effects, audio, reduced) {
    this.field = field;
    this.effects = effects;
    this.audio = audio;
    this.reduced = reduced;
    this.points = Array.from({ length: 32 }, () => ({ life: 0 }));
    this.reset();
  }

  reset() {
    this.last = -Infinity;
    this.interval = 0;
    this.regular = 0;
    this.active = false;
    this.until = 0;
    this.release = null;
    this.cursor = 0;
    this.lastNote = -Infinity;
    this.field.classList.remove('sweet');
    for (const point of this.points) point.life = 0;
  }

  tap(now) {
    const gap = now - this.last;
    this.last = now;
    if (gap >= 100 && gap <= 900 && (!this.interval || Math.abs(gap - this.interval) <= Math.max(45, this.interval * .18))) {
      this.regular++;
      this.interval = this.interval ? this.interval * .7 + gap * .3 : gap;
    } else {
      this.regular = 0;
      this.interval = gap >= 100 && gap <= 900 ? gap : 0;
    }
    this.active = this.regular >= 4;
    this.field.classList.toggle('sweet', this.active);
    if (this.active) this.audio.rhythmNote(this.regular % 5, .055);
    return this.active;
  }

  trail(x, y, speed, now) {
    if (this.reduced()) return;
    const point = this.points[this.cursor++ % this.points.length];
    point.x = x;
    point.y = y;
    point.life = .3;
    if (now - this.lastNote > 110) {
      this.lastNote = now;
      this.audio.rhythmNote(Math.min(4, Math.floor(speed / 1.4)), .025);
    }
  }

  slow(now, release) {
    if (this.release) this.release();
    this.until = now + 550;
    this.release = release;
  }

  frame(now, dt) {
    if (this.active && now - this.last > Math.max(900, this.interval * 1.8)) {
      this.active = false;
      this.regular = 0;
      this.field.classList.remove('sweet');
    }
    if (this.release && now >= this.until) {
      const release = this.release;
      this.release = null;
      release();
    }
    return now < this.until;
  }

  draw(dt) {
    const ctx = this.effects.ctx;
    for (const point of this.points) {
      if (point.life <= 0) continue;
      point.life = Math.max(0, point.life - dt);
      ctx.globalAlpha = point.life / .3 * .75;
      ctx.fillStyle = '#c9fff8';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1 + point.life * 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
