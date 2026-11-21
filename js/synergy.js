export class Synergy {
  constructor(celebrate, notice) {
    this.celebrate = celebrate;
    this.notice = notice;
    this.reset();
  }

  reset() {
    this.eclipse = this.fusion = false;
    this.extended = { fever: false, frenzy: false, mirror: false };
    this.ends = { fever: 0, frenzy: 0, mirror: 0 };
  }

  update(now, fever, nova, frenzy, mirror) {
    const eclipse = now < nova && now < mirror;
    const fusion = now < frenzy && (now < fever || now < nova);
    if (eclipse && !this.eclipse) this.celebrate('Eclipse Invertido', now);
    if (fusion && !this.fusion) this.celebrate('Fusão Prismática', now);
    this.eclipse = eclipse;
    this.fusion = fusion;
    for (const [name, end] of Object.entries({ fever, frenzy, mirror })) {
      if (end !== this.ends[name] && (this.ends[name] <= now || end < this.ends[name])) this.extended[name] = false;
      this.ends[name] = end;
    }
  }

  crystal(now, frenzy, mirror) {
    if (now < frenzy || now < mirror) this.celebrate('Estilhaço Raro', now);
  }

  clutch(now, values) {
    let changed = false;
    for (const name of ['fever', 'frenzy', 'mirror']) {
      const end = values[name];
      if (!this.extended[name] && end > now && end - now <= 1500) {
        values[name] += 2500;
        this.extended[name] = true;
        this.ends[name] = values[name];
        changed = true;
      }
    }
    if (changed) this.notice('+2,5s NO LIMITE!');
    return values;
  }
}
