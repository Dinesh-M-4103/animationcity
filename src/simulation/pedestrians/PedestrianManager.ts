import * as THREE from 'three';
import type { PedestrianDensityLevel, PedestrianMetrics } from '../../types/Pedestrian';
import type { TrafficLightController } from '../traffic/TrafficLightController';
import { PedestrianNavigation } from './PedestrianNavigation';
import { PedestrianSignalController } from './PedestrianSignalController';
import { PedestrianSpawner } from './PedestrianSpawner';
import type { Pedestrian } from './Pedestrian';

export class PedestrianManager {
  readonly object = new THREE.Group();
  readonly nav: PedestrianNavigation;
  readonly signalController: PedestrianSignalController;
  private readonly spawner: PedestrianSpawner;

  constructor(
    poolSize = 50,
    trafficLights: TrafficLightController,
  ) {
    this.object.name = 'Pedestrians';
    this.nav = new PedestrianNavigation();
    this.signalController = new PedestrianSignalController(trafficLights);
    this.spawner = new PedestrianSpawner(poolSize, this.nav);

    for (const p of this.spawner.getPool().getAll()) {
      this.object.add(p.object);
    }
  }

  setDensity(level: PedestrianDensityLevel): void {
    this.spawner.setDensity(level);
  }

  getDensity(): PedestrianDensityLevel {
    return this.spawner.getDensity();
  }

  getMetrics(): PedestrianMetrics {
    return this.spawner.getMetrics();
  }

  getActivePedestrians(): Pedestrian[] {
    return this.spawner.getPool().getActive();
  }

  getAllPedestrians(): Pedestrian[] {
    return this.spawner.getPool().getAll();
  }

  update(deltaSeconds: number): void {
    this.spawner.update(deltaSeconds);
    const active = this.spawner.getPool().getActive();

    for (const p of active) {
      p.update(deltaSeconds, this.signalController, this.nav, active);
    }
  }

  /**
   * Safety check for vehicles: checks if any pedestrian is actively crossing inside a 2D bounding area on the road.
   */
  isPedestrianInZone(minX: number, maxX: number, minZ: number, maxZ: number): boolean {
    const active = this.spawner.getPool().getActive();
    for (const p of active) {
      if (p.currentState === 'CROSSING') {
        const x = p.object.position.x;
        const z = p.object.position.z;
        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          return true;
        }
      }
    }
    return false;
  }
}
