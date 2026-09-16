export type PedestrianState =
  | 'WALKING'
  | 'WAITING_FOR_CROSSING'
  | 'CROSSING'
  | 'WAITING_AT_DESTINATION'
  | 'ENTERING_BUILDING'
  | 'INSIDE_BUILDING'
  | 'EXITING_BUILDING'
  | 'IDLE';

export type PedestrianSignalState = 'WALK' | 'DONT_WALK';

export type PedestrianType = 'Adult' | 'Worker' | 'Student' | 'Elderly';

export type PedestrianDensityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface PedestrianMetrics {
  activePedestrians: number;
  walkingPedestrians: number;
  waitingPedestrians: number;
  crossingPedestrians: number;
  insideBuilding: number;
  completedTrips: number;
}

export interface PedestrianDefinition {
  id: string;
  type: PedestrianType;
  heightScale: number;
  skinColor: number;
  shirtColor: number;
  pantsColor: number;
  hairColor: number;
  walkingSpeed: number;
}

export type SidewalkNodeType =
  | 'SIDEWALK'
  | 'CORNER_WAITING'
  | 'CROSSWALK'
  | 'BUILDING_ENTRANCE'
  | 'PLAZA_BENCH';

export interface SidewalkNode {
  id: string;
  x: number;
  z: number;
  type: SidewalkNodeType;
  block: 'NW' | 'NE' | 'SW' | 'SE' | 'ROAD';
  crosswalkId?: string;
  buildingId?: string;
}

export interface SidewalkEdge {
  fromNodeId: string;
  toNodeId: string;
  distance: number;
  isCrosswalk: boolean;
  crosswalkId?: string;
}
