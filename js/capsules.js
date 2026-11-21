export class Capsules {
  constructor(field, capture) {
    this.capture = capture;
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'capsule';
    this.button.setAttribute('aria-label', 'Capturar cápsula relâmpago');
    this.button.textContent = '✦';
    this.button.hidden = true;
    field.append(this.button);
    this.button.addEventListener('pointerdown', event => event.stopPropagation());
    this.button.addEventListener('click', event => {
      event.stopPropagation();
      if (this.button.hidden || performance.now() >= this.end) return;
      this.button.hidden = true;
      this.capture(performance.now());
    });
    this.reset();
  }

  reset() {
    this.remaining = 20000 + Math.random() * 20000;
    this.end = 0;
    this.button.hidden = true;
  }

  frame(now, elapsed, active) {
    if (this.end && now >= this.end) {
      this.end = 0;
      this.button.hidden = true;
    }
    if (this.end) return;
    if (active) this.remaining -= elapsed;
    if (this.remaining > 0) return;
    this.end = now + 6000;
    this.remaining = 20000 + Math.random() * 20000;
    this.button.hidden = false;
  }
}
