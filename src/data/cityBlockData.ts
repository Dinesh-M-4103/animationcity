import { CITY_SCALE } from '../config/constants';
import type { RoadNetworkDefinition } from '../types/RoadNetwork';

const extent = 68;
const halfLane = CITY_SCALE.laneWidth * 0.55;

export const roadNetwork: RoadNetworkDefinition = {
  roads: [
    {
      id: 'road-east-west',
      name: 'Market Avenue',
      start: { x: -extent, z: 0 },
      end: { x: extent, z: 0 },
      width: CITY_SCALE.roadWidth,
      laneIds: ['lane-westbound', 'lane-eastbound'],
    },
    {
      id: 'road-north-south',
      name: 'Harbor Street',
      start: { x: 0, z: -extent },
      end: { x: 0, z: extent },
      width: CITY_SCALE.roadWidth,
      laneIds: ['lane-northbound', 'lane-southbound'],
    },
  ],
  lanes: [
    {
      id: 'lane-eastbound',
      roadId: 'road-east-west',
      direction: 'eastbound',
      start: { x: -extent, z: halfLane },
      end: { x: extent, z: halfLane },
      width: CITY_SCALE.laneWidth,
      connectsTo: ['lane-eastbound', 'lane-northbound', 'lane-southbound'],
    },
    {
      id: 'lane-westbound',
      roadId: 'road-east-west',
      direction: 'westbound',
      start: { x: extent, z: -halfLane },
      end: { x: -extent, z: -halfLane },
      width: CITY_SCALE.laneWidth,
      connectsTo: ['lane-westbound', 'lane-northbound', 'lane-southbound'],
    },
    {
      id: 'lane-northbound',
      roadId: 'road-north-south',
      direction: 'northbound',
      start: { x: -halfLane, z: extent },
      end: { x: -halfLane, z: -extent },
      width: CITY_SCALE.laneWidth,
      connectsTo: ['lane-northbound', 'lane-eastbound', 'lane-westbound'],
    },
    {
      id: 'lane-southbound',
      roadId: 'road-north-south',
      direction: 'southbound',
      start: { x: halfLane, z: -extent },
      end: { x: halfLane, z: extent },
      width: CITY_SCALE.laneWidth,
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
    },
  ],
};

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
