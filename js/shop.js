const MAX_LEVEL = 8;
const MAX_BALANCE = Number.MAX_SAFE_INTEGER;
const format = new Intl.NumberFormat('pt-BR');
const signed = n => '+' + format.format(n);
const upgrades = [
  { id: 'critical', name: 'Ressonância Crítica', base: 16, effect: n => signed(n * 1.5) + ' p.p. de chance de crítico em todos os estados' },
  { id: 'yield', name: 'Ganho de Fragmentos', base: 22, effect: n => signed(n * 20) + '% de Fragmentos em toques e recompensas' },
  { id: 'fever', name: 'Condutividade de Fever', base: 26, effect: n => signed(n * 8) + '% de carga por ação, ' + signed(n * .35) + ' s de Fever e ' + signed(n * .2) + ' s de Supernova' },
  { id: 'particles', name: 'Densidade de Partículas', base: 20, effect: n => signed(n * 8) + '% de partículas por efeito e ' + signed(n * 5) + '% de alcance nas ondas' },
  { id: 'chain', name: 'Força de Cadeia', base: 22, effect: n => signed(n * 4) + ' p.p. de reação e ' + signed(n * 7) + '% de alcance em Bolhas' },
  { id: 'switch', name: 'Sobrecarga de Switch', base: 20, effect: n => signed(n * 3) + ' faíscas por tecla e ' + signed(n * 5) + '% de XP no ritmo ×2 ou maior' },
  { id: 'crystal', name: 'Estabilizador de Cristal', base: 24, effect: n => signed(n * 8) + '% de XP em cristais e relâmpagos. ' + signed(n * 3) + ' pontos de carga nas duas recompensas' },
];

export const skins = [
  { id: 'classic', name: 'Núcleo Clássico', description: 'Orb luminoso com partículas suaves.', cost: 0, shape: 0 },
  { id: 'solar', name: 'Anel Solar', description: 'Halo incandescente e faíscas circulares.', cost: 52, shape: 1 },
  { id: 'vortex', name: 'Vórtice Orbital', description: 'Anéis inclinados e poeira orbital.', cost: 76, shape: 2 },
  { id: 'grid', name: 'Grade Cibernética', description: 'Malha precisa e faíscas em quadrados.', cost: 100, shape: 0 },
  { id: 'crystal', name: 'Cristal Hiperbólico', description: 'Núcleo facetado e estilhaços luminosos.', cost: 128, shape: 2 },
  { id: 'abyss', name: 'Espectro Abissal', description: 'Camadas profundas com pontos de luz.', cost: 158, shape: 1 },
  { id: 'plasma', name: 'Plasma Espectral', description: 'Interferência de luz e descargas em forma de traço.', cost: 192, shape: 3 },
];
const upgradeIcons = {
  "critical": "M13 2 5 13h6l-1 9 9-12h-6l1-8Z",
  "yield": "m12 2 8 6-3 11h-10L4 8l8-6Zm-8 6h16m-13 11 5-11 5 11",
  "fever": "M13 2c2 6-3 7-3 11-2-1-2-3-2-4-3 3-4 5-4 7a8 8 0 0 0 16 0c0-5-4-10-7-14Zm-1 19c-4 0-4-4 0-7 0 2 2 3 2 5 0 1-1 2-2 2Z",
  "particles": "M12 2v5m0 10v5M2 12h5m10 0h5M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3m-7 2 2 2-2 2-2-2 2-2Z",
  "chain": "M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm8 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-12-1h2m12-15h2m-1-1v2",
  "switch": "M5 7h14l2 5v6H3v-6l2-5Zm-2 5h18m-12 3h6m-3-13v2",
  "crystal": "m12 2 7 4v9l-7 7-7-7V6l7-4Zm0 0 3 7-3 13L9 9l3-7ZM5 6l4 3h6l4-3"
};
const rewards = { tap: 1, critical: 4, crystal: 12, lightning: 24, fever: 8, nova: 16 };
const number = (value, max) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;

