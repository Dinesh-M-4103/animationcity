import * as THREE from 'three';
import type { LaneConnection, LaneDefinition, RoadNetworkDefinition } from '../../types/RoadNetwork';

export interface VehicleRoute {
  id: string;
  startLaneId: string;
  destinationRoadId: string;
  connection: LaneConnection;
  points: THREE.Vector3[];
  stopPointIndex: number;
}

export class RouteManager {
  private readonly lanes = new Map<string, LaneDefinition>();
  private readonly routes = new Map<string, VehicleRoute>();

  constructor(private readonly network: RoadNetworkDefinition) {
    for (const lane of network.lanes) {
      this.lanes.set(lane.id, lane);
    }
    this.createRoutes();
  }

  getRoute(id: string): VehicleRoute {
    const route = this.routes.get(id);
    if (!route) throw new Error(`Route ${id} is not defined.`);
    return route;
  }

  getLane(id: string): LaneDefinition {
    const lane = this.lanes.get(id);
    if (!lane) throw new Error(`Lane ${id} is not defined.`);
    return lane;
  }

  getRoutes(): VehicleRoute[] {
    return [...this.routes.values()];
  }

  private createRoutes(): void {
    const intersection = this.network.intersections[0];
    const wanted = [
      ['west-to-east', 'lane-eastbound', 'lane-eastbound'],
      ['west-to-north', 'lane-eastbound', 'lane-northbound'],
      ['north-to-east', 'lane-southbound', 'lane-eastbound'],
      ['east-to-south', 'lane-westbound', 'lane-southbound'],
      ['south-to-west', 'lane-northbound', 'lane-westbound'],
    ] as const;

    for (const [id, fromLaneId, toLaneId] of wanted) {
      const fromLane = this.getLane(fromLaneId);
      const toLane = this.getLane(toLaneId);
      const connection = intersection.laneConnections.find(
        (candidate) => candidate.fromLaneId === fromLaneId && candidate.toLaneId === toLaneId,
      );
      if (!connection) throw new Error(`Missing lane connection ${fromLaneId} -> ${toLaneId}.`);

      this.routes.set(id, {
        id,
        startLaneId: fromLaneId,
        destinationRoadId: toLane.roadId,
        connection,
        points: [
          toVec3(fromLane.start),
          toVec3(fromLane.stopLine),
          ...connection.via.map(toVec3),
          toVec3(toLane.end),
        ],
        stopPointIndex: 1,
      });
    }
  }
}

function toVec3(point: { x: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(point.x, 0.36, point.z);
}
