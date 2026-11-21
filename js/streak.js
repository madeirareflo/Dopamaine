export function localDay(date = new Date(), offset = 0) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
  return [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-');
}

const dayFormat = /^\d{4}-\d{2}-\d{2}$/;
const amount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const days = [1, 3, 7, 14, 30];
const colors = ['Laranja Solar', 'Ouro Vivo', 'Azul Plasma', 'Violeta Neon', 'Chama Prismática'];
const formatDays = value => value + (value === 1 ? ' dia' : ' dias');

export function streakSave(raw, legacyDay, legacyCount) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const migrated = typeof legacyDay === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(legacyDay)
    ? legacyDay.split('-').map(part => part.padStart(2, '0')).join('-') : '';
  const last = dayFormat.test(data.last ?? '') ? data.last : migrated;
  const current = amount(data.current ?? legacyCount);
  const history = Array.isArray(data.history) ? data.history.filter(item => Array.isArray(item) &&
    dayFormat.test(item[0] ?? '') && (item[1] === 'lit' || item[1] === 'shield')).slice(-8) : [];
  if (!history.length && last && current) history.push([last, 'lit']);
  return {
    last, current, record: Math.max(current, amount(data.record)),
    shields: data.shields == null ? 1 : Math.min(2, amount(data.shields)),
    trophyTier: Math.min(4, amount(data.trophyTier)), history,
    seen: dayFormat.test(data.seen ?? '') ? data.seen : migrated,
    taps: Math.min(10, amount(data.taps)),
  };
}

export class Streak {
  constructor(data, onIgnite, onShield) {
    this.button = document.querySelector('#streak');
    this.panel = document.querySelector('#streak-panel');
    this.onIgnite = onIgnite;
    this.onShield = onShield;
    this.button.addEventListener('click', () => {
      this.paint();
      this.panel.showModal();
    });
    this.use(data);
  }

  use(data) {
    this.data = data;
    this.today = '';
  }

  enter(date = new Date()) {
    const today = localDay(date);
    if (today === this.today) return false;
    this.today = today;
    this.date = date;
    const data = this.data;
    if (data.seen !== today) {
      data.taps = 0;
      data.seen = today;
    }
    if (data.last && data.last < today && data.last !== localDay(date, -1)) {
      if (data.last === localDay(date, -2) && data.shields > 0) {
        data.shields--;
        data.last = localDay(date, -1);
        this.recordDay(data.last, 'shield');
        this.onShield(data.current);
      } else {
        data.current = 0;
        data.last = '';
      }
    }
    this.paint();
    return true;
  }

  recordDay(day, kind) {
    this.data.history = this.data.history.filter(([key]) => key !== day).slice(-7);
    this.data.history.push([day, kind]);
  }

  tap(now) {
    if (this.data.last === this.today || this.data.last > this.today) return;
    if (++this.data.taps >= 10) this.ignite(now);
  }

  ignite(now) {
    const data = this.data;
    if (!this.today || data.last >= this.today) return;
    data.current++;
    data.last = this.today;
    data.record = Math.max(data.record, data.current);
    if (data.current % 7 === 0) data.shields = Math.min(2, data.shields + 1);
    this.recordDay(this.today, 'lit');
    this.paint();
    this.onIgnite(data.current, now);
  }

  trophies(claimed, total) {
    const tier = Math.floor(claimed * 4 / total);
    if (tier <= this.data.trophyTier) return;
    this.data.shields = Math.min(2, this.data.shields + tier - this.data.trophyTier);
    this.data.trophyTier = tier;
    this.paint();
  }

  paint() {
    if (!this.date) return;
    const { current, record, last, shields, history } = this.data;
    const tier = days.reduce((index, threshold, i) => current >= threshold ? i : index, 0);
    this.button.dataset.tier = tier;
    this.button.dataset.lit = last === this.today;
    this.button.querySelector('span').textContent = current;
    this.button.setAttribute('aria-label', 'Ofensiva · ' + formatDays(current));
    this.panel.querySelector('#streak-current').textContent = formatDays(current);
    this.panel.querySelector('#streak-record').textContent = 'Recorde · ' + formatDays(record);
    this.panel.querySelector('#streak-shields').textContent = 'Escudos · ' + shields + '/2';
    const next = days.findIndex(threshold => threshold > current);
    const bar = this.panel.querySelector('progress');
    bar.max = next < 0 ? 30 : days[next];
    bar.value = current;
    this.panel.querySelector('#streak-next').textContent = next < 0 ? colors[4] : colors[next] + ' · ' + current + '/' + days[next];
    const strip = this.panel.querySelector('#streak-week');
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate() + i - 6, 12);
      const day = localDay(date);
      const kind = history.find(([key]) => key === day)?.[1] ?? 'off';
      const item = strip.children[i] ?? strip.appendChild(document.createElement('li'));
      item.dataset.kind = kind;
      item.textContent = kind === 'shield' ? '⛨' : kind === 'lit' ? '●' : '○';
      item.setAttribute('aria-label', date.toLocaleDateString('pt-BR') + ' · ' + ({ lit: 'aceso', shield: 'protegido', off: 'apagado' })[kind]);
    }
  }
}
