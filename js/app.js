import { Synth } from './audio.js';
import { Effects } from './particles.js';
import { Retention, retentionSave } from './retention.js';

import { Impact } from './impact.js';
import { Shop, shopSave } from './shop.js';
import { WorldMap, mapSave } from './world-map.js';
import { Frenzy } from './frenzy.js';
import { SessionEvents } from './session-events.js';
import { Collectibles, echoSave } from './collectibles.js';
import { QuickPanel, loadoutSave } from './loadouts.js';

const $ = id => document.getElementById(id);
const root = document.documentElement;
const field = $('field');
const core = $('core');
const bonus = $('bonus');
const panel = $('panel');
const effects = new Effects($('effects'));
const audio = new Synth();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const storageKey = 'prisma.progress.v1';
const themes = [
  ['Cyber Neon', '#ed75ff', '#7026bc', 1],
  ['Ouro Solar', '#ffd578', '#a65b12', 2],
  ['Plasma Roxo', '#bd9fff', '#5126ca', 3],
  ['Esmeralda Zen', '#71ffd1', '#0b806a', 4],
  ['Vaporwave', '#ff93d4', '#3765b9', 5],
];
const sounds = [
  ['Bolha Orgânica', 1], ['Teclado Mecânico', 2], ['Synth Retrô', 3], ['Cristal', 4],
];
const modes = {
  pulse: ['PULSO', 'Toque no núcleo para criar um pulso'],
  bubbles: ['BOLHAS', 'Toque ou deslize para estourar as bolhas'],
  keys: ['SWITCH', 'Pressione as teclas e experimente o ritmo'],
};
const randomInterval = () => 20 + Math.floor(Math.random() * 26);
const fresh = () => ({
  taps: 0, xp: 0, level: 1, best: 0, theme: 0, sound: 0, atmosphere: 0, muted: false,
  themes: [0], sounds: [0], untilBonus: randomInterval(), retention: retentionSave(), shop: shopSave(), worldMap: mapSave(), echoes: [], loadouts: [null, null, null],
});

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const base = fresh();
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return base;
    for (const key of ['taps', 'xp', 'level', 'best', 'untilBonus']) {
      if (Number.isSafeInteger(saved[key]) && saved[key] >= 0) base[key] = saved[key];
    }
    base.level = Math.max(1, base.level);
    for (const [key, selected, catalog] of [['themes', 'theme', themes], ['sounds', 'sound', sounds]]) {
      if (Array.isArray(saved[key])) {
        base[key] = [...new Set([0, ...saved[key].filter(index => Number.isInteger(index) && index >= 0 && index < catalog.length)])];
      }
      if (base[key].includes(saved[selected])) base[selected] = saved[selected];
    }
    base.atmosphere = Number.isInteger(saved.atmosphere) && saved.atmosphere >= 0 && saved.atmosphere < 4 ? saved.atmosphere : 0;
    base.muted = saved.muted === true;
    base.retention = retentionSave(saved.retention);
    base.shop = shopSave(saved.shop);
    base.echoes = echoSave(saved.echoes);
    base.loadouts = loadoutSave(saved.loadouts, base);
    base.worldMap = mapSave(saved.worldMap);
    if (!saved.worldMap) {
      base.worldMap.metrics.critical = base.retention.progress.critical;
      base.worldMap.metrics.pulseFever = base.retention.progress.fever;
      base.worldMap.metrics.pulseNova = base.retention.progress.nova;
    }
    return base;
  } catch {
    return fresh();
  }
}

let state = load();
let mode = 'pulse';
let combo = 0;
let last = -Infinity;
let energy = 0;
let chargeHold = 0;
let feverEnd = 0;
let messageUntil = 0;
let spring = 0;
let velocity = 0;
let impact = 0;
let saveTimer;
let lastVibration = -Infinity;
let installPrompt;
const pointers = new Map();
const keyTimers = new WeakMap();
const pendingChain = new Set();
const number = new Intl.NumberFormat('pt-BR');

function save() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // The game remains playable with browser storage disabled.
  }
}

