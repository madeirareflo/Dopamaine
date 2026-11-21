const names = { daily: 'Cristal Diário', bonus: 'Cristal Dourado', level: 'Cristal de Nível', milestone: 'Cristal Prismático' };
const dayKey = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');

export class Crystal {
  constructor(data, onHit, onBreak) {
    this.button = document.querySelector('#crystal');
    this.streak = document.querySelector('#streak');
    this.onHit = onHit;
    this.onBreak = onBreak;
    this.use(data);
  }

  use(data) {
    this.data = data;
    this.lastHit = 0;
    this.paint();
  }

  daily(date = new Date()) {
    const key = dayKey(date);
    if (this.data.day === key) return false;
    const yesterday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    this.data.streak = this.data.day === dayKey(yesterday) ? this.data.streak + 1 : 1;
    this.data.day = key;
    if (!this.data.queue.includes('daily')) {
      this.data.queue.splice(this.data.cracks ? 1 : 0, 0, 'daily');
    }
    this.paint();
    return true;
  }

  add(kind) {
    this.data.queue.push(kind);
    this.paint();
  }

  hit(now) {
    const kind = this.data.queue[0];
    if (!kind) return;
    if (this.lastHit && now - this.lastHit > 2200) this.data.cracks = 0;
    this.lastHit = now;
    const cracks = ++this.data.cracks;
    this.onHit(cracks);
    if (cracks === 3) {
      this.data.queue.shift();
      this.data.cracks = 0;
      this.lastHit = 0;
      this.onBreak(kind, now);
    }
    this.paint();
  }

  paint() {
    const { queue, cracks, streak } = this.data;
    this.streak.textContent = streak ? '◇ ' + streak + (streak === 1 ? ' dia' : ' dias') : '';
    this.streak.hidden = !streak;
    this.button.hidden = !queue.length;
    this.button.dataset.cracks = cracks;
    this.button.dataset.kind = queue[0] ?? '';
    this.button.setAttribute('aria-label', (names[queue[0]] ?? 'Cristal') + ' · ' + cracks + '/3');
    this.button.querySelector('small').textContent = cracks + '/3';
  }
}