export function upgradeCost(base, level) {
  return Math.ceil(base * (1 + level * .45 + level ** 2 * .12));
}

export function shopSave(raw) {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const owned = skins.filter(item => item.cost === 0 || (Array.isArray(data.owned) && data.owned.includes(item.id))).map(item => item.id);
  return {
    balance: number(data.balance, MAX_BALANCE),
    remainder: number(data.remainder, 4),
    levels: Object.fromEntries(upgrades.map(item => [item.id, number(data.levels?.[item.id], MAX_LEVEL)])),
    owned,
    equipped: owned.includes(data.equipped) ? data.equipped : 'classic',
  };
}

export function shopEffects(levels) {
  return {
    critical: levels.critical * .015,
    feverRate: 1 + levels.fever * .08,
    feverDuration: 8000 + levels.fever * 350,
    novaDuration: 5000 + levels.fever * 200,
    particleRate: 1 + levels.particles * .08,
    wave: 1 + levels.particles * .05,
    chainChance: .48 + levels.chain * .04,
    chainRange: 2.45 * (1 + levels.chain * .07),
    chainLimit: 8 + Math.floor(levels.chain / 2),
    switchSparks: levels.switch * 3,
    switchXP: levels.switch * .05,
    crystalXP: 1 + levels.crystal * .08,
    crystalCharge: levels.crystal * 3,
  };
}

export class Shop {
  constructor(data, { apply, persist, feedback }) {
    this.apply = apply;
    this.persist = persist;
    this.feedback = feedback;
    this.button = document.querySelector('#shop');
    this.panel = document.querySelector('#shop-panel');
    this.list = document.querySelector('#shop-list');
    this.balance = document.querySelector('#shop-balance');
    this.status = document.querySelector('#shop-status');
    this.tabs = this.panel.querySelectorAll('[data-shop-tab]');
    this.tab = 'upgrades';
    this.button.addEventListener('click', () => {
      this.status.textContent = '';
      this.panel.showModal();
      this.render();
    });
    this.tabs.forEach(tab => tab.addEventListener('click', () => {
      this.tab = tab.dataset.shopTab;
      this.status.textContent = '';
      this.list.scrollTop = 0;
      this.render();
    }));
    this.list.addEventListener('click', event => {
      const button = event.target.closest('[data-shop-item]');
      if (!button || button.disabled) return;
      this.act(button.dataset.shopItem);
    });
    this.use(data);
  }

  use(data) {
    this.data = data;
    this.effects = shopEffects(data.levels);
    this.threshold = this.nextPrice();
    this.apply(skins.find(item => item.id === data.equipped), this.effects);
    this.updateIndicator();
    this.status.textContent = '';
    if (this.panel.open) this.render();
  }

  nextPrice() {
    let min = Infinity;
    for (const item of upgrades) {
      const level = this.data.levels[item.id];
      if (level < MAX_LEVEL) min = Math.min(min, upgradeCost(item.base, level));
    }
    for (const item of skins) {
      if (!this.data.owned.includes(item.id)) min = Math.min(min, item.cost);
    }
    return min;
  }

  earn(event, value = rewards[event]) {
    if (!Number.isSafeInteger(value) || value <= 0) return;
    const data = this.data;
    const extra = data.remainder + value * data.levels.yield;
    const before = data.balance;
    data.remainder = extra % 5;
    data.balance = Math.min(MAX_BALANCE, before + value + Math.floor(extra / 5));
    if ((before < this.threshold) !== (data.balance < this.threshold)) this.updateIndicator();
    if (this.panel.open && before !== data.balance) this.render();
  }

  updateIndicator() {
    const affordable = this.data.balance >= this.threshold;
    this.button.querySelector('span').hidden = !affordable;
    this.button.setAttribute('aria-label', affordable ? 'Loja · itens disponíveis' : 'Loja');
  }

