import type { TrafficAxis } from './RoadNetwork';

export type TrafficLightState = 'RED' | 'YELLOW' | 'GREEN';
export type TrafficControllerMode = 'AUTO' | 'MANUAL';
export type TrafficPhase = 'NS_GREEN' | 'NS_YELLOW' | 'EW_GREEN' | 'EW_YELLOW';

export interface TrafficTimings {
  greenDuration: number;
  yellowDuration: number;
}

export interface TrafficLightDefinition {
  id: string;
  intersectionId: string;
  axis: TrafficAxis;
  x: number;
  z: number;
  rotationY: number;
}
