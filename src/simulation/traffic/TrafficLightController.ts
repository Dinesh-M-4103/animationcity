import { TRAFFIC_LIGHTS } from '../../config/constants';
import type { TrafficAxis } from '../../types/RoadNetwork';
import type { TrafficControllerMode, TrafficLightState, TrafficPhase, TrafficTimings } from '../../types/Traffic';

const phaseOrder: TrafficPhase[] = ['NS_GREEN', 'NS_YELLOW', 'EW_GREEN', 'EW_YELLOW'];

export class TrafficLightController {
  private mode: TrafficControllerMode = 'AUTO';
  private phase: TrafficPhase = 'NS_GREEN';
  private elapsed = 0;
  private readonly timings: TrafficTimings;

  constructor(timings: TrafficTimings = TRAFFIC_LIGHTS) {
    this.timings = timings;
  }

  update(deltaSeconds: number): void {
    if (this.mode !== 'AUTO' || deltaSeconds <= 0) return;

    this.elapsed += deltaSeconds;
    const duration = this.phase.includes('GREEN') ? this.timings.greenDuration : this.timings.yellowDuration;
    if (this.elapsed >= duration) {
      this.elapsed = 0;
      const nextIndex = (phaseOrder.indexOf(this.phase) + 1) % phaseOrder.length;
      this.phase = phaseOrder[nextIndex];
    }
  }

  setMode(mode: TrafficControllerMode): void {
    this.mode = mode;
    this.elapsed = 0;
  }

  setManualPhase(phase: TrafficPhase): void {
    this.mode = 'MANUAL';
    this.phase = phase;
    this.elapsed = 0;
  }

  getMode(): TrafficControllerMode {
    return this.mode;
  }

  getPhase(): TrafficPhase {
    return this.phase;
  }

  getStateForAxis(axis: TrafficAxis): TrafficLightState {
    if (axis === 'north-south') {
      if (this.phase === 'NS_GREEN') return 'GREEN';
      if (this.phase === 'NS_YELLOW') return 'YELLOW';
      return 'RED';
    }

    if (this.phase === 'EW_GREEN') return 'GREEN';
    if (this.phase === 'EW_YELLOW') return 'YELLOW';
    return 'RED';
  }

  getSnapshot(): Record<string, string | number> {
    return {
      Mode: this.mode,
      Phase: this.phase.replace('_', ' / '),
      'North / South': this.getStateForAxis('north-south'),
      'East / West': this.getStateForAxis('east-west'),
    };
  }
}
