import * as THREE from 'three';
import { CameraController } from '../camera/CameraController';
import { SceneLighting } from '../environment/SceneLighting';
import { SelectionManager } from '../interaction/SelectionManager';
import { SimulationClock } from '../simulation/SimulationClock';
import { InfoPanel } from '../ui/InfoPanel';
import { CityWorld } from '../world/CityWorld';
import { createRenderer } from '../rendering/createRenderer';
import { RENDERING } from '../config/constants';

export class CitySimulationApp {
  private readonly shell: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly cameraController: CameraController;
  private readonly clock = new SimulationClock();
  private readonly infoPanel: InfoPanel;
  private readonly world: CityWorld;
  private readonly selection: SelectionManager;
  private animationFrame = 0;

  constructor(root: HTMLDivElement) {
    this.shell = document.createElement('div');
    this.shell.className = 'city-app';
    root.append(this.shell);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'city-canvas';
    this.shell.append(this.canvas);

    this.renderer = createRenderer(this.canvas);
    this.camera = new THREE.PerspectiveCamera(
      RENDERING.cameraFov,
      this.shell.clientWidth / this.shell.clientHeight,
      RENDERING.cameraNear,
      RENDERING.cameraFar,
    );

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    new SceneLighting(this.scene);

    this.world = new CityWorld();
    this.scene.add(this.world.object);
    this.infoPanel = new InfoPanel(this.shell, {
      onTrafficModeChange: (mode) => {
        this.world.trafficSimulation.trafficLights.setMode(mode);
        this.refreshPanels();
      },
      onTrafficPhaseChange: (phase) => {
        this.world.trafficSimulation.trafficLights.setManualPhase(phase);
        this.refreshPanels();
      },
      onPauseToggle: () => {
        this.clock.togglePaused();
        this.refreshPanels();
      },
      onSpeedChange: (speed) => {
        this.clock.setSpeed(speed);
        this.refreshPanels();
      },
      onDebugToggle: () => {
        const debug = this.world.trafficSimulation.debugView;
        debug.setEnabled(!debug.isEnabled());
        this.refreshPanels();
      },
    });

    this.selection = new SelectionManager({
      camera: this.camera,
      scene: this.scene,
      domElement: this.renderer.domElement,
      onSelectionChanged: (info) => this.infoPanel.setSelection(info, this.getTrafficDetails(info)),
    });

    this.setupOverlay();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  start(): void {
    this.clock.reset();
    this.renderer.setAnimationLoop(this.tick);
  }

  private readonly tick = (): void => {
    const deltaSeconds = this.clock.tick();
    this.world.update(deltaSeconds);
    this.cameraController.update(deltaSeconds);
    this.selection.update();
    this.refreshPanels();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame += 1;
  };

  private readonly handleResize = (): void => {
    const width = this.shell.clientWidth;
    const height = this.shell.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private setupOverlay(): void {
    const topBar = document.createElement('div');
    topBar.className = 'top-bar';
    topBar.innerHTML = `
      <div class="brand-mark"></div>
      <div class="title">
        <strong>City Simulation</strong>
        <span>Step 2: traffic simulation foundation</span>
      </div>
    `;

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Orbit, pan, and zoom with the mouse. Select buildings, vehicles, or the main intersection.';

    this.shell.append(topBar, hint);
  }

  private refreshPanels(): void {
    const selected = this.selection.getSelectedInfo();
    this.infoPanel.setSelection(selected, this.getTrafficDetails(selected));
    this.infoPanel.setSimulationState({
      paused: this.clock.isPaused(),
      speed: this.clock.getSpeed(),
      debugEnabled: this.world.trafficSimulation.debugView.isEnabled(),
    });
  }

  private getTrafficDetails(info: { type: string } | null): Record<string, string | number> {
    if (info?.type !== 'intersection') return {};
    return this.world.trafficSimulation.trafficLights.getSnapshot();
  }
}
