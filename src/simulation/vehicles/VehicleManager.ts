import * as THREE from 'three';
import { SIMULATION } from '../../config/constants';
import type { VehicleDefinition } from '../../types/Vehicle';
import { TrafficLightController } from '../traffic/TrafficLightController';
import { RouteManager } from '../traffic/RouteManager';
import { Vehicle } from './Vehicle';

export class VehicleManager {
  readonly object = new THREE.Group();
  private readonly vehicles: Vehicle[] = [];

  constructor(
    definitions: VehicleDefinition[],
    private readonly routes: RouteManager,
    private readonly trafficLights: TrafficLightController,
  ) {
    this.object.name = 'MovingVehicles';
    for (const definition of definitions) {
      const vehicle = new Vehicle(definition, routes.getRoute(definition.routeId));
      this.vehicles.push(vehicle);
      this.object.add(vehicle.object);
    }
  }

  update(deltaSeconds: number): void {
    for (const vehicle of this.vehicles) {
      const lane = this.routes.getLane(vehicle.route.startLaneId);
      const lightState = this.trafficLights.getStateForAxis(lane.axis);
      let desiredSpeed = Math.min(vehicle.definition.maxSpeed, lane.speedLimit / 3.6);

      if (vehicle.isApproachingStop() && vehicle.distanceToStopPoint() < 14) {
        if (lightState === 'RED') {
          desiredSpeed = 0;
          vehicle.state = 'WAITING_FOR_LIGHT';
        } else if (lightState === 'YELLOW') {
          desiredSpeed *= 0.35;
          vehicle.state = 'SLOWING_FOR_YELLOW';
        } else {
          vehicle.state = 'MOVING';
        }
      } else {
        vehicle.state = 'MOVING';
      }

      vehicle.update(deltaSeconds, desiredSpeed, this.getLeadingVehicleDistance(vehicle));
    }
  }

  getVehicles(): Vehicle[] {
    return this.vehicles;
  }

  private getLeadingVehicleDistance(vehicle: Vehicle): number {
    let closest = Number.POSITIVE_INFINITY;
    for (const other of this.vehicles) {
      if (other === vehicle || other.route.id !== vehicle.route.id || !other.object.visible) continue;
      const distance = vehicle.object.position.distanceTo(other.object.position);
      if (distance > 0.1 && distance < closest) {
        closest = distance;
      }
    }
    return Math.min(closest, SIMULATION.safeFollowingDistance + 10);
  }
}
