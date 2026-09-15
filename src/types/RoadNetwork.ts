export type LaneDirection = 'northbound' | 'southbound' | 'eastbound' | 'westbound';

export interface Vec2 {
  x: number;
  z: number;
}

export interface LaneDefinition {
  id: string;
  roadId: string;
  direction: LaneDirection;
  start: Vec2;
  end: Vec2;
  width: number;
  connectsTo: string[];
}

export interface RoadDefinition {
  id: string;
  name: string;
  start: Vec2;
  end: Vec2;
  width: number;
  laneIds: string[];
}

export interface IntersectionDefinition {
  id: string;
  label: string;
  center: Vec2;
  size: number;
  connectedRoadIds: string[];
  incomingLaneIds: string[];
  outgoingLaneIds: string[];
}

export interface RoadNetworkDefinition {
  roads: RoadDefinition[];
  lanes: LaneDefinition[];
  intersections: IntersectionDefinition[];
}
