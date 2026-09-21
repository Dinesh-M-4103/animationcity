import { CITY_SCALE } from '../config/constants';
import type { RoadNetworkDefinition } from '../types/RoadNetwork';
import type { TrafficLightDefinition } from '../types/Traffic';
import type { VehicleDefinition } from '../types/Vehicle';

const extent = 68;
const halfLane = CITY_SCALE.laneWidth * 0.55;
const stopOffset = CITY_SCALE.roadWidth * 0.78;

export const roadNetwork: RoadNetworkDefinition = {
  roads: [
    {
      id: 'road-east-west',
      name: 'Market Avenue',
      start: { x: -extent, z: 0 },
      end: { x: extent, z: 0 },
      width: CITY_SCALE.roadWidth,
      speedLimit: 42,
      laneIds: ['lane-westbound', 'lane-eastbound'],
    },
    {
      id: 'road-north-south',
      name: 'Harbor Street',
      start: { x: 0, z: -extent },
      end: { x: 0, z: extent },
      width: CITY_SCALE.roadWidth,
      speedLimit: 36,
      laneIds: ['lane-northbound', 'lane-southbound'],
    },
  ],
  lanes: [
    {
      id: 'lane-eastbound',
      roadId: 'road-east-west',
      direction: 'eastbound',
      axis: 'east-west',
      start: { x: -extent, z: halfLane },
      end: { x: extent, z: halfLane },
      width: CITY_SCALE.laneWidth,
      speedLimit: 42,
      stopLine: { x: -stopOffset, z: halfLane },
      connectsTo: ['lane-eastbound', 'lane-northbound', 'lane-southbound'],
    },
    {
      id: 'lane-westbound',
      roadId: 'road-east-west',
      direction: 'westbound',
      axis: 'east-west',
      start: { x: extent, z: -halfLane },
      end: { x: -extent, z: -halfLane },
      width: CITY_SCALE.laneWidth,
      speedLimit: 42,
      stopLine: { x: stopOffset, z: -halfLane },
      connectsTo: ['lane-westbound', 'lane-northbound', 'lane-southbound'],
    },
    {
      id: 'lane-northbound',
      roadId: 'road-north-south',
      direction: 'northbound',
      axis: 'north-south',
      start: { x: -halfLane, z: extent },
      end: { x: -halfLane, z: -extent },
      width: CITY_SCALE.laneWidth,
      speedLimit: 36,
      stopLine: { x: -halfLane, z: stopOffset },
      connectsTo: ['lane-northbound', 'lane-eastbound', 'lane-westbound'],
    },
    {
      id: 'lane-southbound',
      roadId: 'road-north-south',
      direction: 'southbound',
      axis: 'north-south',
      start: { x: halfLane, z: -extent },
      end: { x: halfLane, z: extent },
      width: CITY_SCALE.laneWidth,
      speedLimit: 36,
      stopLine: { x: halfLane, z: -stopOffset },
      connectsTo: ['lane-southbound', 'lane-eastbound', 'lane-westbound'],
    },
  ],
  intersections: [
    {
      id: 'intersection-01',
      label: 'INTERSECTION 01',
      center: { x: 0, z: 0 },
      size: CITY_SCALE.roadWidth + 2,
      connectedRoadIds: ['road-east-west', 'road-north-south'],
      incomingLaneIds: ['lane-eastbound', 'lane-westbound', 'lane-northbound', 'lane-southbound'],
      outgoingLaneIds: ['lane-eastbound', 'lane-westbound', 'lane-northbound', 'lane-southbound'],
      laneConnections: [
        { fromLaneId: 'lane-eastbound', toLaneId: 'lane-eastbound', movement: 'straight', via: [{ x: 0, z: halfLane }] },
        { fromLaneId: 'lane-eastbound', toLaneId: 'lane-northbound', movement: 'left', via: [{ x: -halfLane, z: halfLane }, { x: -halfLane, z: -stopOffset }] },
        { fromLaneId: 'lane-eastbound', toLaneId: 'lane-southbound', movement: 'right', via: [{ x: halfLane, z: halfLane }, { x: halfLane, z: stopOffset }] },
        { fromLaneId: 'lane-westbound', toLaneId: 'lane-westbound', movement: 'straight', via: [{ x: 0, z: -halfLane }] },
        { fromLaneId: 'lane-westbound', toLaneId: 'lane-southbound', movement: 'left', via: [{ x: halfLane, z: -halfLane }, { x: halfLane, z: stopOffset }] },
        { fromLaneId: 'lane-westbound', toLaneId: 'lane-northbound', movement: 'right', via: [{ x: -halfLane, z: -halfLane }, { x: -halfLane, z: -stopOffset }] },
        { fromLaneId: 'lane-northbound', toLaneId: 'lane-northbound', movement: 'straight', via: [{ x: -halfLane, z: 0 }] },
        { fromLaneId: 'lane-northbound', toLaneId: 'lane-westbound', movement: 'left', via: [{ x: -halfLane, z: -halfLane }, { x: -stopOffset, z: -halfLane }] },
        { fromLaneId: 'lane-northbound', toLaneId: 'lane-eastbound', movement: 'right', via: [{ x: -halfLane, z: halfLane }, { x: stopOffset, z: halfLane }] },
        { fromLaneId: 'lane-southbound', toLaneId: 'lane-southbound', movement: 'straight', via: [{ x: halfLane, z: 0 }] },
        { fromLaneId: 'lane-southbound', toLaneId: 'lane-eastbound', movement: 'left', via: [{ x: halfLane, z: halfLane }, { x: stopOffset, z: halfLane }] },
        { fromLaneId: 'lane-southbound', toLaneId: 'lane-westbound', movement: 'right', via: [{ x: halfLane, z: -halfLane }, { x: -stopOffset, z: -halfLane }] },
      ],
      trafficLightIds: ['signal-north', 'signal-south', 'signal-east', 'signal-west'],
    },
  ],
};

