import * as THREE from 'three';
import type { RoadNetworkDefinition } from '../../types/RoadNetwork';
import { RouteManager } from '../traffic/RouteManager';

const materials = {
  lane: new THREE.LineBasicMaterial({ color: 0x48d4ff, transparent: true, opacity: 0.82 }),
  connection: new THREE.LineBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.82 }),
  zone: new THREE.MeshBasicMaterial({ color: 0xff4f72, transparent: true, opacity: 0.16, depthWrite: false }),
};

export class TrafficDebugView {
  readonly object = new THREE.Group();

  constructor(network: RoadNetworkDefinition, routes: RouteManager) {
    this.object.name = 'TrafficDebugView';
    this.object.visible = false;

    for (const lane of network.lanes) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lane.start.x, 0.22, lane.start.z),
        new THREE.Vector3(lane.end.x, 0.22, lane.end.z),
      ]);
      const line = new THREE.Line(geometry, materials.lane);
      line.name = `${lane.id}-debug-line`;
      this.object.add(line);

      const stopZone = new THREE.Mesh(new THREE.BoxGeometry(4, 0.03, 4), materials.zone);
      stopZone.name = `${lane.id}-traffic-light-detection-zone`;
      stopZone.position.set(lane.stopLine.x, 0.25, lane.stopLine.z);
      this.object.add(stopZone);
    }

    for (const route of routes.getRoutes()) {
      const geometry = new THREE.BufferGeometry().setFromPoints(route.points.map((point) => point.clone().setY(0.32)));
      const line = new THREE.Line(geometry, materials.connection);
      line.name = `${route.id}-debug-route`;
      this.object.add(line);
    }
  }

  setEnabled(enabled: boolean): void {
    this.object.visible = enabled;
  }

  isEnabled(): boolean {
    return this.object.visible;
  }
}