function vibrate(pattern, now = performance.now()) {
  if (typeof navigator.vibrate !== 'function') return;
  if (typeof pattern === 'number' && now - lastVibration < 70) return;
  try { navigator.vibrate(pattern); } catch { return; }
  lastVibration = now;
}

function meter() {
  $('level').textContent = 'Nível ' + state.level;
  $('score').textContent = number.format(state.taps) + (state.taps === 1 ? ' toque' : ' toques');
  $('xp').value = 100 * state.xp / levelCost();
}

function levelCost() {
  return 80 + (state.level - 1) * 28;
}

function applyStyle() {
  const [, accent, deep] = themes[state.theme];
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--deep', deep);
  audio.atmosphere = state.atmosphere;
  audio.setMuted(state.muted);
  $('mute').setAttribute('aria-pressed', state.muted);
  $('mute').textContent = state.muted ? '♫' : '♪';
  quick?.renderIfOpen();
}

function message(text, now, duration = 1800) {
  $('hint').textContent = text;
  messageUntil = now + duration;
}

function localPoint(element) {
  const bounds = element.getBoundingClientRect();
  const area = field.getBoundingClientRect();
  return [bounds.left + bounds.width / 2 - area.left, bounds.top + bounds.height / 2 - area.top];
}

function gainXP(amount, now) {
  state.xp += amount;
  while (state.xp >= levelCost()) {
    state.xp -= levelCost();
    state.level++;
    retention.crystal.add('level');
    themes.forEach((theme, index) => {
      if (theme[3] === state.level && !state.themes.includes(index)) state.themes.push(index);
    });
    sounds.forEach((sound, index) => {
      if (sound[1] === state.level && !state.sounds.includes(index)) state.sounds.push(index);
    });
    audio.reward();
    message('Nível ' + state.level + '!', now);
  }
}

function charge(amount, now) {
  if (now < feverEnd || now < impactFx.novaEnd) return false;
  energy = Math.min(100, energy + amount);
  if (energy < 100) return false;
  feverEnd = now + shop.effects.feverDuration;
  energy = 0;
  message('FEVER MODE!', now, 2200);
  audio.reward(true);
  vibrate([14, 28, 14, 28, 25], now);
  shop.earn('fever');
  if (mode === 'pulse') worldMap.record('pulseFever');
  retention.fever(mode, now);
  return true;
}

function grant(xp, amount, now) {
  gainXP(xp, now);
  chargeHold = Math.max(chargeHold, now + 12000);
  if (now < feverEnd || now < impactFx.novaEnd) energy = Math.min(100, energy + amount);
  else charge(amount, now);
  worldMap.refresh();
  meter();
}

function burst(label, count, target, point) {
  const [x, y] = point ?? (target ? localPoint(target) : [effects.width / 2, effects.height * .55]);
  effects.emit(x, y, '#ffdb88', reducedMotion.matches ? 10 : count, label, true, 24);
}