export const trafficLights: TrafficLightDefinition[] = [
  { id: 'signal-north', intersectionId: 'intersection-01', axis: 'north-south', x: 7.8, z: -10.2, rotationY: Math.PI },
  { id: 'signal-south', intersectionId: 'intersection-01', axis: 'north-south', x: -7.8, z: 10.2, rotationY: 0 },
  { id: 'signal-east', intersectionId: 'intersection-01', axis: 'east-west', x: 10.2, z: 7.8, rotationY: -Math.PI / 2 },
  { id: 'signal-west', intersectionId: 'intersection-01', axis: 'east-west', x: -10.2, z: -7.8, rotationY: Math.PI / 2 },
];

export const testVehicles: VehicleDefinition[] = [
  { id: 'vehicle-001', type: 'Sedan', routeId: 'west-to-east', color: 0x326f9a, maxSpeed: 8.8, startDelay: 0 },
  { id: 'vehicle-002', type: 'SUV', routeId: 'north-to-east', color: 0x8f463e, maxSpeed: 7.4, startDelay: 1.5 },
  { id: 'vehicle-003', type: 'Van', routeId: 'east-to-south', color: 0xe0d8c6, maxSpeed: 6.7, startDelay: 3.1 },
  { id: 'vehicle-004', type: 'Bus', routeId: 'south-to-west', color: 0xc9993f, maxSpeed: 5.8, startDelay: 4.4 },
  { id: 'vehicle-005', type: 'Sedan', routeId: 'west-to-north', color: 0x3d7555, maxSpeed: 8.2, startDelay: 5.8 },
];

export interface BuildingLot {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  floors: number;
  style: 'glass' | 'brick' | 'stone' | 'mixed';
}

export const buildingLots: BuildingLot[] = [
  { id: 'building-nw-01', x: -35, z: -32, width: 16, depth: 20, floors: 7, style: 'brick' },
  { id: 'building-nw-02', x: -55, z: -34, width: 14, depth: 16, floors: 4, style: 'mixed' },
  { id: 'building-ne-01', x: 33, z: -34, width: 20, depth: 18, floors: 9, style: 'glass' },
  { id: 'building-ne-02', x: 56, z: -30, width: 13, depth: 24, floors: 5, style: 'stone' },
  { id: 'building-sw-01', x: -32, z: 34, width: 22, depth: 16, floors: 6, style: 'stone' },
  { id: 'building-sw-02', x: -56, z: 35, width: 15, depth: 18, floors: 3, style: 'brick' },
  { id: 'building-se-01', x: 32, z: 33, width: 15, depth: 22, floors: 8, style: 'mixed' },
  { id: 'building-se-02', x: 55, z: 38, width: 19, depth: 16, floors: 4, style: 'glass' },
];
