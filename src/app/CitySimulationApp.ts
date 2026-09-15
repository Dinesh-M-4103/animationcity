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
    this.infoPanel = new InfoPanel(this.shell);
    new SceneLighting(this.scene);

    this.world = new CityWorld();
    this.scene.add(this.world.object);

    this.selection = new SelectionManager({
      camera: this.camera,
      scene: this.scene,
      domElement: this.renderer.domElement,
      onSelectionChanged: (info) => this.infoPanel.setSelection(info),
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
    this.cameraController.update(deltaSeconds);
    this.selection.update();
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
        <span>Step 1: interactive block foundation</span>
      </div>
    `;

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Orbit, pan, and zoom with the mouse. Hover and click buildings or the main intersection.';

    this.shell.append(topBar, hint);
  }
}
