import { streakSave } from './streak.js';

const trophy = (id, title, rarity, goal, unit, secret = false) => ({ id, title, rarity, goal, unit, secret });
const catalog = [
  trophy('first', 'Primeiro Pulso', 0, 1, 'toques'),
  trophy('rhythm', 'Ritmo Inicial', 0, 10, 'combo'),
  trophy('modes', 'Explorador Sensorial', 0, 3, 'modos'),
  trophy('critical', 'Primeiro Crítico', 0, 1, 'críticos'),
  trophy('fever', 'Sobrecarga', 0, 1, 'ativações no Pulso'),
  trophy('nova', 'Supernova', 2, 1, 'Supernova no Pulso'),
  trophy('gravity', 'Centro de Gravidade', 2, 1, 'carga completa'),
  trophy('pulse50', 'Pulso ×50', 1, 50, 'combo'),
  trophy('pulse100', 'Pulso ×100', 3, 100, 'combo'),
  trophy('chain', 'Reação em Cadeia', 1, 5, 'bolhas na cadeia'),
  trophy('slide', 'Corrente de Bolhas', 2, 20, 'bolhas no mesmo gesto'),
  trophy('grid', 'Grade Acesa', 1, 16, 'teclas distintas em 4 s'),
  trophy('speed', 'Teclado Turbo', 2, 12, 'toques no Switch em 1 s'),
  trophy('crystal1', 'Primeira Fratura', 0, 1, 'cristais'),
  trophy('crystal15', 'Coleção Prismática', 3, 15, 'cristais · marco em 5'),
  trophy('flash1', 'Primeiro Relâmpago', 1, 1, 'desafios'),
  trophy('flash15', 'Tempestade', 3, 15, 'desafios · marco em 5'),
  trophy('taps100', 'Cem Toques', 0, 100, 'toques'),
  trophy('taps10000', 'Dez Mil Toques', 3, 10000, 'toques · marcos em 500 e 2.000'),
  trophy('streak7', 'Chama Prisma', 2, 7, 'dias de ofensiva · marco em 3'),
  trophy('silk', 'Mãos de Seda', 1, 30, 'toques no mudo', true),
  trophy('electric', 'Dedos Elétricos', 2, 1, 'pico', true),
  trophy('flow', 'Fluxo Puro', 3, 30, 'segundos em fluxo', true),
  trophy('hunter', 'Sorte Prismática', 2, 3, 'críticos em 10 s', true),
];
const legacy = [
  trophy('triple', 'Trinca em Chamas', 2, 3, ''),
  trophy('taps500', 'Quinhentos Toques', 1, 500, ''),
  trophy('collection', 'Paleta e Timbre', 2, 2, ''),
];
const allTrophies = [...catalog, ...legacy];
const legacyIds = new Set(legacy.map(item => item.id));
const rarity = ['Bronze', 'Prata', 'Ouro', 'Prisma'];
const glyph = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 3h10v5c0 4-2 6-5 6S7 12 7 8V3Zm0 2H3v2c0 3 2 4 5 4m9-6h4v2c0 3-2 4-5 4m-4 3v5m-4 2h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const milestones = { taps10000: [500, 2000], crystal15: [5], flash15: [5], streak7: [3] };
const count = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function retentionSave(raw) {
  const data = record(raw);
  const progress = record(data.progress);
  const earned = record(data.earned);
  const pending = ['daily', 'bonus', 'level', 'milestone'];
  return {
    progress: Object.fromEntries(allTrophies.map(item => [item.id, Math.min(item.goal, count(progress[item.id]))])),
    earned: Object.fromEntries(allTrophies.filter(item => earned[item.id] === 1 || earned[item.id] === 2).map(item => [item.id, earned[item.id]])),
    tapsByMode: Object.fromEntries(['pulse', 'bubbles', 'keys'].map(mode => [mode, count(record(data.tapsByMode)[mode])])),
    day: typeof data.day === 'string' ? data.day : '',
    streak: streakSave(data.streak, data.day, count(data.streak)), crystals: count(data.crystals), challenges: count(data.challenges),
    queue: Array.isArray(data.queue) ? data.queue.filter(item => pending.includes(item)) : [],
    cracks: Math.min(2, count(data.cracks)),
  };
}

