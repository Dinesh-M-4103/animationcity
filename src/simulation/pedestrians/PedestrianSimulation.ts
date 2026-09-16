import * as THREE from 'three';
import type { TrafficLightController } from '../traffic/TrafficLightController';
import { PedestrianManager } from './PedestrianManager';
import { PedestrianSignalVisuals } from './PedestrianSignalVisuals';
import { PedestrianDebugView } from '../debug/PedestrianDebugView';

export class PedestrianSimulation {
  readonly object = new THREE.Group();
  readonly manager: PedestrianManager;
  readonly signalVisuals: PedestrianSignalVisuals;
  readonly debugView: PedestrianDebugView;

  constructor(trafficLights: TrafficLightController) {
    this.object.name = 'PedestrianSimulation';
    this.manager = new PedestrianManager(50, trafficLights);
    this.signalVisuals = new PedestrianSignalVisuals(this.manager.signalController);
    this.debugView = new PedestrianDebugView(this.manager.nav);

    this.object.add(this.signalVisuals.object);
    this.object.add(this.manager.object);
    this.object.add(this.debugView.object);
  }

  update(deltaSeconds: number): void {
    this.manager.update(deltaSeconds);
    this.signalVisuals.update();
  }
}
