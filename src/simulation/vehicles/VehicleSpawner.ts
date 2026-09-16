import type { RouteManager } from '../traffic/RouteManager';
import { VehiclePool } from './VehiclePool';
import type { Vehicle } from './Vehicle';

export type TrafficDensityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const DENSITY_TARGETS: Record<TrafficDensityLevel, number> = {
  LOW: 5,
  MEDIUM: 12,
  HIGH: 20,
};

export interface TrafficMetrics {
  activeVehicles: number;
  waitingVehicles: number;
  averageSpeedKmH: number;
  completedTrips: number;
}

export class VehicleSpawner {
  private readonly pool: VehiclePool;
  private densityLevel: TrafficDensityLevel = 'MEDIUM';
  private spawnTimer = 0;
  private readonly spawnInterval = 0.8;
  private completedTrips = 0;
  private laneIndex = 0;

  constructor(
    poolSize: number,
    private readonly routes: RouteManager,
  ) {
    this.pool = new VehiclePool(poolSize, routes);
    // Seed 4 initial vehicles across distinct approach lanes immediately
    const laneIds = ['lane-eastbound', 'lane-westbound', 'lane-northbound', 'lane-southbound'];
    for (const laneId of laneIds) {
      const availableRoutes = this.routes.getRoutesForLane(laneId);
      if (availableRoutes.length > 0) {
        this.pool.acquire(availableRoutes[0]);
      }
    }
  }

  getPool(): VehiclePool {
    return this.pool;
  }

  setDensity(level: TrafficDensityLevel): void {
    this.densityLevel = level;
  }

  getDensity(): TrafficDensityLevel {
    return this.densityLevel;
  }

  update(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;

    // Check for completed vehicles and recycle to pool
    for (const vehicle of this.pool.getActive()) {
      if (vehicle.isCompleted()) {
        this.pool.release(vehicle);
        this.completedTrips += 1;
      }
    }

    // Check if new vehicle can be spawned
    this.spawnTimer += deltaSeconds;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.trySpawnVehicle();
    }
  }

  getMetrics(): TrafficMetrics {
    const active = this.pool.getActive();
    let waiting = 0;
    let speedSum = 0;

    for (const v of active) {
      if (v.speed < 0.3 || v.state === 'WAITING_FOR_LIGHT' || v.state === 'YIELDING') {
        waiting += 1;
      }
      speedSum += v.speed;
    }

    const avgSpeed = active.length > 0 ? (speedSum / active.length) * 3.6 : 0;

    return {
      activeVehicles: active.length,
      waitingVehicles: waiting,
      averageSpeedKmH: Math.round(avgSpeed),
      completedTrips: this.completedTrips,
    };
  }

  private trySpawnVehicle(): void {
    const active = this.pool.getActive();
    const target = DENSITY_TARGETS[this.densityLevel];
    if (active.length >= target) return;

    const laneIds = ['lane-eastbound', 'lane-westbound', 'lane-northbound', 'lane-southbound'];
    // Round-robin with lane clearance check
    for (let i = 0; i < laneIds.length; i++) {
      const idx = (this.laneIndex + i) % laneIds.length;
      const candidateLaneId = laneIds[idx];

      if (this.isLaneEntranceClear(candidateLaneId, active)) {
        const availableRoutes = this.routes.getRoutesForLane(candidateLaneId);
        if (availableRoutes.length > 0) {
          const chosenRoute = availableRoutes[Math.floor(Math.random() * availableRoutes.length)];
          const spawned = this.pool.acquire(chosenRoute);
          if (spawned) {
            this.laneIndex = (idx + 1) % laneIds.length;
            break;
          }
        }
      }
    }
  }

  private isLaneEntranceClear(laneId: string, activeVehicles: Vehicle[]): boolean {
    const entranceThreshold = 18.0; // clearance distance in meters from start of lane
    for (const v of activeVehicles) {
      if (v.route.startLaneId === laneId && v.isApproachingStop()) {
        const distFromStart = v.getTraveledDistance();
        if (distFromStart < entranceThreshold) {
          return false;
        }
      }
    }
    return true;
  }
}
