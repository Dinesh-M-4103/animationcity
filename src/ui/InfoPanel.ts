import type { SelectableInfo } from '../types/Selectable';
import type { TrafficControllerMode, TrafficPhase } from '../types/Traffic';
import type { TrafficDensityLevel, TrafficMetrics } from '../simulation/vehicles/VehicleSpawner';

export interface InfoPanelOptions {
  onTrafficModeChange: (mode: TrafficControllerMode) => void;
  onTrafficPhaseChange: (phase: TrafficPhase) => void;
  onPauseToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onDebugToggle: () => void;
  onDensityChange: (density: TrafficDensityLevel) => void;
}

export interface SimulationUiState {
  paused: boolean;
  speed: number;
  density: TrafficDensityLevel;
  debugEnabled: boolean;
}

export class InfoPanel {
  private readonly infoPanel: HTMLDivElement;
  private readonly simulationPanel: HTMLDivElement;

  // Cached DOM elements for Info Panel
  private readonly titleEl: HTMLHeadingElement;
  private readonly dlEl: HTMLDListElement;
  private readonly trafficControlEl: HTMLDivElement;
  private readonly nsSignalDots: Record<'RED' | 'YELLOW' | 'GREEN', HTMLElement>;
  private readonly ewSignalDots: Record<'RED' | 'YELLOW' | 'GREEN', HTMLElement>;
  private readonly modeButtons: Record<TrafficControllerMode, HTMLButtonElement>;
  private readonly phaseButtons: Record<TrafficPhase, HTMLButtonElement>;

  // Cached DOM elements for Simulation Panel
  private readonly pauseBtn: HTMLButtonElement;
  private readonly debugBtn: HTMLButtonElement;
  private readonly speedButtons = new Map<number, HTMLButtonElement>();
  private readonly densityButtons = new Map<TrafficDensityLevel, HTMLButtonElement>();
  private readonly metricActiveEl: HTMLElement;
  private readonly metricWaitingEl: HTMLElement;
  private readonly metricSpeedEl: HTMLElement;
  private readonly metricCompletedEl: HTMLElement;

  private currentSelection: SelectableInfo | null = null;
  private currentMode: TrafficControllerMode = 'AUTO';
  private currentPhase: TrafficPhase = 'NS_GREEN';

