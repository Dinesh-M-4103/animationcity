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
  private telemetryElapsed = 0;

  constructor(root: HTMLDivElement) {
    this.shell = document.createElement('div');
    this.shell.className = 'city-app';
    root.append(this.shell);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'city-canvas';
    this.shell.append(this.canvas);

    this.renderer = createRenderer(this.canvas);
    const initialWidth = Math.max(320, this.shell.clientWidth || window.innerWidth);
    const initialHeight = Math.max(240, this.shell.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(
      RENDERING.cameraFov,
      initialWidth / initialHeight,
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
        this.updateTelemetry();
      },
      onTrafficPhaseChange: (phase) => {
        this.world.trafficSimulation.trafficLights.setManualPhase(phase);
        this.updateTelemetry();
      },
      onPauseToggle: () => {
        this.clock.togglePaused();
        this.updateSimulationUi();
      },
      onSpeedChange: (speed) => {
        this.clock.setSpeed(speed);
        this.updateSimulationUi();
      },
      onDebugToggle: () => {
        const debug = this.world.trafficSimulation.debugView;
        debug.setEnabled(!debug.isEnabled());
        this.updateSimulationUi();
      },
      onDensityChange: (density) => {
        this.world.trafficSimulation.vehicleManager.setDensity(density);
        this.updateSimulationUi();
      },
    });

    this.selection = new SelectionManager({
      camera: this.camera,
      scene: this.scene,
      domElement: this.renderer.domElement,
      onSelectionChanged: (info) => {
        this.infoPanel.setSelection(info);
        this.updateTelemetry();
      },
    });

    this.setupOverlay();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);

    this.updateSimulationUi();
    this.updateTelemetry();
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

    // Throttle telemetry to 10 Hz while keeping 3D render at 60 FPS
    this.telemetryElapsed += deltaSeconds;
    if (this.telemetryElapsed >= 0.1) {
      this.updateTelemetry();
      this.telemetryElapsed = 0;
    }

    this.renderer.render(this.scene, this.camera);
    this.animationFrame += 1;
  };

  private readonly handleResize = (): void => {
    const width = Math.max(320, this.shell.clientWidth || window.innerWidth);
    const height = Math.max(240, this.shell.clientHeight || window.innerHeight);
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

  private updateTelemetry(): void {
    const metrics = this.world.trafficSimulation.vehicleManager.getMetrics();
    const trafficSnapshot = this.world.trafficSimulation.trafficLights.getSnapshot();
    const selectedInfo = this.selection.getSelectedInfo();
    this.infoPanel.updateTelemetry(metrics, trafficSnapshot, selectedInfo);
  }

  private updateSimulationUi(): void {
    this.infoPanel.setSimulationState({
      paused: this.clock.isPaused(),
      speed: this.clock.getSpeed(),
      density: this.world.trafficSimulation.vehicleManager.getDensity(),
      debugEnabled: this.world.trafficSimulation.debugView.isEnabled(),
    });
  }
}
