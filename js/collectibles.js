const echoes = [
  ['overlap', 'Sol Duplo', 'Ative Supernova durante a Sobrecarga de 10 s.', 'M12 2v20M2 12h20M5 5l14 14m0-14L5 19'],
  ['crystal', 'Fratura Harmônica', 'Quebre um cristal com combo ×20 ou maior.', 'm12 2 7 5v9l-7 6-7-6V7Zm0 0-3 9 3 11 3-11-3-9'],
  ['mirror', 'Reflexo Vivo', 'Faça 12 ações durante o Modo Espelho.', 'M12 3v18M3 7l6 5-6 5m18-10-6 5 6 5'],
  ['chain', 'Maré Fantasma', 'Estoure 5 bolhas em uma única cadeia.', 'M8 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm8 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  ['switch', 'Chuva de Faíscas', 'Dispare 5 ondas secundárias no Switch na mesma sessão.', 'M5 6h14l2 6v6H3v-6Zm-2 6h18m-12 3h6'],
];
export function echoSave(raw) {
  return echoes.filter(([id]) => Array.isArray(raw) && raw.includes(id)).map(([id]) => id);
}

export class Collectibles {
  constructor(list, notify) {
    this.list = list;
    this.notify = notify;
  }

  use(owned) {
    this.owned = owned;
    this.render();
  }

  unlock(id) {
    if (this.owned.includes(id)) return;
    const item = echoes.find(([key]) => key === id);
    if (!item) return;
    this.owned.push(id);
    this.render();
    this.notify(item[1]);
  }

  render() {
    this.list.replaceChildren(...echoes.map(([id, name, condition, path]) => {
      const row = document.createElement('li');
      row.dataset.earned = this.owned.includes(id);
      row.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg>';
      const text = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = name + (row.dataset.earned === 'true' ? ' · obtido' : '');
      const detail = document.createElement('small');
      detail.textContent = condition;
      text.append(title, detail);
      row.append(text);
      return row;
    }));
  }
}