function action(x, y, key = -1, slide = 0) {
  const now = performance.now();
  combo = Math.max(0, combo - Math.floor(Math.max(0, now - last - 470) / 140)) + 1;
  last = now;
  state.taps++;
  state.best = Math.max(state.best, combo);
  const multiplier = Math.min(10, 1 + Math.floor(combo / 4));
  const mirrored = session.action(now, combo);
  const tuning = shop.effects;
  const flow = frenzy.tap(mode, now);
  if (flow.rhythm) worldMap.record('rhythm');
  if (flow.alternate) worldMap.record('alternation');
  const started = charge((4 + multiplier * .75 + flow.charge) * tuning.feverRate, now);
  const fever = now < feverEnd;
  if (fever) impactFx.novaTap(now, tuning.novaDuration);
  const nova = now < impactFx.novaEnd;
  const critical = Math.random() < (nova ? .25 : fever ? .15 : .07) + tuning.critical;
  shop.earn(critical ? 'critical' : 'tap');
  if (flow.active) shop.earn('frenzy', critical ? 4 : 1);
  if (critical) worldMap.record('critical');
  const label = started ? 'FEVER!' : combo === 25 ? 'INSANE!' : combo === 8 ? 'NICE!' : combo === 16 ? '×5' : flow.alternate ? '3 MODOS!' : flow.rhythm ? 'RITMO!' : '+1';
  const count = mode === 'keys' ? 7 + tuning.switchSparks : 13;
  const accent = themes[state.theme][1];
  const renderHit = () => effects.emit(x, y, critical ? '#ffe29c' : accent,
    reducedMotion.matches ? 4 : count * (nova ? 4 : fever ? 3 : 1) + flow.particles + (critical ? 25 : 0),
    critical ? 'PRISMA ×3!' : label, nova || fever || flow.active || critical, critical ? 26 : 18);
  if (critical) impactFx.hit(now, () => {
    renderHit();
    impact = Math.max(impact, 4.5);
  });
  else renderHit();
  impactFx.echo(now, x, y, accent, combo);
  impactFx.trace(x, y, now);
  const pitch = audio.play(state.sound, combo, fever || nova, mode, mirrored);
  session.note(pitch, combo, fever || nova);
  if (mode === 'keys') session.switch(now, x, y, accent);
  if (critical) {
    audio.critical();
    vibrate([12, 28, 18], now);
    if (!reducedMotion.matches) field.animate([{ filter: 'brightness(1.24)' }, { filter: 'brightness(1)' }], 160);
  } else if (!started && (combo === 8 || combo === 16 || combo === 25)) {
    audio.reward();
    vibrate([12, 32, 16], now);
  } else if (!started) vibrate(10, now);
  if (!critical) impact = Math.min(4, 1 + multiplier * .3);
  const xp = multiplier * (fever || nova ? 2 : 1) * (critical ? 3 : 1);
  const switchBonus = mode === 'keys' && multiplier >= 2 ? Math.round(xp * tuning.switchXP) : 0;
  gainXP(xp + switchBonus, now);
  if (bonus.hidden && --state.untilBonus <= 0) bonus.hidden = false;
  retention.tap(mode, combo, critical, state.muted, pointers.size, key, slide, now);
  worldMap.refresh();
  meter();
  if (!saveTimer) saveTimer = setTimeout(save, 250);
}

function collect() {
  if (bonus.hidden) return;
  bonus.hidden = true;
  state.untilBonus = randomInterval();
  retention.crystal.add('bonus');
  burst('+ Cristal', 20, $('crystal'));
  audio.crack(1);
  save();
}

function unlockCosmetic() {
  const locked = [
    ...themes.map((item, index) => [item[0], index, state.themes]),
    ...sounds.map((item, index) => [item[0], index, state.sounds]),
  ].filter(([, index, owned]) => !owned.includes(index));
  const reward = locked[Math.floor(Math.random() * locked.length)];
  if (reward) {
    reward[2].push(reward[1]);
    message('Desbloqueado · ' + reward[0], performance.now(), 2600);
  }
}

const bubbles = Array.from({ length: 16 }, (_, index) => {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = 'bubble';
  element.setAttribute('aria-label', 'Estourar bolha ' + (index + 1));
  $('bubbles').append(element);
  return { element, index, phase: Math.random() * 6.28, until: 0, x: 0, y: 0 };
});
const bubbleByElement = new Map(bubbles.map(bubble => [bubble.element, bubble]));

function drawBubbles(now) {
  const { width, height } = effects;
  const columns = width > height * 1.35 ? 8 : 4;
  const rows = 16 / columns;
  const cell = Math.min(width / columns, height / rows);
  for (const bubble of bubbles) {
    if (bubble.until > now) continue;
    const { element, index, phase } = bubble;
    const drift = reducedMotion.matches ? 0 : cell * .16;
    const diameter = cell * (.53 + .22 * Math.sin(phase) ** 2);
    bubble.x = (index % columns + .5) * width / columns + Math.sin(now / 620 + phase) * drift;
    bubble.y = (Math.floor(index / columns) + .5) * height / rows + Math.cos(now / 720 + phase) * drift;
    if (bubble.diameter !== diameter) {
      element.style.width = element.style.height = diameter + 'px';
      bubble.diameter = diameter;
    }
    element.style.transform = 'translate(' + (bubble.x - diameter / 2) + 'px,' + (bubble.y - diameter / 2) + 'px)';
    element.hidden = false;
  }
}

