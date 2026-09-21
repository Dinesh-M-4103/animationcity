export type LaneDirection = 'northbound' | 'southbound' | 'eastbound' | 'westbound';
export type TrafficAxis = 'north-south' | 'east-west';
export type TurnMovement = 'straight' | 'left' | 'right';

export interface Vec2 {
  x: number;
  z: number;
}

export interface LaneDefinition {
  id: string;
  roadId: string;
  direction: LaneDirection;
  axis: TrafficAxis;
  start: Vec2;
  end: Vec2;
  width: number;
  speedLimit: number;
  stopLine: Vec2;
  connectsTo: string[];
}

export interface RoadDefinition {
  id: string;
  name: string;
  start: Vec2;
  end: Vec2;
  width: number;
  speedLimit: number;
  laneIds: string[];
}

export interface LaneConnection {
  fromLaneId: string;
  toLaneId: string;
  movement: TurnMovement;
  via: Vec2[];
}

export interface IntersectionDefinition {
  id: string;
  label: string;
  center: Vec2;
  size: number;
  connectedRoadIds: string[];
  incomingLaneIds: string[];
  outgoingLaneIds: string[];
  laneConnections: LaneConnection[];
  trafficLightIds: string[];
}

export interface RoadNetworkDefinition {
  roads: RoadDefinition[];
  lanes: LaneDefinition[];
  intersections: IntersectionDefinition[];
}