  act(id) {
    const data = this.data;
    let purchased = false;
    let text;
    if (this.tab === 'upgrades') {
      const item = upgrades.find(upgrade => upgrade.id === id);
      if (!item) return;
      const level = data.levels[id];
      const cost = upgradeCost(item.base, level);
      if (level >= MAX_LEVEL || data.balance < cost) return;
      data.balance -= cost;
      data.levels[id]++;
      this.effects = shopEffects(data.levels);
      purchased = true;
      text = item.name + ' · nível ' + data.levels[id];
    } else {
      const item = skins.find(skin => skin.id === id);
      if (!item) return;
      if (!data.owned.includes(id)) {
        if (data.balance < item.cost) return;
        data.balance -= item.cost;
        data.owned.push(id);
        purchased = true;
      }
      data.equipped = data.equipped === id ? 'classic' : id;
      text = 'Equipada · ' + skins.find(skin => skin.id === data.equipped).name;
    }
    this.threshold = this.nextPrice();
    this.apply(skins.find(item => item.id === data.equipped), this.effects);
    this.updateIndicator();
    this.persist();
    this.render(id);
    this.status.textContent = text;
    if (purchased) this.feedback();
  }

  render(focusId) {
    this.balance.textContent = format.format(this.data.balance);
    this.tabs.forEach(tab => tab.setAttribute('aria-pressed', tab.dataset.shopTab === this.tab));
    const scroll = this.list.scrollTop;
    const focused = focusId ?? document.activeElement?.dataset.shopItem;
    const items = this.tab === 'upgrades' ? upgrades : skins;
    this.list.replaceChildren(...items.map(item => this.card(item)));
    this.list.scrollTop = scroll;
    if (focused) {
      const button = this.list.querySelector('[data-shop-item="' + focused + '"]');
      if (button && !button.disabled) button.focus({ preventScroll: true });
      else button?.closest('article').focus({ preventScroll: true });
    }
  }

  card(item) {
    const isUpgrade = this.tab === 'upgrades';
    const level = this.data.levels[item.id];
    const owned = this.data.owned.includes(item.id);
    const equipped = this.data.equipped === item.id;
    const cost = isUpgrade ? upgradeCost(item.base, level) : item.cost;
    const max = isUpgrade && level >= MAX_LEVEL;
    const row = document.createElement('article');
    row.className = 'shop-card';
    row.tabIndex = -1;
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.name;
    const detail = document.createElement('small');
    if (isUpgrade) {
      const icon = document.createElement('span');
      icon.className = 'upgrade-icon';
      icon.dataset.upgrade = item.id;
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path d="' + upgradeIcons[item.id] + '"/></svg>';
      row.append(icon);
      const current = level ? item.effect(level) : 'Bônus inicial';
      detail.textContent = 'Nv. ' + level + '/' + MAX_LEVEL + ' · ' + current;
      if (!max) {
        const next = document.createElement('small');
        next.textContent = 'Próximo nível · ' + item.effect(level + 1);
        content.append(title, detail, next);
      }
    } else {
      detail.textContent = item.description + (equipped ? ' · Equipada' : '');
      const preview = document.createElement('span');
      preview.className = 'skin-preview';
      preview.dataset.skin = item.id;
      preview.setAttribute('aria-hidden', 'true');
      row.append(preview);
    }
    if (!content.firstChild) content.append(title, detail);
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.shopItem = item.id;
    const buying = isUpgrade || !owned;
    button.disabled = max || (equipped && item.id === 'classic') || (buying && this.data.balance < cost);
    button.textContent = max ? 'Nível máximo' : buying ? 'Comprar · ' + format.format(cost) + ' ◈'
      : equipped ? (item.id === 'classic' ? 'Equipado' : 'Desequipar') : 'Equipar';
    button.setAttribute('aria-label', button.textContent + ' · ' + item.name);
    row.append(content, button);
    return row;
  }
}
