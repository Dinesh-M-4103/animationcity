import * as THREE from 'three';
import type { SelectableInfo } from '../../types/Selectable';
import type { VehicleDefinition, VehicleState } from '../../types/Vehicle';
import type { VehicleRoute } from '../traffic/RouteManager';

const shared = {
  body: new THREE.BoxGeometry(1, 1, 1),
  wheel: new THREE.CylinderGeometry(0.28, 0.28, 0.24, 14),
};

const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.82 });
const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x263f4b, roughness: 0.25, metalness: 0.08 });

export class Vehicle {
  readonly object = new THREE.Group();
  readonly definition: VehicleDefinition;
  readonly route: VehicleRoute;
  readonly length: number;
  speed = 0;
  state: VehicleState = 'MOVING';
  progress = 0;
  private segmentIndex = 0;
  private active = false;
  private startTimer = 0;

  constructor(definition: VehicleDefinition, route: VehicleRoute) {
    this.definition = definition;
    this.route = route;
    this.length = definition.type === 'Bus' ? 7.2 : definition.type === 'Van' ? 5.2 : definition.type === 'SUV' ? 4.8 : 4.2;

    this.object.name = definition.id;
    this.object.userData.selectable = this.createSelectableInfo();
    this.object.traverse((child) => {
      child.userData.selectableRoot = this.object;
    });
    this.object.add(this.createMesh());
    this.reset();
  }

  reset(): void {
    this.segmentIndex = 0;
    this.progress = 0;
    this.speed = 0;
    this.startTimer = 0;
    this.active = false;
    this.state = 'MOVING';
    this.object.visible = false;
    this.placeAt(this.route.points[0], this.route.points[1]);
  }

  update(
    deltaSeconds: number,
    desiredSpeed: number,
    leadingVehicleDistance: number,
  ): void {
    this.startTimer += deltaSeconds;
    if (!this.active) {
      if (this.startTimer < this.definition.startDelay) return;
      this.active = true;
      this.object.visible = true;
    }

    if (leadingVehicleDistance < 6.5) {
      desiredSpeed = Math.min(desiredSpeed, Math.max(0, leadingVehicleDistance - 3.5));
      this.state = 'FOLLOWING';
    }

    const acceleration = desiredSpeed > this.speed ? 5.8 : 8.5;
    this.speed = THREE.MathUtils.damp(this.speed, desiredSpeed, acceleration, deltaSeconds);
    this.advance(deltaSeconds);
    this.object.userData.selectable = this.createSelectableInfo();
  }

  isApproachingStop(): boolean {
    return this.segmentIndex === 0;
  }

  distanceToStopPoint(): number {
    return this.object.position.distanceTo(this.route.points[this.route.stopPointIndex]);
  }

  hasClearedIntersection(): boolean {
    return this.segmentIndex > this.route.stopPointIndex + 1;
  }

  private advance(deltaSeconds: number): void {
    let distance = this.speed * deltaSeconds;

    while (distance > 0 && this.segmentIndex < this.route.points.length - 1) {
      const start = this.route.points[this.segmentIndex];
      const end = this.route.points[this.segmentIndex + 1];
      const segmentLength = start.distanceTo(end);
      const currentDistance = this.progress * segmentLength;
      const remaining = segmentLength - currentDistance;

      if (distance < remaining) {
        this.progress = (currentDistance + distance) / segmentLength;
        this.placeAt(start.clone().lerp(end, this.progress), end);
        distance = 0;
      } else {
        distance -= remaining;
        this.segmentIndex += 1;
        this.progress = 0;
      }
    }

    if (this.segmentIndex >= this.route.points.length - 1) {
      this.reset();
    }
  }

  private placeAt(position: THREE.Vector3, lookAt: THREE.Vector3): void {
    this.object.position.copy(position);
    const dx = lookAt.x - position.x;
    const dz = lookAt.z - position.z;
    this.object.rotation.y = Math.atan2(dx, dz);
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.definition.color, roughness: 0.48, metalness: 0.08 });
    const dimensions = this.getDimensions();

    const body = new THREE.Mesh(shared.body, bodyMaterial);
    body.scale.set(dimensions.width, dimensions.height, dimensions.length);
    body.position.y = dimensions.height * 0.5;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(shared.body, glassMaterial);
    cabin.scale.set(dimensions.width * 0.75, dimensions.height * 0.55, dimensions.length * 0.42);
    cabin.position.set(0, dimensions.height + 0.22, -dimensions.length * 0.05);
    cabin.castShadow = true;
    group.add(cabin);

    for (const x of [-dimensions.width * 0.52, dimensions.width * 0.52]) {
      for (const z of [-dimensions.length * 0.32, dimensions.length * 0.32]) {
        const wheel = new THREE.Mesh(shared.wheel, tireMaterial);
        wheel.position.set(x, 0.3, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        group.add(wheel);
      }
    }

    return group;
  }

  private getDimensions(): { width: number; height: number; length: number } {
    if (this.definition.type === 'Bus') return { width: 2.4, height: 1.9, length: 7.2 };
    if (this.definition.type === 'Van') return { width: 2.2, height: 1.65, length: 5.2 };
    if (this.definition.type === 'SUV') return { width: 2.15, height: 1.45, length: 4.8 };
    return { width: 1.9, height: 1.25, length: 4.2 };
  }

  private createSelectableInfo(): SelectableInfo {
    return {
      id: this.definition.id,
      type: 'vehicle',
      title: this.definition.id.toUpperCase(),
      details: {
        Type: this.definition.type,
        Speed: `${Math.round(this.speed * 3.6)} km/h`,
        Lane: this.route.startLaneId,
        State: this.state,
        Destination: this.route.destinationRoadId,
      },
    };
  }
}
