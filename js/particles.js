const LIMIT = 420;

export class Effects {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dots = Array.from({ length: LIMIT }, () => ({ life: 0 }));
    this.rings = [];
    this.labels = [];
    this.cursor = 0;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = width;
    this.height = height;
  }

  emit(x, y, color, amount, label, rainbow = false, fontSize = 18) {
    const count = Math.min(160, Math.round(amount * (this.density ?? 1)));
    for (let i = 0; i < count; i++) {
      const dot = this.dots[this.cursor++ % LIMIT];
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 205;
      dot.x = x;
      dot.y = y;
      dot.vx = Math.cos(angle) * speed;
      dot.vy = Math.sin(angle) * speed;
      dot.color = rainbow ? 'hsl(' + Math.round(Math.random() * 360) + ' 95% 72%)' : color;
      dot.size = 1 + Math.random() * 3;
      dot.shape = this.shape ?? 0;
      dot.life = dot.duration = .24 + Math.random() * .54;
    }
    if (this.rings.length >= 28) this.rings.shift();
    this.rings.push({ x, y, color, age: 0, reach: this.wave ?? 1 });
    if (label) {
      if (this.labels.length >= 18) this.labels.shift();
      this.labels.push({ x: Math.max(35, Math.min(this.width - 35, x)), y: Math.max(35, y), color, label, fontSize, age: 0 });
    }
  }

  draw(dt, gravity = 0) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    const drag = Math.exp(-2.7 * dt);
    for (const dot of this.dots) {
      if (dot.life <= 0) continue;
      dot.life -= dt;
      dot.x += dot.vx * dt;
      dot.y += dot.vy * dt;
      dot.vx *= drag;
      dot.vy = dot.vy * drag + 125 * dt;
      if (gravity) {
        const pull = gravity * dt * 22;
        dot.vx += (this.width / 2 - dot.x) * pull;
        dot.vy += (this.height / 2 - dot.y) * pull;
      }
      ctx.globalAlpha = Math.max(0, dot.life / dot.duration) ** 1.5;
      ctx.fillStyle = dot.color;
      if (dot.shape === 0 || dot.shape === 3) {
        ctx.fillRect(dot.x, dot.y, dot.size * (dot.shape === 3 ? 2.5 : 1), dot.size);
      } else {
        ctx.beginPath();
        if (dot.shape === 1) ctx.arc(dot.x, dot.y, dot.size * .62, 0, Math.PI * 2);
        else {
          ctx.moveTo(dot.x, dot.y - dot.size);
          ctx.lineTo(dot.x + dot.size, dot.y + dot.size * .75);
          ctx.lineTo(dot.x - dot.size, dot.y + dot.size * .75);
          ctx.closePath();
        }
        ctx.fill();
      }
    }
    this.rings = this.rings.filter(ring => (ring.age += dt) < .48);
    for (const ring of this.rings) {
      ctx.globalAlpha = (1 - ring.age / .48) * .72;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 10 + ring.age * 240 * ring.reach, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.labels = this.labels.filter(label => (label.age += dt) < .82);
    ctx.textAlign = 'center';
    for (const label of this.labels) {
      ctx.globalAlpha = 1 - (label.age / .82) ** 2;
      ctx.fillStyle = label.color;
      ctx.font = '800 ' + label.fontSize + 'px system-ui';
      ctx.fillText(label.label, label.x, label.y - 9 - label.age * 54);
    }
    ctx.globalAlpha = 1;
  }
}
