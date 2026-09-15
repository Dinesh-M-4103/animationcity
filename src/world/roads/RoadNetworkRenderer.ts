import * as THREE from 'three';
import { CITY_SCALE, COLORS } from '../../config/constants';
import type { IntersectionDefinition, RoadDefinition, RoadNetworkDefinition } from '../../types/RoadNetwork';
import type { SelectableInfo } from '../../types/Selectable';

const materials = {
  asphalt: new THREE.MeshStandardMaterial({ color: COLORS.asphalt, roughness: 0.9 }),
  shoulder: new THREE.MeshStandardMaterial({ color: COLORS.asphaltShoulder, roughness: 0.88 }),
  white: new THREE.MeshStandardMaterial({ color: COLORS.laneWhite, roughness: 0.58 }),
  yellow: new THREE.MeshStandardMaterial({ color: COLORS.laneYellow, roughness: 0.58 }),
  transparentSelect: new THREE.MeshBasicMaterial({
    color: COLORS.selection,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }),
};

export class RoadNetworkRenderer {
  constructor(private readonly network: RoadNetworkDefinition) {}

  createRoads(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'RoadNetwork';

    for (const road of this.network.roads) {
      group.add(this.createRoadSegment(road));
      group.add(this.createLaneMarkings(road));
    }

    for (const intersection of this.network.intersections) {
      group.add(this.createIntersection(intersection));
      group.add(this.createCrosswalks(intersection));
    }

    return group;
  }

  private createRoadSegment(road: RoadDefinition): THREE.Object3D {
    const length = distance(road.start, road.end);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, road.width), materials.asphalt);
    mesh.name = road.id;
    mesh.position.set((road.start.x + road.end.x) / 2, 0.03, (road.start.z + road.end.z) / 2);
    mesh.rotation.y = Math.atan2(road.end.z - road.start.z, road.end.x - road.start.x);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createLaneMarkings(road: RoadDefinition): THREE.Group {
    const group = new THREE.Group();
    const isHorizontal = Math.abs(road.end.x - road.start.x) > Math.abs(road.end.z - road.start.z);
    const length = distance(road.start, road.end);
    const dashCount = Math.floor(length / 9);

    for (let i = 0; i < dashCount; i += 1) {
      const t = (i + 0.5) / dashCount;
      const x = road.start.x + (road.end.x - road.start.x) * t;
      const z = road.start.z + (road.end.z - road.start.z) * t;
      if (Math.abs(x) < 9 && Math.abs(z) < 9) continue;

      const dash = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 0.18), materials.yellow);
      dash.name = `${road.id}-center-dash`;
      dash.position.set(x, 0.105, z);
      dash.rotation.y = isHorizontal ? 0 : Math.PI / 2;
      group.add(dash);
    }

    const edgeOffsets = [-road.width / 2 + 0.45, road.width / 2 - 0.45];
    for (const offset of edgeOffsets) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(length, 0.035, 0.16),
        materials.white,
      );
      stripe.name = `${road.id}-edge-line`;
      stripe.position.set(
        (road.start.x + road.end.x) / 2 + (isHorizontal ? 0 : offset),
        0.11,
        (road.start.z + road.end.z) / 2 + (isHorizontal ? offset : 0),
      );
      stripe.rotation.y = isHorizontal ? 0 : Math.PI / 2;
      group.add(stripe);
    }

    return group;
  }

  private createIntersection(intersection: IntersectionDefinition): THREE.Object3D {
    const group = new THREE.Group();
    group.name = intersection.id;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(intersection.size, 0.1, intersection.size),
      materials.asphalt,
    );
    mesh.name = `${intersection.id}-surface`;
    mesh.position.set(intersection.center.x, 0.08, intersection.center.z);
    mesh.receiveShadow = true;
    group.add(mesh);

    const hitZone = new THREE.Mesh(
      new THREE.BoxGeometry(intersection.size * 1.8, 0.04, intersection.size * 1.8),
      materials.transparentSelect,
    );
    hitZone.name = `${intersection.id}-hit-zone`;
    hitZone.position.set(intersection.center.x, 0.3, intersection.center.z);
    group.add(hitZone);

    const info: SelectableInfo = {
      id: intersection.id,
      type: 'intersection',
      title: intersection.label,
      details: {
        'Traffic lights': intersection.trafficLightIds.length,
        Vehicles: 0,
        Pedestrians: 0,
        Roads: intersection.connectedRoadIds.length,
        Lanes: intersection.incomingLaneIds.length,
        Connections: intersection.laneConnections.length,
      },
    };
    group.userData.selectable = info;
    mesh.userData.selectableRoot = group;
    hitZone.userData.selectableRoot = group;

    return group;
  }

  private createCrosswalks(intersection: IntersectionDefinition): THREE.Group {
    const group = new THREE.Group();
    group.name = `${intersection.id}-crosswalks`;
    const offset = CITY_SCALE.roadWidth * 0.64;
    const stripeCount = 6;

    const placements = [
      { x: 0, z: -offset, horizontal: true },
      { x: 0, z: offset, horizontal: true },
      { x: -offset, z: 0, horizontal: false },
      { x: offset, z: 0, horizontal: false },
    ];

    for (const placement of placements) {
      for (let i = 0; i < stripeCount; i += 1) {
        const shift = -4.2 + i * 1.7;
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 7.8), materials.white);
        stripe.name = 'crosswalk-stripe';
        stripe.position.set(
          intersection.center.x + placement.x + (placement.horizontal ? shift : 0),
          0.14,
          intersection.center.z + placement.z + (placement.horizontal ? 0 : shift),
        );
        stripe.rotation.y = placement.horizontal ? Math.PI / 2 : 0;
        group.add(stripe);
      }
    }

    return group;
  }
}

function distance(start: { x: number; z: number }, end: { x: number; z: number }): number {
  return Math.hypot(end.x - start.x, end.z - start.z);
}
