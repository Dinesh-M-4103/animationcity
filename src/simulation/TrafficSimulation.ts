import * as THREE from 'three';
import { roadNetwork, trafficLights } from '../data/cityBlockData';
import { TrafficDebugView } from './debug/TrafficDebugView';
import { RouteManager } from './traffic/RouteManager';
import { TrafficLightController } from './traffic/TrafficLightController';
import { TrafficLightVisuals } from './traffic/TrafficLightVisuals';
import { VehicleManager } from './vehicles/VehicleManager';

export class TrafficSimulation {
  readonly object = new THREE.Group();
  readonly trafficLights = new TrafficLightController();
  readonly routes = new RouteManager(roadNetwork);
  readonly vehicleManager = new VehicleManager(24, this.routes, this.trafficLights);
  readonly debugView = new TrafficDebugView(roadNetwork, this.routes);
  private readonly signalVisuals = new TrafficLightVisuals(trafficLights, this.trafficLights);

  constructor() {
    this.object.name = 'TrafficSimulation';
    this.object.add(this.signalVisuals.object);
    this.object.add(this.vehicleManager.object);
    this.object.add(this.debugView.object);
    this.signalVisuals.update();
  }

  update(deltaSeconds: number): void {
    this.trafficLights.update(deltaSeconds);
    this.signalVisuals.update();
    this.vehicleManager.update(deltaSeconds);
  }
}