function pop(bubble, chain = null, drag = null) {
  if (bubble.element.hidden) return;
  const now = performance.now();
  bubble.element.hidden = true;
  bubble.phase = Math.random() * 6.28;
  bubble.until = now + 750 + Math.random() * 650;
  if (chain) {
    chain.size++;
    retention.chain(chain.size, now);
    session.chain(now, chain.size, bubble.x, bubble.y, themes[state.theme][1]);
    worldMap.refresh();
    effects.emit(bubble.x, bubble.y, themes[state.theme][1], reducedMotion.matches ? 4 : (now < feverEnd ? 30 : 10));
    audio.play(state.sound, Math.max(1, combo), now < feverEnd, 'bubbles', session.active(now));
  } else {
    if (drag) {
      if (now - drag.lastPop > 1600) drag.count = 0;
      drag.lastPop = now;
      drag.count++;
    }
    action(bubble.x, bubble.y, -1, drag?.count ?? 0);
    if (Math.random() >= shop.effects.chainChance) return;
    chain = { size: 1, marked: new Set([bubble]) };
  }
  const adjacent = bubbles.filter(other => !other.element.hidden && !chain.marked.has(other) &&
    Math.hypot(other.x - bubble.x, other.y - bubble.y) < bubble.diameter * shop.effects.chainRange);
  for (const [index, other] of adjacent.slice(0, 2).entries()) {
    if (chain.marked.size >= shop.effects.chainLimit) break;
    chain.marked.add(other);
    const timer = setTimeout(() => {
      pendingChain.delete(timer);
      if (mode === 'bubbles') pop(other, chain);
    }, 65 * (index + 1));
    pendingChain.add(timer);
  }
}

for (const symbol of ['◆', '●', '✦', '■', '▲', '◉', '✧', '◇', '✚', '▰', '◒', '✳', '◈', '▣', '✹', '◍']) {
  const button = document.createElement('button');
  button.className = 'key';
  button.dataset.index = $('keys').children.length;
  button.type = 'button';
  button.textContent = symbol;
  button.setAttribute('aria-label', 'Tecla ' + ($('keys').children.length + 1));
  $('keys').append(button);
}

function strike(target) {
  if (target === $('crystal')) {
    retention.crystal.hit(performance.now());
    save();
  } else if (target === bonus) {
    collect();
  } else if (target === core) {
    velocity = 9;
    spring = Math.max(spring, .47);
    core.style.setProperty('--pulse', reducedMotion.matches ? 0 : spring);
    action(...localPoint(core));
  } else if (bubbleByElement.has(target)) {
    pop(bubbleByElement.get(target));
  } else if (target?.classList.contains('key')) {
    clearTimeout(keyTimers.get(target));
    target.classList.add('active');
    keyTimers.set(target, setTimeout(() => target.classList.remove('active'), 145));
    action(...localPoint(target), Number(target.dataset.index));
  }
}

document.addEventListener('pointerdown', () => audio.unlock(), { capture: true });
document.addEventListener('keydown', () => audio.unlock(), { capture: true });
field.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, count: 0, lastPop: -Infinity });
  const target = event.target.closest('button');
  if (mode === 'bubbles' || target === core) field.setPointerCapture(event.pointerId);
  if (mode === 'pulse' && target === core) impactFx.begin(event.pointerId, performance.now());
  strike(target);
});
field.addEventListener('pointermove', event => {
  const previous = pointers.get(event.pointerId);
  const now = performance.now();
  if (now < impactFx.novaEnd) {
    const area = field.getBoundingClientRect();
    impactFx.trace(event.clientX - area.left, event.clientY - area.top, now);
  }
  if (!previous || mode !== 'bubbles') return;
  const { x, y } = previous;
  const dx = event.clientX - x;
  const dy = event.clientY - y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return;
  const steps = Math.min(30, Math.max(1, Math.ceil(distance / 10)));
  for (let i = 1; i <= steps; i++) {
    const target = document.elementFromPoint(x + dx * i / steps, y + dy * i / steps);
    const bubble = bubbleByElement.get(target);
    if (bubble) pop(bubble, null, previous);
  }
  previous.x = event.clientX;
  previous.y = event.clientY;
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  window.addEventListener(type, event => {
    pointers.delete(event.pointerId);
    if (type === 'pointerup') impactFx.end(event.pointerId, performance.now());
    else impactFx.cancelHold(event.pointerId);
  });
}
window.addEventListener('blur', () => {
  pointers.clear();
  impactFx.cancelHold();
});
field.addEventListener('click', event => {
  if (event.detail === 0) strike(event.target.closest('button'));
});

document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  impactFx.cancelHold();
  mode = button.dataset.mode;
  for (const timer of pendingChain) clearTimeout(timer);
  pendingChain.clear();
  document.querySelectorAll('[data-mode]').forEach(tab => tab.setAttribute('aria-pressed', tab === button));
  core.hidden = document.querySelector('.orbit').hidden = mode !== 'pulse';
  $('bubbles').hidden = mode !== 'bubbles';
  $('keys').hidden = mode !== 'keys';
  $('mode-name').textContent = modes[mode][0];
  $('hint').textContent = modes[mode][1];
  messageUntil = 0;
}));