  constructor(parent: HTMLElement, private readonly options: InfoPanelOptions) {
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'info-panel';

    this.simulationPanel = document.createElement('div');
    this.simulationPanel.className = 'simulation-panel';

    parent.append(this.infoPanel, this.simulationPanel);

    // ==========================================
    // 1. Build Info Panel Structure (ONCE)
    // ==========================================
    this.titleEl = document.createElement('h2');
    this.titleEl.textContent = 'City Block';
    this.infoPanel.appendChild(this.titleEl);

    this.dlEl = document.createElement('dl');
    this.infoPanel.appendChild(this.dlEl);

    // Traffic Control Section
    this.trafficControlEl = document.createElement('div');
    this.trafficControlEl.className = 'control-section';
    this.trafficControlEl.style.display = 'none';

    const trafficHeader = document.createElement('h3');
    trafficHeader.textContent = 'Traffic Control';
    this.trafficControlEl.appendChild(trafficHeader);

    const signalGrid = document.createElement('div');
    signalGrid.className = 'signal-grid';

    // NS and EW dot containers
    const { container: nsContainer, dots: nsDots } = this.createSignalAxisElement('NORTH / SOUTH');
    const { container: ewContainer, dots: ewDots } = this.createSignalAxisElement('EAST / WEST');
    this.nsSignalDots = nsDots;
    this.ewSignalDots = ewDots;
    signalGrid.append(nsContainer, ewContainer);
    this.trafficControlEl.appendChild(signalGrid);

    // Mode buttons
    const modeRow = document.createElement('div');
    modeRow.className = 'button-row';
    const autoBtn = document.createElement('button');
    autoBtn.textContent = 'AUTO';
    autoBtn.className = 'active';
    autoBtn.dataset.trafficMode = 'AUTO';
    const manualBtn = document.createElement('button');
    manualBtn.textContent = 'MANUAL';
    manualBtn.dataset.trafficMode = 'MANUAL';
    modeRow.append(autoBtn, manualBtn);
    this.trafficControlEl.appendChild(modeRow);
    this.modeButtons = { AUTO: autoBtn, MANUAL: manualBtn };

    // Phase buttons
    const phaseGrid = document.createElement('div');
    phaseGrid.className = 'button-grid';
    const phases: TrafficPhase[] = ['NS_GREEN', 'NS_YELLOW', 'EW_GREEN', 'EW_YELLOW'];
    const phaseBtns = {} as Record<TrafficPhase, HTMLButtonElement>;
    for (const p of phases) {
      const btn = document.createElement('button');
      btn.textContent = p.replace('_', ' ');
      btn.dataset.trafficPhase = p;
      phaseGrid.appendChild(btn);
      phaseBtns[p] = btn;
    }
    this.phaseButtons = phaseBtns;
    this.trafficControlEl.appendChild(phaseGrid);
    this.infoPanel.appendChild(this.trafficControlEl);

    // ==========================================
    // 2. Build Simulation Panel Structure (ONCE)
    // ==========================================
    const simTitle = document.createElement('h2');
    simTitle.textContent = 'Simulation';
    this.simulationPanel.appendChild(simTitle);

    const mainActionsRow = document.createElement('div');
    mainActionsRow.className = 'button-row';
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.textContent = 'PAUSE';
    this.pauseBtn.dataset.simAction = 'toggle-pause';
    this.debugBtn = document.createElement('button');
    this.debugBtn.textContent = 'DEBUG OFF';
    this.debugBtn.dataset.simAction = 'debug';
    mainActionsRow.append(this.pauseBtn, this.debugBtn);
    this.simulationPanel.appendChild(mainActionsRow);

    // Speed controls
    const speedLabel = document.createElement('div');
    speedLabel.className = 'speed-label';
    speedLabel.textContent = 'Simulation Speed';
    this.simulationPanel.appendChild(speedLabel);

    const speedRow = document.createElement('div');
    speedRow.className = 'speed-row';
    for (const spd of [0.5, 1, 2, 5]) {
      const btn = document.createElement('button');
      btn.textContent = `${spd}x`;
      btn.dataset.simSpeed = String(spd);
      if (spd === 1) btn.className = 'active';
      speedRow.appendChild(btn);
      this.speedButtons.set(spd, btn);
    }
    this.simulationPanel.appendChild(speedRow);

    // Density controls
    const densityLabel = document.createElement('div');
    densityLabel.className = 'density-label';
    densityLabel.textContent = 'Traffic Density';
    this.simulationPanel.appendChild(densityLabel);

    const densityRow = document.createElement('div');
    densityRow.className = 'density-row';
    for (const d of ['LOW', 'MEDIUM', 'HIGH'] as TrafficDensityLevel[]) {
      const btn = document.createElement('button');
      btn.textContent = d;
      btn.dataset.simDensity = d;
      if (d === 'MEDIUM') btn.className = 'active';
      densityRow.appendChild(btn);
      this.densityButtons.set(d, btn);
    }
    this.simulationPanel.appendChild(densityRow);

    // Metrics HUD
    const metricsGrid = document.createElement('div');
    metricsGrid.className = 'metrics-grid';

    const { item: mActiveItem, valueEl: mActiveVal } = this.createMetricElement('Active Vehicles');
    const { item: mWaitItem, valueEl: mWaitVal } = this.createMetricElement('Vehicles Waiting');
    const { item: mSpeedItem, valueEl: mSpeedVal } = this.createMetricElement('Average Speed');
    const { item: mCompItem, valueEl: mCompVal } = this.createMetricElement('Completed Trips');

    this.metricActiveEl = mActiveVal;
    this.metricWaitingEl = mWaitVal;
    this.metricSpeedEl = mSpeedVal;
    this.metricCompletedEl = mCompVal;

    metricsGrid.append(mActiveItem, mWaitItem, mSpeedItem, mCompItem);
    this.simulationPanel.appendChild(metricsGrid);

    // Event listeners
    this.infoPanel.addEventListener('click', this.handlePanelClick);
    this.simulationPanel.addEventListener('click', this.handleSimulationClick);

    this.renderDefaultDl();
  }

  setSelection(info: SelectableInfo | null): void {
    this.currentSelection = info;

    if (!info) {
      this.titleEl.textContent = 'City Block';
      this.renderDefaultDl();
      this.trafficControlEl.style.display = 'none';
      return;
    }

    this.titleEl.textContent = info.title;
    this.updateDlContent(info.details);

    if (info.type === 'intersection') {
      this.trafficControlEl.style.display = 'block';
    } else {
      this.trafficControlEl.style.display = 'none';
    }
  }

