import * as THREE from 'three';
import type { RoadNetworkDefinition } from '../../types/RoadNetwork';
import { RouteManager } from '../traffic/RouteManager';

const materials = {
  lane: new THREE.LineBasicMaterial({ color: 0x48d4ff, transparent: true, opacity: 0.85 }),
  straight: new THREE.LineBasicMaterial({ color: 0x48d4ff, transparent: true, opacity: 0.75 }),
  left: new THREE.LineBasicMaterial({ color: 0xffb834, transparent: true, opacity: 0.85 }),
  right: new THREE.LineBasicMaterial({ color: 0x42f575, transparent: true, opacity: 0.85 }),
  stopZone: new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.24, depthWrite: false }),
  quadrant: new THREE.MeshBasicMaterial({ color: 0x9b51e0, transparent: true, opacity: 0.12, depthWrite: false }),
  arrow: new THREE.MeshBasicMaterial({ color: 0x48d4ff }),
};

export class TrafficDebugView {
  readonly object = new THREE.Group();

  constructor(network: RoadNetworkDefinition, routes: RouteManager) {
    this.object.name = 'TrafficDebugView';
    this.object.visible = false;

    // 1. Lanes and stop zones
    for (const lane of network.lanes) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lane.start.x, 0.22, lane.start.z),
        new THREE.Vector3(lane.end.x, 0.22, lane.end.z),
      ]);
      const line = new THREE.Line(geometry, materials.lane);
      line.name = `${lane.id}-debug-line`;
      this.object.add(line);

      // Direction indicator arrow cone on lane
      const mid = new THREE.Vector3(
        (lane.start.x + lane.stopLine.x) * 0.5,
        0.28,
        (lane.start.z + lane.stopLine.z) * 0.5,
      );
      const dir = new THREE.Vector3(lane.end.x - lane.start.x, 0, lane.end.z - lane.start.z).normalize();
      const arrowCone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 6), materials.arrow);
      arrowCone.position.copy(mid);
      arrowCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.object.add(arrowCone);

      // Stop zone box
      const stopZone = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.04, 3.6), materials.stopZone);
      stopZone.name = `${lane.id}-traffic-light-detection-zone`;
      stopZone.position.set(lane.stopLine.x, 0.25, lane.stopLine.z);
      this.object.add(stopZone);
    }

    // 2. All 12 smooth route trajectories
    for (const route of routes.getRoutes()) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        route.points.map((p) => p.clone().setY(0.32)),
      );
      const mat =
        route.movement === 'left' ? materials.left : route.movement === 'right' ? materials.right : materials.straight;
      const line = new THREE.Line(geometry, mat);
      line.name = `${route.id}-debug-route`;
      this.object.add(line);
    }

    // 3. Intersection conflict quadrants (NE, NW, SE, SW)
    const quadrants: [string, number, number][] = [
      ['NE', 4, -4],
      ['NW', -4, -4],
      ['SE', 4, 4],
      ['SW', -4, 4],
    ];
    for (const [name, x, z] of quadrants) {
      const qMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 0.04, 8), materials.quadrant);
      qMesh.name = `conflict-quadrant-${name}`;
      qMesh.position.set(x, 0.26, z);
      this.object.add(qMesh);
    }
  }

  setEnabled(enabled: boolean): void {
    this.object.visible = enabled;
  }

  isEnabled(): boolean {
    return this.object.visible;
  }
}
