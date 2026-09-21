import type { PedestrianDensityLevel, PedestrianMetrics } from '../../types/Pedestrian';
import type { PedestrianNavigation } from './PedestrianNavigation';
import { PedestrianPool } from './PedestrianPool';
import type { Pedestrian } from './Pedestrian';

export const PEDESTRIAN_DENSITY_TARGETS: Record<PedestrianDensityLevel, number> = {
  LOW: 12,
  MEDIUM: 28,
  HIGH: 45,
};

export class PedestrianSpawner {
  private readonly pool: PedestrianPool;
  private densityLevel: PedestrianDensityLevel = 'MEDIUM';
  private spawnTimer = 0;
  private readonly spawnInterval = 0.4;
  private completedTrips = 0;

  constructor(
    poolSize: number,
    private readonly nav: PedestrianNavigation,
  ) {
    this.pool = new PedestrianPool(poolSize);
    this.seedInitialPedestrians();
  }

  getPool(): PedestrianPool {
    return this.pool;
  }

  setDensity(level: PedestrianDensityLevel): void {
    this.densityLevel = level;
    this.adjustPopulation();
  }

  getDensity(): PedestrianDensityLevel {
    return this.densityLevel;
  }

  update(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;

    const target = PEDESTRIAN_DENSITY_TARGETS[this.densityLevel];
    const active = this.pool.getActive();

    // 1. Process completed trips and retire excess pedestrians if over target density
    for (const p of active) {
      if (p.tripCompleted) {
        p.tripCompleted = false;
        this.completedTrips += 1;

        if (this.pool.getActive().length > target) {
          this.pool.release(p);
        }
      }
    }

    // 2. If active count is below target, spawn up to target on interval
    if (this.pool.getActive().length < target) {
      this.spawnTimer += deltaSeconds;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.trySpawn();
      }
    }
  }

  getMetrics(): PedestrianMetrics {
    const active = this.pool.getActive();
    let walking = 0;
    let waiting = 0;
    let crossing = 0;
    let insideBuilding = 0;

    for (const p of active) {
      if (p.currentState === 'WALKING') walking++;
      else if (p.currentState === 'WAITING_FOR_CROSSING') waiting++;
      else if (p.currentState === 'CROSSING') crossing++;
      else if (p.currentState === 'INSIDE_BUILDING') insideBuilding++;
    }

    return {
      activePedestrians: active.length,
      walkingPedestrians: walking,
      waitingPedestrians: waiting,
      crossingPedestrians: crossing,
      insideBuilding,
      completedTrips: this.completedTrips,
    };
  }

  private seedInitialPedestrians(): void {
    const target = PEDESTRIAN_DENSITY_TARGETS[this.densityLevel];
    for (let i = 0; i < target; i++) {
      const start = this.nav.getRandomSpawnNode();
      const dest = this.nav.getRandomDestination(start.id);
      this.pool.acquire(start, dest, this.nav);
    }
  }

  private adjustPopulation(): void {
    const target = PEDESTRIAN_DENSITY_TARGETS[this.densityLevel];
    const active = this.pool.getActive();

    if (active.length > target) {
      const excessCount = active.length - target;
      // Sort candidates to retire: prioritize pedestrians inside buildings or idle at destinations
      const candidates = [...active].sort((a, b) => {
        const priority = (p: Pedestrian) => {
          if (p.currentState === 'INSIDE_BUILDING') return 4;
          if (p.currentState === 'WAITING_AT_DESTINATION' || p.currentState === 'IDLE') return 3;
          if (p.currentState === 'WALKING') return 2;
          if (p.currentState === 'WAITING_FOR_CROSSING') return 1;
          return 0; // CROSSING (avoid interrupting street crossings)
        };
        return priority(b) - priority(a);
      });

      for (let i = 0; i < excessCount; i++) {
        this.pool.release(candidates[i]);
        this.completedTrips += 1;
      }
    } else if (active.length < target) {
      const needed = target - active.length;
      for (let i = 0; i < needed; i++) {
        const start = this.nav.getRandomSpawnNode();
        const dest = this.nav.getRandomDestination(start.id);
        this.pool.acquire(start, dest, this.nav);
      }
    }
  }

  private trySpawn(): void {
    const active = this.pool.getActive();
    const target = PEDESTRIAN_DENSITY_TARGETS[this.densityLevel];
    if (active.length >= target) return;

    const start = this.nav.getRandomSpawnNode();
    const dest = this.nav.getRandomDestination(start.id);
    this.pool.acquire(start, dest, this.nav);
  }
}
