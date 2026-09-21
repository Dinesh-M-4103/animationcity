import * as THREE from 'three';
import type { PedestrianNavigation } from '../pedestrians/PedestrianNavigation';

const materials = {
  sidewalkPath: new THREE.LineBasicMaterial({ color: 0x38ef7d, transparent: true, opacity: 0.65 }),
  crosswalkPath: new THREE.LineBasicMaterial({ color: 0xff9900, transparent: true, opacity: 0.85 }),
  nodeMarker: new THREE.MeshBasicMaterial({ color: 0x11eebb }),
  waitingZone: new THREE.MeshBasicMaterial({ color: 0x00a8ff, transparent: true, opacity: 0.25, depthWrite: false }),
  entranceMarker: new THREE.MeshBasicMaterial({ color: 0xff007f }),
};

export class PedestrianDebugView {
  readonly object = new THREE.Group();

  constructor(nav: PedestrianNavigation) {
    this.object.name = 'PedestrianDebugView';
    this.object.visible = false;

    // 1. Edges (Paths)
    for (const edge of nav.getAllEdges()) {
      const from = nav.getNode(edge.fromNodeId);
      const to = nav.getNode(edge.toNodeId);

      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(from.x, 0.22, from.z),
        new THREE.Vector3(to.x, 0.22, to.z),
      ]);
      const mat = edge.isCrosswalk ? materials.crosswalkPath : materials.sidewalkPath;
      const line = new THREE.Line(geometry, mat);
      this.object.add(line);
    }

    // 2. Nodes
    for (const node of nav.getAllNodes()) {
      if (node.type === 'CORNER_WAITING') {
        const zone = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 2.4), materials.waitingZone);
        zone.position.set(node.x, 0.23, node.z);
        this.object.add(zone);
      } else if (node.type === 'BUILDING_ENTRANCE') {
        const entrance = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.2), materials.entranceMarker);
        entrance.position.set(node.x, 0.23, node.z);
        this.object.add(entrance);
      } else {
        const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), materials.nodeMarker);
        dot.position.set(node.x, 0.22, node.z);
        this.object.add(dot);
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.object.visible = enabled;
  }

  isEnabled(): boolean {
    return this.object.visible;
  }
}
