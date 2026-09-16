import * as THREE from 'three';
import type { TrafficLightController } from '../traffic/TrafficLightController';
import type { RouteManager } from '../traffic/RouteManager';
import { Vehicle } from './Vehicle';
import { TrafficDensityLevel, TrafficMetrics, VehicleSpawner } from './VehicleSpawner';

export class VehicleManager {
  readonly object = new THREE.Group();
  private readonly spawner: VehicleSpawner;

  constructor(
    poolSize = 24,
    private readonly routes: RouteManager,
    private readonly trafficLights: TrafficLightController,
  ) {
    this.object.name = 'MovingVehicles';
    this.spawner = new VehicleSpawner(poolSize, routes);

    for (const vehicle of this.spawner.getPool().getAll()) {
      this.object.add(vehicle.object);
    }
  }

  getSpawner(): VehicleSpawner {
    return this.spawner;
  }

  setDensity(level: TrafficDensityLevel): void {
    this.spawner.setDensity(level);
  }

  getDensity(): TrafficDensityLevel {
    return this.spawner.getDensity();
  }

  getMetrics(): TrafficMetrics {
    return this.spawner.getMetrics();
  }

  getVehicles(): Vehicle[] {
    return this.spawner.getPool().getActive();
  }

  getAllVehicles(): Vehicle[] {
    return this.spawner.getPool().getAll();
  }

  update(deltaSeconds: number): void {
    this.spawner.update(deltaSeconds);
    const activeVehicles = this.spawner.getPool().getActive();

    for (const vehicle of activeVehicles) {
      const startLane = this.routes.getLane(vehicle.route.startLaneId);
      const lightState = this.trafficLights.getStateForAxis(startLane.axis);
      let desiredSpeed = Math.min(vehicle.definition.maxSpeed, startLane.speedLimit / 3.6);

      // Stop line & intersection control
      if (vehicle.isApproachingStop()) {
        const distToStop = vehicle.distanceToStopLine();

        if (distToStop < 16.0) {
          const canEnter = this.canEnterIntersection(vehicle, activeVehicles, lightState, distToStop);
          if (!canEnter) {
            if (distToStop <= 1.8) {
              desiredSpeed = 0;
            } else {
              // Smooth approach to stop line
              desiredSpeed = Math.min(desiredSpeed, Math.max(0, distToStop * 1.5 - 0.5));
            }
          }
        }
      }

      // Directional following: compute gap to the closest vehicle ahead
      const gapAhead = this.getDirectionalGapAhead(vehicle, activeVehicles);
      vehicle.update(deltaSeconds, desiredSpeed, gapAhead);
    }
  }

  private canEnterIntersection(
    vehicle: Vehicle,
    activeVehicles: Vehicle[],
    lightState: 'RED' | 'YELLOW' | 'GREEN',
    distToStop: number,
  ): boolean {
    // 1. Red light -> stop
    if (lightState === 'RED') {
      vehicle.state = 'WAITING_FOR_LIGHT';
      return false;
    }

    // 2. Yellow light -> evaluate stopping distance
    if (lightState === 'YELLOW') {
      const comfortableDecel = 3.6; // m/s^2
      const requiredStoppingDist = (vehicle.speed * vehicle.speed) / (2 * comfortableDecel);

      if (distToStop >= requiredStoppingDist * 1.15 && distToStop > 2.0) {
        vehicle.state = 'WAITING_FOR_LIGHT';
        return false;
      }
      // Too close to safely stop -> commit through yellow
      vehicle.state = 'SLOWING_FOR_YELLOW';
    }

    // 3. Priority 2: Intersection conflict & right-of-way resolution
    // Check if any vehicle currently inside the intersection conflicts with this route's quadrants
    const myQuadrants = vehicle.route.conflictQuadrants;
    for (const other of activeVehicles) {
      if (other === vehicle) continue;
      if (other.isInsideIntersection()) {
        const otherQuadrants = other.route.conflictQuadrants;
        const sharesQuadrant = myQuadrants.some((q) => otherQuadrants.includes(q));
        if (sharesQuadrant) {
          // If the other vehicle is on the same path ahead of us, following logic will handle spacing
          // but if it's a crossing path, wait before entering
          if (other.route.id !== vehicle.route.id) {
            vehicle.state = 'YIELDING';
            return false;
          }
        }
      }
    }

    // 4. Right of Way: Left-turning vehicles yield to oncoming straight traffic
    if (vehicle.route.movement === 'left') {
      const opposingLaneId = this.getOpposingLaneId(vehicle.route.startLaneId);
      if (opposingLaneId) {
        for (const other of activeVehicles) {
          if (
            other !== vehicle &&
            other.route.startLaneId === opposingLaneId &&
            other.route.movement === 'straight' &&
            other.isApproachingStop() &&
            other.distanceToStopLine() < 18.0
          ) {
            vehicle.state = 'YIELDING';
            return false;
          }
        }
      }
    }

    if (vehicle.state === 'WAITING_FOR_LIGHT' || vehicle.state === 'YIELDING') {
      vehicle.state = 'MOVING';
    }
    return true;
  }

  private getDirectionalGapAhead(vehicle: Vehicle, activeVehicles: Vehicle[]): number {
    let minGap = Number.POSITIVE_INFINITY;

    if (vehicle.isApproachingStop()) {
      // Vehicle is on approach lane
      const myDist = vehicle.getTraveledDistance();
      const myLaneId = vehicle.route.startLaneId;

      for (const other of activeVehicles) {
        if (other === vehicle) continue;

        // Any vehicle ahead on the SAME physical approach lane
        if (other.route.startLaneId === myLaneId && other.isApproachingStop()) {
          const otherDist = other.getTraveledDistance();
          if (otherDist > myDist) {
            const gap = (otherDist - myDist) - (vehicle.length * 0.5 + other.length * 0.5);
            if (gap < minGap) minGap = gap;
          }
        }
      }
    } else if (vehicle.hasClearedIntersection()) {
      // Vehicle is on destination exit lane
      const myLaneDist = vehicle.getDistanceAlongCurrentLane();
      const myDestLaneId = vehicle.route.destinationLaneId;

      for (const other of activeVehicles) {
        if (other === vehicle) continue;

        if (other.route.destinationLaneId === myDestLaneId && other.hasClearedIntersection()) {
          const otherLaneDist = other.getDistanceAlongCurrentLane();
          if (otherLaneDist > myLaneDist) {
            const gap = (otherLaneDist - myLaneDist) - (vehicle.length * 0.5 + other.length * 0.5);
            if (gap < minGap) minGap = gap;
          }
        }
      }
    } else if (vehicle.isInsideIntersection()) {
      // Inside intersection: check vehicles ahead on the same route or trajectory
      const myDist = vehicle.getTraveledDistance();
      for (const other of activeVehicles) {
        if (other === vehicle) continue;
        if (other.route.id === vehicle.route.id && other.isInsideIntersection()) {
          const otherDist = other.getTraveledDistance();
          if (otherDist > myDist) {
            const gap = (otherDist - myDist) - (vehicle.length * 0.5 + other.length * 0.5);
            if (gap < minGap) minGap = gap;
          }
        }
      }
    }

    return minGap;
  }

  private getOpposingLaneId(laneId: string): string | null {
    switch (laneId) {
      case 'lane-eastbound':
        return 'lane-westbound';
      case 'lane-westbound':
        return 'lane-eastbound';
      case 'lane-northbound':
        return 'lane-southbound';
      case 'lane-southbound':
        return 'lane-northbound';
      default:
        return null;
    }
  }
}
