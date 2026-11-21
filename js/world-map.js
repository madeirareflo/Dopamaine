const worlds = [
  { name: 'Núcleo Pulso', theme: 'pulse', nodes: [
    ['Ignição', 'taps', 8, 'toques', 'critical', 1, 'Acerte 1 crítico'],
    ['Câmara de Eco', 'taps', 25, 'toques', 'pulseCombo', 15, 'Combo ×15 no Pulso'],
    ['Coroa de Plasma', 'best', 18, 'combo', 'pulseFever', 1, 'Ative Fever no Pulso'],
    ['Poço Gravitacional', 'level', 3, 'níveis', 'gravity', 1, 'Solte uma carga gravitacional completa'],
    ['Portal do Núcleo', 'taps', 65, 'toques', 'pulseNova', 1, 'Ative Supernova no Pulso'],
  ] },
  { name: 'Mar de Bolhas', theme: 'bubbles', nodes: [
    ['Margem Luminosa', 'bubbles', 8, 'bolhas', 'bubbleChain', 3, 'Faça uma cadeia de 3 bolhas'],
    ['Recife de Correntes', 'bubbles', 20, 'bolhas', 'bubbleChain', 5, 'Faça uma cadeia de 5 bolhas'],
    ['Lago de Cristal', 'crystals', 3, 'cristais', 'slide', 8, 'Estoure 8 bolhas no mesmo deslize'],
    ['Abismo Efervescente', 'bubbles', 45, 'bolhas', 'slide', 15, 'Estoure 15 bolhas no mesmo deslize'],
    ['Farol da Maré', 'bubbles', 75, 'bolhas', 'slide', 20, 'Estoure 20 bolhas no mesmo deslize'],
  ] },
  { name: 'Malha Switch', theme: 'keys', nodes: [
    ['Primeiro Circuito', 'keys', 12, 'teclas', 'grid', 8, 'Acenda 8 teclas distintas em 4 s'],
    ['Barramento', 'keys', 30, 'teclas', 'grid', 16, 'Acenda as 16 teclas em 4 s'],
    ['Câmara de Faíscas', 'level', 8, 'níveis', 'speed', 8, 'Toque 8 vezes em 1 s no Switch'],
    ['Central de Comutação', 'keys', 65, 'teclas', 'speed', 12, 'Toque 12 vezes em 1 s no Switch'],
    ['Nó de Sincronia', 'keys', 100, 'teclas', 'switchNova', 1, 'Ative Supernova no Switch'],
  ] },
  { name: 'Além do Horizonte', theme: 'horizon', nodes: [
    ['Véu Prismático', 'taps', 360, 'toques', 'critical', 30, 'Acumule 30 críticos'],
    ['Órbita Invertida', 'crystals', 8, 'cristais', 'frenzy', 3, 'Ative 3 Sobrecargas de 10 s'],
    ['Fenda de Luz', 'level', 15, 'níveis', 'alternation', 5, 'Complete 5 rotações pelos três modos'],
    ['Eco do Infinito', 'challenges', 3, 'desafios', 'rhythm', 15, 'Ative 15 bônus de ritmo'],
    ['Última Constelação', 'taps', 900, 'toques', 'challenges', 8, 'Complete 8 desafios'],
  ] },
];
const nodes = worlds.flatMap(world => world.nodes);
const coordinates = [[10, 68], [29, 36], [50, 60], [71, 33], [90, 63]];
const keys = ['critical', 'pulseFever', 'pulseNova', 'switchNova', 'frenzy', 'alternation', 'rhythm'];
const integer = (value, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= 0 ? Math.min(max, value) : 0;
const number = new Intl.NumberFormat('pt-BR');

export function mapSave(raw) {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const completed = integer(data.completed, nodes.length);
  return {
    completed,
    seen: integer(data.seen, completed),
    stars: integer(data.stars, (1 << nodes.length) - 1) & ((1 << completed) - 1),
    metrics: Object.fromEntries(keys.map(key => [key, integer(data.metrics?.[key])])),
  };
}

export class WorldMap {
  constructor(data, stats, { reward, save }) {
    this.stats = stats;
    this.reward = reward;
    this.save = save;
    this.button = document.querySelector('#world-map');
    this.badge = this.button.querySelector('span');
    this.hint = document.querySelector('#map-hint');
    this.panel = document.querySelector('#map-panel');
    this.worlds = document.querySelector('#map-worlds');
    this.summary = document.querySelector('#map-summary');
    this.detail = document.querySelector('#map-detail');
    this.marker = document.createElement('span');
    this.marker.className = 'map-marker';
    this.marker.setAttribute('aria-hidden', 'true');
    this.buttons = [];
    this.trails = [];
    worlds.forEach((world, index) => this.createWorld(world, index));
    this.button.addEventListener('click', () => this.open());
    this.hint.addEventListener('click', () => this.open());
    this.worlds.addEventListener('click', event => {
      const node = event.target.closest('[data-node]');
      if (!node) return;
      this.selected = Number(node.dataset.node);
      this.paintPanel();
    });
    this.use(data);
  }

  use(data) {
    this.marker.getAnimations().forEach(animation => animation.cancel());
    this.data = data;
    this.selected = Math.min(data.completed, nodes.length - 1);
    this.hintText = '';
    this.paintHint();
    if (this.panel.open) this.paintPanel();
  }

  value(key) {
    return this.data.metrics[key] ?? this.stats(key);
  }

  record(key) {
    this.data.metrics[key]++;
  }

  refresh() {
    const start = this.data.completed;
    const oldStars = this.data.stars;
    let fragments = 0;
    while (this.data.completed < nodes.length) {
      const node = nodes[this.data.completed];
      if (this.value(node[1]) < node[2]) break;
      fragments += 8 + Math.floor(this.data.completed / 5) * 4;
      this.data.completed++;
    }

    let stars = 0;
    for (let i = 0; i < this.data.completed; i++) {
      const bit = 1 << i;
      if (!(this.data.stars & bit) && this.value(nodes[i][4]) >= nodes[i][5]) {
        this.data.stars |= bit;
        stars++;
      }
    }
    this.paintHint();
    if (this.panel.open) this.paintPanel();
    const gained = this.data.completed - start;
    if (gained || this.data.stars !== oldStars) {
      this.reward(fragments + stars * 5, gained, stars);
      this.save();
    }
  }

  paintHint() {
    const index = this.data.completed;
    const node = nodes[index];
    const text = node ? 'Nó ' + (index + 1) + ' · ' + number.format(this.value(node[1])) + '/' + number.format(node[2]) + ' ' + node[3] : 'Mapa concluído';
    if (text !== this.hintText) {
      this.hint.textContent = this.hintText = text;
      this.hint.setAttribute('aria-label', text + ' · abrir mapa');
    }
    const pending = this.data.seen < index;
    if (this.badge.hidden === pending) {
      this.badge.hidden = !pending;
      this.button.setAttribute('aria-label', pending ? 'Mapa de Mundos · novo nó' : 'Mapa de Mundos');
    }
  }

  createWorld(world, index) {
    const section = document.createElement('section');
    section.className = 'map-world';
    section.dataset.world = world.theme;
    const title = document.createElement('h3');
    title.textContent = (index + 1) + ' · ' + world.name;
    const trail = document.createElement('div');
    trail.className = 'map-trail';
    trail.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M10 68 29 36 50 60 71 33 90 63"/></svg>';
    coordinates.forEach(([x, y], step) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.node = index * 5 + step;
      button.style.left = x + '%';
      button.style.top = y + '%';
      button.textContent = step + 1;
      trail.append(button);
      this.buttons.push(button);
    });
    this.trails.push(trail);
    section.append(title, trail);
    this.worlds.append(section);
  }

  open() {
    const { seen, completed } = this.data;
    this.selected = Math.min(completed, nodes.length - 1);
    this.panel.showModal();
    this.paintPanel();
    this.buttons[this.selected].scrollIntoView({ block: 'center', inline: 'nearest' });
    this.buttons[this.selected].focus({ preventScroll: true });
    if (seen < completed) {
      this.animateMarker(seen, this.selected);
      this.data.seen = completed;
      this.paintHint();
      this.save();
    }
  }

  animateMarker(from, to) {
    this.marker.getAnimations().forEach(animation => animation.cancel());
    if (from >= to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const first = Math.floor(from / 5) === Math.floor(to / 5) ? from % 5 : 0;
    const last = to % 5;
    const points = coordinates.slice(first, last + 1);
    if (points.length < 2) {
      this.marker.animate([{ opacity: 0 }, { opacity: 1 }], 350);
      return;
    }
    this.marker.animate(points.map(([x, y]) => ({ left: x + '%', top: y + '%' })), {
      duration: Math.min(950, (points.length - 1) * 240), easing: 'ease-in-out',
    });
  }

  paintPanel() {
    const { completed, stars } = this.data;
    let starCount = 0;
    this.buttons.forEach((button, i) => {
      const done = i < completed;
      const starred = Boolean(stars & (1 << i));
      starCount += Number(starred);
      button.dataset.status = done ? 'done' : i === completed ? 'current' : 'locked';
      button.setAttribute('aria-pressed', i === this.selected);
      button.setAttribute('aria-label', 'Nó ' + (i + 1) + ' · ' + (done ? nodes[i][0] + (starred ? ' · estrela' : ' · concluído') : i === completed ? nodes[i][0] + ' · atual' : 'bloqueado'));
      button.textContent = starred ? '★' : done ? '✓' : i % 5 + 1;
    });
    const index = Math.min(completed, nodes.length - 1);
    const [x, y] = coordinates[index % 5];
    this.marker.style.left = x + '%';
    this.marker.style.top = y + '%';
    const trail = this.trails[Math.floor(index / 5)];
    if (this.marker.parentNode !== trail) trail.append(this.marker);
    this.summary.textContent = completed + '/20 nós · ' + starCount + '/20 estrelas';
    const node = nodes[this.selected];
    const hidden = this.selected > completed;
    this.detail.querySelector('strong').textContent = 'Nó ' + (this.selected + 1) + ' · ' + (hidden ? 'Bloqueado' : node[0]);
    this.detail.querySelector('p').textContent = hidden ? 'Conclua a trilha anterior para revelar este nó.' : this.selected < completed ? 'Concluído' : number.format(this.value(node[1])) + '/' + number.format(node[2]) + ' ' + node[3];
    this.detail.querySelector('small').textContent = hidden ? '' : (stars & (1 << this.selected) ? '★ ' : '☆ ') + node[6];
    const bar = this.detail.querySelector('progress');
    bar.hidden = this.selected !== completed;
    bar.max = node[2];
    bar.value = this.value(node[1]);
  }
}
