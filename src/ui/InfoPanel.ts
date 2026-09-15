import type { SelectableInfo } from '../types/Selectable';
import type { TrafficControllerMode, TrafficPhase } from '../types/Traffic';

interface InfoPanelOptions {
  onTrafficModeChange: (mode: TrafficControllerMode) => void;
  onTrafficPhaseChange: (phase: TrafficPhase) => void;
  onPauseToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onDebugToggle: () => void;
}

interface SimulationUiState {
  paused: boolean;
  speed: number;
  debugEnabled: boolean;
}

export class InfoPanel {
  private readonly panel: HTMLDivElement;
  private readonly simulationPanel: HTMLDivElement;
  private selection: SelectableInfo | null = null;
  private trafficDetails: Record<string, string | number> = {};
  private simulationState: SimulationUiState = { paused: false, speed: 1, debugEnabled: false };

  constructor(parent: HTMLElement, private readonly options: InfoPanelOptions) {
    this.panel = document.createElement('div');
    this.panel.className = 'info-panel';
    this.simulationPanel = document.createElement('div');
    this.simulationPanel.className = 'simulation-panel';
    parent.append(this.panel, this.simulationPanel);
    this.panel.addEventListener('click', this.handlePanelClick);
    this.simulationPanel.addEventListener('click', this.handleSimulationClick);
    this.setSelection(null);
    this.renderSimulationPanel();
  }

  setSelection(info: SelectableInfo | null, trafficDetails: Record<string, string | number> = {}): void {
    this.selection = info;
    this.trafficDetails = trafficDetails;
    this.renderSelection();
  }

  setSimulationState(state: SimulationUiState): void {
    this.simulationState = state;
    this.renderSimulationPanel();
  }

  private renderSelection(): void {
    if (!this.selection) {
      this.panel.innerHTML = `
        <h2>City Block</h2>
        <dl>
          <dt>Status</dt><dd>Ready</dd>
          <dt>Selection</dt><dd>None</dd>
          <dt>Systems</dt><dd>Roads, lights, vehicles, camera</dd>
        </dl>
      `;
      return;
    }

    const details = this.selection.type === 'intersection'
      ? { ...this.selection.details, ...this.trafficDetails }
      : this.selection.details;

    const detailRows = Object.entries(details)
      .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
      .join('');

    const trafficControls = this.selection.type === 'intersection' ? this.renderTrafficControls() : '';

    this.panel.innerHTML = `
      <h2>${this.selection.title}</h2>
      <dl>
        <dt>ID</dt><dd>${this.selection.id}</dd>
        <dt>Type</dt><dd>${this.selection.type}</dd>
        ${detailRows}
      </dl>
      ${trafficControls}
    `;
  }

  private renderTrafficControls(): string {
    const mode = String(this.trafficDetails.Mode ?? 'AUTO');
    const phase = String(this.trafficDetails.Phase ?? 'NS / GREEN').replace(' / ', '_');
    return `
      <div class="control-section">
        <h3>Traffic Control</h3>
        <div class="signal-grid">
          ${this.renderAxisState('NORTH / SOUTH', String(this.trafficDetails['North / South'] ?? 'RED'))}
          ${this.renderAxisState('EAST / WEST', String(this.trafficDetails['East / West'] ?? 'RED'))}
        </div>
        <div class="button-row">
          <button data-traffic-mode="AUTO" class="${mode === 'AUTO' ? 'active' : ''}">AUTO</button>
          <button data-traffic-mode="MANUAL" class="${mode === 'MANUAL' ? 'active' : ''}">MANUAL</button>
        </div>
        <div class="button-grid">
          ${(['NS_GREEN', 'NS_YELLOW', 'EW_GREEN', 'EW_YELLOW'] as TrafficPhase[])
            .map((item) => `<button data-traffic-phase="${item}" class="${mode === 'MANUAL' && phase === item ? 'active' : ''}">${item.replace('_', ' ')}</button>`)
            .join('')}
        </div>
      </div>
    `;
  }

  private renderAxisState(label: string, active: string): string {
    return `
      <div>
        <strong>${label}</strong>
        ${(['RED', 'YELLOW', 'GREEN'] as const)
          .map((state) => `<span><b class="dot ${state.toLowerCase()} ${active === state ? 'on' : ''}"></b>${state}</span>`)
          .join('')}
      </div>
    `;
  }

  private renderSimulationPanel(): void {
    this.simulationPanel.innerHTML = `
      <h2>Simulation</h2>
      <div class="button-row">
        <button data-sim-action="toggle-pause">${this.simulationState.paused ? 'PLAY' : 'PAUSE'}</button>
        <button data-sim-action="debug" class="${this.simulationState.debugEnabled ? 'active' : ''}">DEBUG ${this.simulationState.debugEnabled ? 'ON' : 'OFF'}</button>
      </div>
      <div class="speed-row">
        ${[0.5, 1, 2, 5]
          .map((speed) => `<button data-sim-speed="${speed}" class="${this.simulationState.speed === speed ? 'active' : ''}">${speed}x</button>`)
          .join('')}
      </div>
    `;
  }

  private readonly handlePanelClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const mode = target.dataset.trafficMode as TrafficControllerMode | undefined;
    const phase = target.dataset.trafficPhase as TrafficPhase | undefined;
    if (mode) this.options.onTrafficModeChange(mode);
    if (phase) this.options.onTrafficPhaseChange(phase);
  };

  private readonly handleSimulationClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const action = target.dataset.simAction;
    const speed = target.dataset.simSpeed;
    if (action === 'toggle-pause') this.options.onPauseToggle();
    if (action === 'debug') this.options.onDebugToggle();
    if (speed) this.options.onSpeedChange(Number(speed));
  };
}