function fillSelect(select, items, owned, selection) {
  select.replaceChildren(...items.map(([name], index) => {
    const available = owned.includes(index);
    const option = new Option(available ? name : name + ' · bloqueado', index);
    option.disabled = !available;
    option.selected = index === selection;
    return option;
  }));
}

function renderPanel() {
  fillSelect($('theme'), themes, state.themes, state.theme);
  fillSelect($('sound'), sounds, state.sounds, state.sound);
  $('atmosphere').value = state.atmosphere;
  $('record').textContent = 'Maior sequência · ' + number.format(state.best);
  $('reset').textContent = 'Resetar progresso';
}

$('settings').addEventListener('click', () => {
  renderPanel();
  panel.showModal();
});
for (const setting of ['theme', 'sound', 'atmosphere']) {
  $(setting).addEventListener('change', event => {
    state[setting] = Number(event.target.value);
    applyStyle();
    save();
    if (setting === 'sound' || setting === 'atmosphere') audio.play(state.sound, 1, false, mode);
  });
}
$('mute').addEventListener('click', () => {
  audio.unlock();
  state.muted = !state.muted;
  applyStyle();
  save();
});
$('reset-form').addEventListener('submit', event => {
  event.preventDefault();
  if ($('reset').textContent === 'Resetar progresso') {
    $('reset').textContent = 'Confirmar reset';
    return;
  }
  state = { ...fresh(), muted: state.muted };
  impactFx.reset();
  shop.use(state.shop);
  session.reset();
  collectibles.use(state.echoes);
  quick.use(state.loadouts);
  frenzy.reset();
  worldMap.use(state.worldMap);
  clearTimeout(noticeTimer);
  $('streak-notice').hidden = true;
  retention.reset(state);
  chargeHold = 0;
  combo = energy = feverEnd = messageUntil = 0;
  last = -Infinity;
  for (const timer of pendingChain) clearTimeout(timer);
  pendingChain.clear();
  bonus.hidden = true;
  $('hint').textContent = modes[mode][1];
  applyStyle();
  meter();
  save();
  renderPanel();
});

const install = $('install');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  install.hidden = false;
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  install.hidden = true;
});
install.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = undefined;
  install.hidden = true;
  try {
    await prompt.prompt();
  } catch {
    // The browser controls whether its installation prompt can open.
  }
});

window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else retention.day();
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .catch(error => console.warn('Prisma: serviço offline indisponível.', error));
}

