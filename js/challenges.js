const challenges = {
  pulse: [['tap', 30, 12, '30 toques'], ['fever', 1, 15, 'Ative o Fever'], ['combo', 25, 15, 'Combo ×25']],
  bubbles: [['tap', 12, 12, 'Estoure 12 bolhas'], ['chain', 4, 15, 'Cadeia de 4 bolhas']],
  keys: [['grid', 16, 10, 'Acenda 16 teclas'], ['tap', 25, 10, 'Ritmo turbo · 25 toques']],
};
const interval = () => (45 + Math.random() * 45) * 1000;

export class Lightning {
  constructor(complete, tick) {
    this.banner = document.querySelector('#lightning');
    this.label = this.banner.querySelector('span');
    this.bar = this.banner.querySelector('progress');
    this.complete = complete;
    this.tick = tick;
    this.reset();
  }

  reset() {
    this.current = null;
    this.remaining = interval();
    this.banner.hidden = true;
  }

  frame(now, elapsed, active, mode) {
    if (!this.current) {
      if (active && (this.remaining -= elapsed) <= 0) {
        const options = challenges[mode];
        const [kind, goal, seconds, title] = options[Math.floor(Math.random() * options.length)];
        this.current = { mode, kind, goal, seconds, title, end: now + seconds * 1000, value: 0, mask: 0 };
        this.banner.getAnimations().forEach(animation => animation.cancel());
        this.banner.classList.remove('urgent');
        this.banner.hidden = false;
        this.bar.value = 1;
        this.render(seconds);
      }
      return;
    }
    const left = this.current.end - now;
    if (left <= 0) {
      this.current = null;
      this.remaining = interval();
      this.banner.classList.remove('urgent');
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const fade = this.banner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 0 : 230, fill: 'forwards' });
      fade.onfinish = () => {
        if (!this.current) this.banner.hidden = true;
        fade.cancel();
      };
      return;
    }
    this.bar.value = left / (this.current.seconds * 1000);
    const seconds = Math.ceil(left / 1000);
    if (seconds !== this.current.shown) {
      this.render(seconds);
      if (seconds <= 3) {
        this.banner.classList.add('urgent');
        this.tick();
      }
    }
  }

  render(seconds) {
    const { title, value, goal } = this.current;
    this.current.shown = seconds;
    this.label.textContent = '⚡ ' + title + ' · ' + value + '/' + goal + ' · ' + seconds + ' s';
  }

  event(mode, kind, value, now) {
    const item = this.current;
    if (!item || now >= item.end || item.mode !== mode || item.kind !== kind) return;
    if (kind === 'tap') item.value++;
    else if (kind === 'grid') {
      const bit = 1 << value;
      if (!(item.mask & bit)) item.value++;
      item.mask |= bit;
    } else item.value = Math.max(item.value, value);
    if (item.value >= item.goal) {
      this.reset();
      this.complete(now);
    } else this.render(Math.ceil((item.end - now) / 1000));
  }
}
