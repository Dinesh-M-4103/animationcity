import * as THREE from 'three';
import type { LaneConnection, LaneDefinition, RoadNetworkDefinition, TurnMovement } from '../../types/RoadNetwork';

export type IntersectionQuadrant = 'NE' | 'NW' | 'SE' | 'SW';

export interface VehicleRoute {
  id: string;
  startLaneId: string;
  destinationLaneId: string;
  destinationRoadId: string;
  movement: TurnMovement;
  connection: LaneConnection;
  points: THREE.Vector3[];
  headings: number[];
  stopPointIndex: number;
  intersectionStartIndex: number;
  intersectionEndIndex: number;
  conflictQuadrants: IntersectionQuadrant[];
}

export class RouteManager {
  private readonly lanes = new Map<string, LaneDefinition>();
  private readonly routes = new Map<string, VehicleRoute>();
  private readonly routesByLane = new Map<string, VehicleRoute[]>();

  constructor(private readonly network: RoadNetworkDefinition) {
    for (const lane of network.lanes) {
      this.lanes.set(lane.id, lane);
    }
    this.createAllRoutes();
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

  getRoutesForLane(laneId: string): VehicleRoute[] {
    return this.routesByLane.get(laneId) ?? [];
  }

  private createAllRoutes(): void {
    const intersection = this.network.intersections[0];
    if (!intersection) return;

    // All 12 lane connections from the intersection
    const routeIdAliases: Record<string, string> = {
      'lane-eastbound->lane-eastbound': 'west-to-east',
      'lane-eastbound->lane-northbound': 'west-to-north',
      'lane-eastbound->lane-southbound': 'west-to-south',
      'lane-westbound->lane-westbound': 'east-to-west',
      'lane-westbound->lane-southbound': 'east-to-south',
      'lane-westbound->lane-northbound': 'east-to-north',
      'lane-northbound->lane-northbound': 'south-to-north',
      'lane-northbound->lane-westbound': 'south-to-west',
      'lane-northbound->lane-eastbound': 'south-to-east',
      'lane-southbound->lane-southbound': 'north-to-south',
      'lane-southbound->lane-eastbound': 'north-to-east',
      'lane-southbound->lane-westbound': 'north-to-west',
    };

    for (const connection of intersection.laneConnections) {
      const fromLane = this.getLane(connection.fromLaneId);
      const toLane = this.getLane(connection.toLaneId);
      const key = `${connection.fromLaneId}->${connection.toLaneId}`;
      const routeId = routeIdAliases[key] || key;

      const built = this.buildSmoothRoute(routeId, fromLane, toLane, connection);
      this.routes.set(routeId, built);

      if (!this.routesByLane.has(fromLane.id)) {
        this.routesByLane.set(fromLane.id, []);
      }
      this.routesByLane.get(fromLane.id)!.push(built);
    }
  }

  private buildSmoothRoute(
    id: string,
    fromLane: LaneDefinition,
    toLane: LaneDefinition,
    connection: LaneConnection,
  ): VehicleRoute {
    const y = 0.36;
    const startPoint = new THREE.Vector3(fromLane.start.x, y, fromLane.start.z);
    const stopPoint = new THREE.Vector3(fromLane.stopLine.x, y, fromLane.stopLine.z);
    const endPoint = new THREE.Vector3(toLane.end.x, y, toLane.end.z);

    // Calculate intersection exit point (where the vehicle leaves intersection and enters destination lane)
    const exitPoint = this.getIntersectionExitPoint(toLane, y);

    // Unit directions
    const fromDir = new THREE.Vector3()
      .subVectors(stopPoint, startPoint)
      .setY(0)
      .normalize();
    const toDir = new THREE.Vector3()
      .subVectors(endPoint, exitPoint)
      .setY(0)
      .normalize();

    // 1. Straight approach from lane start to stop line
    const approachPoints = this.sampleLine(startPoint, stopPoint, 1.6);
    const stopPointIndex = approachPoints.length - 1;

    // 2. Intersection traversal curve
    let intersectionCurvePoints: THREE.Vector3[];
    if (connection.movement === 'straight') {
      intersectionCurvePoints = this.sampleLine(stopPoint, exitPoint, 1.4);
      // Remove first point to avoid duplicate with stopPoint
      intersectionCurvePoints.shift();
    } else {
      // Smooth cubic Bezier turn curve
      const chord = stopPoint.distanceTo(exitPoint);
      const handleScale = connection.movement === 'left' ? chord * 0.52 : chord * 0.44;
      const cp1 = stopPoint.clone().addScaledVector(fromDir, handleScale);
      const cp2 = exitPoint.clone().addScaledVector(toDir, -handleScale);

      const bezier = new THREE.CubicBezierCurve3(stopPoint, cp1, cp2, exitPoint);
      const divisions = connection.movement === 'left' ? 24 : 16;
      intersectionCurvePoints = bezier.getPoints(divisions);
      // Remove first point to avoid duplicate with stopPoint
      intersectionCurvePoints.shift();
    }

    const intersectionStartIndex = stopPointIndex;
    const intersectionEndIndex = stopPointIndex + intersectionCurvePoints.length;

    // 3. Exit points from intersection exit to lane end
    const exitPoints = this.sampleLine(exitPoint, endPoint, 1.8);
    // Remove first point to avoid duplicate with curve end
    exitPoints.shift();

    const allPoints = [...approachPoints, ...intersectionCurvePoints, ...exitPoints];

    // Precompute smooth headings (yaw rotation in radians) for each point
    const headings: number[] = [];
    for (let i = 0; i < allPoints.length; i++) {
      if (i < allPoints.length - 1) {
        const next = allPoints[i + 1];
        const curr = allPoints[i];
        headings.push(Math.atan2(next.x - curr.x, next.z - curr.z));
      } else {
        headings.push(headings[i - 1] ?? 0);
      }
    }

    const conflictQuadrants = this.determineConflictQuadrants(fromLane.direction, connection.movement);

    return {
      id,
      startLaneId: fromLane.id,
      destinationLaneId: toLane.id,
      destinationRoadId: toLane.roadId,
      movement: connection.movement,
      connection,
      points: allPoints,
      headings,
      stopPointIndex,
      intersectionStartIndex,
      intersectionEndIndex,
      conflictQuadrants,
    };
  }

  private getIntersectionExitPoint(toLane: LaneDefinition, y: number): THREE.Vector3 {
    // The intersection exit point is opposite the lane's stopline position relative to center
    const stopOffset = Math.hypot(toLane.stopLine.x, toLane.stopLine.z);
    switch (toLane.direction) {
      case 'eastbound':
        return new THREE.Vector3(stopOffset, y, toLane.start.z);
      case 'westbound':
        return new THREE.Vector3(-stopOffset, y, toLane.start.z);
      case 'northbound':
        return new THREE.Vector3(toLane.start.x, y, -stopOffset);
      case 'southbound':
        return new THREE.Vector3(toLane.start.x, y, stopOffset);
    }
  }

  private sampleLine(start: THREE.Vector3, end: THREE.Vector3, step: number): THREE.Vector3[] {
    const totalDist = start.distanceTo(end);
    const count = Math.max(1, Math.round(totalDist / step));
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      points.push(start.clone().lerp(end, t));
    }
    return points;
  }

  private determineConflictQuadrants(
    fromDir: LaneDefinition['direction'],
    movement: TurnMovement,
  ): IntersectionQuadrant[] {
    if (fromDir === 'eastbound') {
      if (movement === 'straight') return ['SW', 'SE'];
      if (movement === 'right') return ['SE'];
      return ['SW', 'NW'];
    }
    if (fromDir === 'westbound') {
      if (movement === 'straight') return ['NE', 'NW'];
      if (movement === 'right') return ['NE'];
      return ['NE', 'SE'];
    }
    if (fromDir === 'northbound') {
      if (movement === 'straight') return ['SW', 'NW'];
      if (movement === 'right') return ['SW'];
      return ['SW', 'SE'];
    }
    // southbound
    if (movement === 'straight') return ['NE', 'SE'];
    if (movement === 'right') return ['NE'];
    return ['NE', 'NW'];
  }
}