let frameTime = performance.now();
function frame(now) {
  const elapsed = Math.min(100, now - frameTime);
  const baseDt = Math.min(.033, elapsed / 1000);
  frameTime = now;
  const fever = now < feverEnd;
  const dt = impactFx.motion(now, fever, baseDt);
  const nova = now < impactFx.novaEnd;
  const cooled = Math.max(0, combo - Math.floor(Math.max(0, now - last - 470) / 140));
  retention.frame(now);
  frenzy.frame(now);
  session.frame(now, elapsed / 1000);
  if (!fever && !nova && now >= chargeHold && now - last > 390) energy = Math.max(0, energy - dt * 13);
  const multiplier = '×' + Math.min(10, 1 + Math.floor(cooled / 4));
  if ($('combo').textContent !== multiplier) $('combo').textContent = multiplier;
  const feverLabel = nova ? 'SUPERNOVA · ' + Math.ceil((impactFx.novaEnd - now) / 1000) + ' s'
    : fever ? 'SOBRECARGA · ' + Math.floor(impactFx.novaCharge * 100 / 36) + '%' : 'FEVER';
  if ($('fever-label').textContent !== feverLabel) $('fever-label').textContent = feverLabel;
  const displayedCharge = nova ? (impactFx.novaEnd - now) * 100 / impactFx.novaDuration : fever ? impactFx.novaCharge * 100 / 36 : energy;
  if ($('fever').value !== displayedCharge) $('fever').value = displayedCharge;
  root.classList.toggle('fever', fever);
  if (fever && !reducedMotion.matches) field.style.setProperty('--hue', (now / 6 % 360) + 'deg');
  if (messageUntil && now >= messageUntil) {
    $('hint').textContent = modes[mode][1];
    messageUntil = 0;
  }
  if (spring || velocity) {
    velocity += (-spring * 235 - velocity * 15) * dt;
    spring += velocity * dt;
    if (Math.abs(spring) < .001 && Math.abs(velocity) < .015) spring = velocity = 0;
    core.style.setProperty('--pulse', reducedMotion.matches ? 0 : spring);
  }
  if (impact) {
    impact = Math.max(0, impact - dt * 21);
    field.style.transform = impact && !reducedMotion.matches
      ? 'translate(' + Math.sin(now / 8) * impact + 'px,' + Math.cos(now / 7) * impact + 'px)' : '';
  }
  if (dt > 0) {
    if (mode === 'bubbles') drawBubbles(now);
    effects.draw(dt, impactFx.hold?.engaged ? impactFx.hold.ratio + .2 : 0, session.active(now));
  }
  requestAnimationFrame(frame);
}

let noticeTimer;
function notice(text) {
  const banner = $('streak-notice');
  banner.textContent = text;
  banner.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { banner.hidden = true; }, 2400);
}

const collectibles = new Collectibles($('echo-list'), name => {
  notice('✦ Eco raro · ' + name);
  audio.celebrate(2);
  vibrate([11, 25, 14]);
  save();
});
collectibles.use(state.echoes);
const session = new SessionEvents(field, $('mirror-status'), {
  emit: (...args) => effects.emit(...args),
  mirror() {
    audio.horizon(2);
    burst('ESPELHO!', 32);
  },
  double(isSwitch) { audio.echo(isSwitch ? 4 : 2); },
  collect: id => collectibles.unlock(id),
  reduced: () => reducedMotion.matches,
});
let quick;
const shop = new Shop(state.shop, {
  onEarn: amount => session.earned(amount),
  apply(skin, tuning) {
    field.dataset.skin = skin.id;
    effects.shape = skin.shape;
    effects.density = tuning.particleRate;
    effects.wave = tuning.wave;
    quick?.renderIfOpen();
  },
  persist: save,
  feedback() {
    audio.unlock();
    audio.reward();
    vibrate([12, 24, 16]);
    const confetti = $('shop-confetti');
    confetti.getAnimations().forEach(animation => animation.cancel());
    confetti.animate([
      { opacity: 1, transform: 'translateX(-50%) scale(.35)' },
      { opacity: .85, transform: 'translateX(-50%) scale(1.1)', offset: .35 },
      { opacity: 0, transform: 'translateX(-50%) scale(2.35)' },
    ], { duration: reducedMotion.matches ? 160 : 620 });
  },
});

