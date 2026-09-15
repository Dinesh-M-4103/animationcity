import * as THREE from 'three';
import { SIMULATION } from '../config/constants';

export class SimulationClock {
  private readonly clock = new THREE.Clock(false);
  private paused = false;
  private speed = SIMULATION.defaultSpeed;

  reset(): void {
    this.clock.start();
  }

  tick(): number {
    const realDelta = Math.min(this.clock.getDelta(), 0.05);
    return this.paused ? 0 : realDelta * this.speed;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  togglePaused(): void {
    this.paused = !this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  getSpeed(): number {
    return this.speed;
  }
}
