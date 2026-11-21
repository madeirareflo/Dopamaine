const names = { daily: 'Cristal Diário', bonus: 'Cristal Dourado', level: 'Cristal de Nível', milestone: 'Cristal Prismático' };
import { localDay } from './streak.js';

export class Crystal {
  constructor(data, onHit, onBreak) {
    this.button = document.querySelector('#crystal');
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
    const key = localDay(date);
    const previous = this.data.day.split('-').map(part => part.padStart(2, '0')).join('-');
    if (previous >= key) return false;
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
    const { queue, cracks } = this.data;
    this.button.hidden = !queue.length;
    this.button.dataset.cracks = cracks;
    this.button.dataset.kind = queue[0] ?? '';
    this.button.setAttribute('aria-label', (names[queue[0]] ?? 'Cristal') + ' · ' + cracks + '/3');
    this.button.querySelector('small').textContent = cracks + '/3';
  }
}