quick = new QuickPanel({
  read: () => ({ theme: state.theme, skin: state.shop.equipped, sound: state.sound, atmosphere: state.atmosphere }),
  equip(slot) {
    if (!state.themes.includes(slot.theme) || !state.sounds.includes(slot.sound) || !shop.equip(slot.skin)) return false;
    state.theme = slot.theme;
    state.sound = slot.sound;
    state.atmosphere = slot.atmosphere;
    applyStyle();
    audio.play(state.sound, 1, false, mode);
    save();
    return true;
  },
  save,
  describe: slot => themes[slot.theme][0] + ' · ' + shop.skinName(slot.skin) + ' · ' + sounds[slot.sound][0] + ' · ' + ['Pentatônica Clássica', 'Lídia Sonhadora', 'Menor Cósmica', 'Arcade Retrô'][slot.atmosphere],
});
quick.use(state.loadouts);

const impactFx = new Impact(field, audio, effects, () => reducedMotion.matches, {
  start(now) {
    shop.earn('nova');
    if (now < frenzy.end) collectibles.unlock('overlap');
    if (mode === 'pulse') worldMap.record('pulseNova');
    if (mode === 'keys') worldMap.record('switchNova');
    if (mode === 'pulse') retention.trophies.update({ nova: 1 });
    burst('SUPERNOVA!', 82);
    vibrate([16, 30, 28], now);
    save();
  },
  detonate() {
    burst('SUPERNOVA!', 150);
    audio.supernova();
    vibrate([20, 25, 35]);
    impact = 8;
  },
  gravity(ratio, now) {
    const bonus = Math.round(ratio * 12);
    combo = Math.max(0, combo - Math.floor(Math.max(0, now - last - 470) / 140)) + bonus;
    last = now;
    state.best = Math.max(state.best, combo);
    session.best('combo', combo);
    retention.trophies.update({ rhythm: combo, pulse50: combo, pulse100: combo, gravity: Number(ratio >= 1) });
    burst(bonus ? '+' + bonus + ' COMBO' : 'GRAVIDADE', Math.round(24 + ratio * 85), core);
    velocity = 10 + ratio * 12;
    impact = Math.max(impact, 2 + ratio * 5);
    charge(6 + ratio * 17, now);
    worldMap.refresh();
    audio.critical();
    vibrate([12, 25, 12 + Math.round(ratio * 14)], now);
    save();
  },
});
const retention = new Retention(state, {
  audio, vibrate, burst, notice, point: localPoint, cosmetic: unlockCosmetic, grant, save,
  reduced: () => reducedMotion.matches,
  fragments: (event, value) => shop.earn(event, value),
  crystalBreak(now) {
    const cooled = Math.max(0, combo - Math.floor(Math.max(0, now - last - 470) / 140));
    if (cooled >= 20) collectibles.unlock('crystal');
  },
  tuning: () => shop.effects,
  hit: (now, release) => impactFx.hit(now, () => {
    release();
    impact = Math.max(impact, 5);
  }),
  horizon(depth, text) {
    burst(text, 33);
    audio.horizon(depth);
    if (!reducedMotion.matches) {
      $('effects').animate([{ transform: 'translateX(-3px)', filter: 'hue-rotate(80deg)' },
        { transform: 'translateX(2px)', filter: 'hue-rotate(-40deg)' }, { transform: 'none', filter: 'none' }], 190);
    }
  },
});
const worldMap = new WorldMap(state.worldMap, key => {
  const { retention } = state;
  if (key === 'bubbles' || key === 'keys') return retention.tapsByMode[key];
  if (['taps', 'best', 'level'].includes(key)) return state[key];
  if (key === 'crystals' || key === 'challenges') return retention[key];
  if (key === 'bubbleChain') return retention.progress.chain;
  if (key === 'pulseCombo') return retention.progress.pulse50;
  return retention.progress[key] ?? 0;
}, {
  reward(fragments, gained, stars) {
    shop.earn('map', fragments);
    burst(gained ? '+' + fragments + ' ◈' : '★ MAESTRIA', gained ? 36 : 24);
    audio.reward(gained > 1 || stars > 1);
    vibrate([12, 25, 16]);
  },
  save,
});
const frenzy = new Frenzy($('frenzy-status'), field, now => {
  worldMap.record('frenzy');
  burst('SOBRECARGA!', 70);
  audio.supernova();
  vibrate([14, 24, 21], now);
});
worldMap.refresh();
bonus.hidden = state.untilBonus > 0;
applyStyle();
meter();
requestAnimationFrame(frame);