export class Trophies {
  constructor(data, feedback, reward, milestone) {
    this.data = data;
    this.feedback = feedback;
    this.reward = reward;
    this.milestone = milestone;
    this.panel = document.querySelector('#trophy-panel');
    this.list = document.querySelector('#trophy-list');
    this.toast = document.querySelector('#trophy-toast');
    this.tracker = document.querySelector('#almost');
    this.queue = [];
    this.filter = 'all';
    document.querySelector('#trophies').addEventListener('click', () => this.open());
    this.tracker.addEventListener('click', () => this.open(this.tracker.dataset.target));
    this.panel.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
      this.filter = button.dataset.filter;
      this.render();
    }));
    this.panel.addEventListener('click', event => {
      const id = event.target.closest('[data-claim]')?.dataset.claim;
      if (id) this.claim(id);
    });
    this.refresh();
  }

  reset(data) {
    this.data = data;
    this.queue.length = 0;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.toast.hidden = true;
    this.refresh();
  }

  update(values, announce = true) {
    let changed = false;
    for (const item of catalog) {
      if (!(item.id in values) || this.data.earned[item.id]) continue;
      const previous = this.data.progress[item.id];
      const next = Math.min(item.goal, Math.max(previous, count(values[item.id])));
      if (next === previous && next < item.goal) continue;
      this.data.progress[item.id] = next;
      changed = true;
      if (next >= item.goal) {
        this.data.earned[item.id] = 1;
        if (announce) this.queue.push(item);
      } else if (announce && milestones[item.id]?.some(step => previous < step && next >= step)) {
        this.queue.push({ ...item, title: item.title + ' · ' + next.toLocaleString('pt-BR'), milestone: true });
        this.milestone();
      }
    }
    if (changed) this.refresh();
    if (!this.timer) this.showToast();
  }

  showToast() {
    const next = this.queue.shift();
    this.toast.hidden = !next;
    if (!next) return;
    this.toast.dataset.rarity = next.rarity;
    this.toast.replaceChildren();
    this.toast.insertAdjacentHTML('afterbegin', glyph);
    const text = document.createElement('span');
    text.textContent = (next.milestone ? 'Marco · ' : rarity[next.rarity] + ' · ') + next.title;
    this.toast.append(text);
    this.toast.getAnimations().forEach(animation => animation.cancel());
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.toast.animate([{ transform: 'translate(-50%, -8px) scale(.86)', opacity: 0 }, { transform: 'translate(-50%, 1px) scale(1.04)', opacity: 1, offset: .65 }, { transform: 'translateX(-50%) scale(1)', opacity: 1 }], { duration: 300, easing: 'ease-out' });
    }
    this.feedback(next.rarity);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.showToast();
    }, 1900);
  }

  refresh() {
    const earned = Object.values(this.data.earned);
    const claimed = catalog.filter(item => this.data.earned[item.id] === 2).length;
    const available = earned.filter(value => value === 1).length;
    document.documentElement.dataset.aura = Math.floor(claimed * 4 / catalog.length);
    const badge = document.querySelector('#trophy-badge');
    badge.textContent = available;
    badge.hidden = !available;
    let closest;
    let best = -1;
    for (const item of catalog) {
      if (item.secret || this.data.earned[item.id]) continue;
      const ratio = this.data.progress[item.id] / item.goal;
      if (ratio > best) {
        best = ratio;
        closest = item;
      }
    }
    this.tracker.hidden = !closest;
    if (closest) {
      this.tracker.dataset.target = closest.id;
      this.tracker.classList.toggle('near', best > .8);
      this.tracker.querySelector('span').textContent = closest.title + ' · ' + this.data.progress[closest.id] + '/' + closest.goal;
      this.tracker.querySelector('progress').value = best;
    }
    if (this.panel.open) this.render();
  }

  unlockedCount() {
    return catalog.reduce((total, item) => total + Number(Boolean(this.data.earned[item.id])), 0);
  }

  claimedCount() {
    return catalog.reduce((total, item) => total + Number(this.data.earned[item.id] === 2), 0);
  }

  open(id) {
    this.filter = 'all';
    this.panel.querySelector('#claim-feedback').textContent = '';
    this.panel.showModal();
    this.render();
    if (id) {
      const row = document.getElementById('trophy-' + id);
      row?.focus({ preventScroll: true });
      row?.scrollIntoView({ block: 'center' });
    } else {
      this.list.scrollTop = 0;
    }
  }

  claim(id) {
    let xp = 0;
    let charge = 0;
    for (const item of allTrophies) {
      if ((id === 'all' || id === item.id) && this.data.earned[item.id] === 1) {
        this.data.earned[item.id] = 2;
        xp += [20, 35, 55, 85][item.rarity];
        charge += [8, 12, 18, 25][item.rarity];
      }
    }
    if (!xp) return;
    this.reward(xp, charge);
    this.refresh();
    this.panel.querySelector('#claim-feedback').textContent = '+' + xp + ' XP · +' + charge + '% de carga';
  }

  render() {
    const unlocked = this.unlockedCount();
    const pct = Math.floor(unlocked * 100 / catalog.length);
    this.panel.querySelector('#trophy-summary').textContent = unlocked + ' / ' + catalog.length + ' Troféus — ' + pct + '%';
    this.panel.querySelector('#trophy-progress').value = pct;
    this.panel.querySelector('[data-claim="all"]').disabled = !Object.values(this.data.earned).includes(1);
    this.panel.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', button.dataset.filter === this.filter));
    const scroll = this.list.scrollTop;
    const focused = this.list.contains(document.activeElement) ? document.activeElement.dataset.claim : undefined;
    this.list.replaceChildren();
    for (const item of allTrophies) {
      const status = this.data.earned[item.id];
      if (legacyIds.has(item.id) && !status) continue;
      if ((this.filter === 'claim' && status !== 1) || (this.filter === 'earned' && !status)) continue;
      const row = document.createElement('article');
      row.className = 'trophy-row';
      row.id = 'trophy-' + item.id;
      row.tabIndex = -1;
      const hidden = item.secret && !status;
      if (!hidden) {
        row.dataset.rarity = item.rarity;
        row.insertAdjacentHTML('afterbegin', glyph);
      }
      const content = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = hidden ? '???' : item.title;
      content.append(title);
      if (!hidden) {
        const detail = document.createElement('small');
        detail.textContent = rarity[item.rarity] + (legacyIds.has(item.id) ? ' · Arquivado' : '') + (status === 2 ? ' · Resgatado' : status === 1 ? ' · Desbloqueado' : ' · ' + this.data.progress[item.id] + '/' + item.goal + ' ' + item.unit);
        content.append(detail);
        if (!status) {
          const bar = document.createElement('progress');
          bar.max = item.goal;
          bar.value = this.data.progress[item.id];
          bar.setAttribute('aria-label', 'Progresso de ' + item.title);
          content.append(bar);
        }
      }
      row.append(content);
      if (status === 1) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.claim = item.id;
        button.textContent = 'Resgatar';
        row.append(button);
      }
      this.list.append(row);
    }
    if (!this.list.childElementCount) this.list.textContent = 'Nenhum troféu neste filtro.';
    this.list.scrollTop = scroll;
    if (focused) this.list.querySelector('[data-claim="' + focused + '"]')?.focus({ preventScroll: true });
  }
}
