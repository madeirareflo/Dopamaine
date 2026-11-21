export function loadoutSave(raw, owned) {
  return Array.from({ length: 3 }, (_, index) => {
    const slot = Array.isArray(raw) ? raw[index] : null;
    return slot && owned.themes.includes(slot.theme) && owned.sounds.includes(slot.sound) &&
      owned.shop.owned.includes(slot.skin) ? { theme: slot.theme, sound: slot.sound, skin: slot.skin } : null;
  });
}

export class QuickPanel {
  constructor({ read, equip, save, describe }) {
    this.read = read;
    this.equip = equip;
    this.save = save;
    this.describe = describe;
    this.button = document.querySelector('#quick');
    this.panel = document.querySelector('#quick-panel');
    this.status = document.querySelector('#quick-feedback');
    this.slots = Array.from(this.panel.querySelectorAll('[data-loadout]'));
    this.button.addEventListener('click', () => this.toggle(this.panel.hidden));
    this.panel.querySelector('#close-quick').addEventListener('click', () => {
      this.toggle(false);
      this.button.focus();
    });
    this.panel.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      this.toggle(false);
      this.button.focus();
    });
    for (const button of this.panel.querySelectorAll('[data-save-slot]')) {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.saveSlot);
        if (this.data[index] && this.awaiting !== index) {
          this.awaiting = index;
          this.status.textContent = 'Toque novamente em Salvar para substituir o slot ' + (index + 1) + '.';
          return;
        }
        this.data[index] = this.read();
        this.awaiting = undefined;
        this.save();
        this.render();
        this.status.textContent = 'Predefinição ' + (index + 1) + ' salva.';
      });
    }
    this.slots.forEach((button, index) => button.addEventListener('click', () => {
      if (!this.data[index] || !this.equip(this.data[index])) return;
      this.awaiting = undefined;
      this.render();
      this.status.textContent = 'Predefinição ' + (index + 1) + ' aplicada.';
    }));
  }

  use(data) {
    this.data = data;
    this.awaiting = undefined;
    this.status.textContent = '';
    this.render();
  }

  toggle(open) {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', open);
    this.awaiting = undefined;
    this.status.textContent = '';
    if (open) this.render();
  }

  renderIfOpen() {
    if (!this.panel.hidden) this.render();
  }

  render() {
    const current = this.read();
    this.slots.forEach((button, index) => {
      const item = this.data[index];
      const title = 'Slot ' + (index + 1);
      button.disabled = !item;
      button.textContent = title;
      const description = item ? this.describe(item) : 'Vazio';
      button.setAttribute('aria-label', title + ' · ' + description);
      button.closest('div').querySelector('small').textContent = description;
      button.setAttribute('aria-pressed', Boolean(item && item.theme === current.theme &&
        item.sound === current.sound && item.skin === current.skin));
    });
  }
}
