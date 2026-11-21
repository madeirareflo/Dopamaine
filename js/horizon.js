const phrases = ['Quase…', 'A luz está dobrando…', 'Você ouviu isso?', 'A um fio do impossível…', 'Não pare.'];
const factor = Math.log(4);

// Each interval gets four times longer. Digits are composed as strings so rounding cannot produce 100%.
export function horizonAt(taps) {
  if (taps < 30) return { depth: 0, text: String(taps * 3) + '%', fill: taps * .03 };
  let depth = 1 + Math.floor(Math.log(taps / 30) / factor);
  let boundary = 30 * 4 ** (depth - 1);
  if (taps < boundary) {
    depth--;
    boundary /= 4;
  } else if (taps >= boundary * 4) {
    depth++;
    boundary *= 4;
  }
  const step = Math.min(8, Math.floor(9 * (taps - boundary) / (3 * boundary)));
  const integer = depth === 1 ? String(90 + step) : '99';
  const fraction = depth > 1 ? ',' + '9'.repeat(depth - 2) + (step || '') : '';
  return { depth, text: integer + (fraction === ',' ? '' : fraction) + '%', fill: Math.min(.999999999999, 1 - (10 - step) / 10 ** (depth + 1)) };
}

export class Horizon {
  constructor(onCross) {
    this.card = document.querySelector('#horizon');
    this.onCross = onCross;
    this.use(0);
  }

  use(taps) {
    this.previous = horizonAt(taps).depth;
    this.lastTaps = -1;
    this.card.hidden = true;
  }

  update(taps, discovered) {
    this.card.hidden = !discovered;
    if (!discovered || taps === this.lastTaps) return;
    this.lastTaps = taps;
    const { depth, text, fill } = horizonAt(taps);
    this.card.querySelector('output').textContent = text;
    this.card.querySelector('progress').value = fill;
    this.card.querySelector('p').textContent = phrases[Math.max(0, depth - 1) % phrases.length];
    if (depth > this.previous) this.onCross(depth, text);
    this.previous = Math.max(this.previous, depth);
  }
}
