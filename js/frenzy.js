const WINDOW = 10000;
const REST = 35000;
const modeMask = { pulse: 1, bubbles: 2, keys: 4 };

export class Frenzy {
  constructor(hud, field, start) {
    this.hud = hud;
    this.field = field;
    this.start = start;
    this.reset();
  }

  reset() {
    this.end = this.readyAt = this.run = this.mask = 0;
    this.last = this.rotationAt = -Infinity;
    this.hud.hidden = true;
    this.field.classList.remove('frenzy');
    this.seconds = 0;
  }

  tap(mode, now) {
    const gap = now - this.last;
    this.run = gap <= 550 ? this.run + 1 : 1;
    this.last = now;
    if (now - this.rotationAt > 12000) this.mask = 0;
    if (!this.mask) this.rotationAt = now;
    this.mask |= modeMask[mode];
    const alternate = this.mask === 7;
    if (alternate) this.mask = 0;
    const rhythm = this.run % 8 === 0;
    if (this.run >= 24 && now >= this.readyAt) {
      this.end = now + WINDOW;
      this.readyAt = this.end + REST;
      this.frame(now);
      this.start(now);
    }
    const active = now < this.end;
    return {
      charge: (rhythm ? 4 : 0) + (alternate ? 8 : 0),
      particles: (active ? 16 : 0) + (rhythm ? 6 : 0) + (alternate ? 10 : 0),
      active, rhythm, alternate,
    };
  }

  frame(now) {
    const remaining = Math.max(0, Math.ceil((this.end - now) / 1000));
    if (remaining === this.seconds) return;
    this.seconds = remaining;
    this.hud.textContent = remaining ? '⚡ Sobrecarga · ' + remaining + ' s' : '';
    this.hud.hidden = !remaining;
    this.field.classList.toggle('frenzy', Boolean(remaining));
  }
}