  updateTelemetry(
    metrics: TrafficMetrics,
    trafficSnapshot: Record<string, string | number>,
    selectedInfo: SelectableInfo | null,
  ): void {
    // 1. Update Metrics HUD
    this.metricActiveEl.textContent = String(metrics.activeVehicles);
    this.metricWaitingEl.textContent = String(metrics.waitingVehicles);
    this.metricSpeedEl.textContent = `${metrics.averageSpeedKmH} km/h`;
    this.metricCompletedEl.textContent = String(metrics.completedTrips);

    // 2. If selected item is a vehicle or intersection, update live detail values
    if (this.currentSelection) {
      if (this.currentSelection.type === 'vehicle' && selectedInfo?.id === this.currentSelection.id) {
        this.updateDlContent(selectedInfo.details);
      } else if (this.currentSelection.type === 'intersection') {
        const intersectionDetails = {
          ...this.currentSelection.details,
          Traffic: metrics.activeVehicles,
          Waiting: metrics.waitingVehicles,
          Mode: trafficSnapshot.Mode,
          Phase: trafficSnapshot.Phase,
        };
        this.updateDlContent(intersectionDetails);
      }
    }

    // 3. Update Traffic Light Signal Dots and Button States
    const nsState = String(trafficSnapshot['North / South'] ?? 'RED');
    const ewState = String(trafficSnapshot['East / West'] ?? 'RED');
    this.updateAxisDots(this.nsSignalDots, nsState);
    this.updateAxisDots(this.ewSignalDots, ewState);

    const mode = (trafficSnapshot.Mode as TrafficControllerMode) ?? 'AUTO';
    const phase = ((trafficSnapshot.Phase as string) ?? 'NS / GREEN').replace(' / ', '_') as TrafficPhase;
    this.currentMode = mode;
    this.currentPhase = phase;

    this.modeButtons.AUTO.classList.toggle('active', mode === 'AUTO');
    this.modeButtons.MANUAL.classList.toggle('active', mode === 'MANUAL');

    for (const [p, btn] of Object.entries(this.phaseButtons)) {
      btn.classList.toggle('active', mode === 'MANUAL' && phase === p);
    }
  }

  setSimulationState(state: SimulationUiState): void {
    this.pauseBtn.textContent = state.paused ? 'PLAY' : 'PAUSE';
    this.debugBtn.textContent = `DEBUG ${state.debugEnabled ? 'ON' : 'OFF'}`;
    this.debugBtn.classList.toggle('active', state.debugEnabled);

    for (const [spd, btn] of this.speedButtons) {
      btn.classList.toggle('active', spd === state.speed);
    }

    for (const [den, btn] of this.densityButtons) {
      btn.classList.toggle('active', den === state.density);
    }
  }

  private renderDefaultDl(): void {
    this.dlEl.innerHTML = `
      <dt>Status</dt><dd>Ready</dd>
      <dt>Selection</dt><dd>None</dd>
      <dt>Simulation</dt><dd>Traffic, lights, spline routing</dd>
    `;
  }

  private updateDlContent(details: Record<string, string | number>): void {
    const rows = Object.entries(details)
      .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
      .join('');
    this.dlEl.innerHTML = rows;
  }

  private createSignalAxisElement(label: string): {
    container: HTMLElement;
    dots: Record<'RED' | 'YELLOW' | 'GREEN', HTMLElement>;
  } {
    const container = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = label;
    container.appendChild(title);

    const dots: Record<string, HTMLElement> = {};
    for (const state of ['RED', 'YELLOW', 'GREEN'] as const) {
      const span = document.createElement('span');
      const dot = document.createElement('b');
      dot.className = `dot ${state.toLowerCase()}`;
      span.append(dot, document.createTextNode(state));
      container.appendChild(span);
      dots[state] = dot;
    }

    return {
      container,
      dots: dots as Record<'RED' | 'YELLOW' | 'GREEN', HTMLElement>,
    };
  }

  private updateAxisDots(dots: Record<'RED' | 'YELLOW' | 'GREEN', HTMLElement>, activeState: string): void {
    dots.RED.classList.toggle('on', activeState === 'RED');
    dots.YELLOW.classList.toggle('on', activeState === 'YELLOW');
    dots.GREEN.classList.toggle('on', activeState === 'GREEN');
  }

  private createMetricElement(label: string): { item: HTMLElement; valueEl: HTMLElement } {
    const item = document.createElement('div');
    item.className = 'metric-item';

    const span = document.createElement('span');
    span.textContent = label;

    const valueEl = document.createElement('strong');
    valueEl.textContent = '0';

    item.append(span, valueEl);
    return { item, valueEl };
  }

  private readonly handlePanelClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest('button');
    if (!target) return;

    const mode = target.dataset.trafficMode as TrafficControllerMode | undefined;
    const phase = target.dataset.trafficPhase as TrafficPhase | undefined;
    if (mode) this.options.onTrafficModeChange(mode);
    if (phase) this.options.onTrafficPhaseChange(phase);
  };

  private readonly handleSimulationClick = (event: MouseEvent): void => {
    const target = (event.target as HTMLElement).closest('button');
    if (!target) return;

    const action = target.dataset.simAction;
    const speed = target.dataset.simSpeed;
    const density = target.dataset.simDensity as TrafficDensityLevel | undefined;

    if (action === 'toggle-pause') this.options.onPauseToggle();
    if (action === 'debug') this.options.onDebugToggle();
    if (speed) this.options.onSpeedChange(Number(speed));
    if (density) this.options.onDensityChange(density);
  };
}
