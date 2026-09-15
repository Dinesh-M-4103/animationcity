import type { SelectableInfo } from '../types/Selectable';

export class InfoPanel {
  private readonly panel: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'info-panel';
    parent.append(this.panel);
    this.setSelection(null);
  }

  setSelection(info: SelectableInfo | null): void {
    if (!info) {
      this.panel.innerHTML = `
        <h2>City Block</h2>
        <dl>
          <dt>Status</dt><dd>Ready</dd>
          <dt>Selection</dt><dd>None</dd>
          <dt>Systems</dt><dd>Roads, buildings, lighting, camera</dd>
        </dl>
      `;
      return;
    }

    const detailRows = Object.entries(info.details)
      .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
      .join('');

    this.panel.innerHTML = `
      <h2>${info.title}</h2>
      <dl>
        <dt>ID</dt><dd>${info.id}</dd>
        <dt>Type</dt><dd>${info.type}</dd>
        ${detailRows}
      </dl>
    `;
  }
}
