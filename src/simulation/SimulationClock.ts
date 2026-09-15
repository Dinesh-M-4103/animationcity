import * as THREE from 'three';

export class SimulationClock {
  private readonly clock = new THREE.Clock(false);

  reset(): void {
    this.clock.start();
  }

  tick(): number {
    return Math.min(this.clock.getDelta(), 0.05);
  }
}
