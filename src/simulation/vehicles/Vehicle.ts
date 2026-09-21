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
  definition: VehicleDefinition;
  route: VehicleRoute;
  readonly length: number;
  speed = 0;
  state: VehicleState = 'MOVING';
  progress = 0;
  segmentIndex = 0;
  active = false;
  private cumulativeDistances: number[] = [];
  private totalRouteLength = 0;

  constructor(definition: VehicleDefinition, route: VehicleRoute) {
    this.definition = definition;
    this.route = route;
    this.length = definition.type === 'Bus' ? 7.2 : definition.type === 'Van' ? 5.2 : definition.type === 'SUV' ? 4.8 : 4.2;

    this.object.name = definition.id;
    this.object.add(this.createMesh());
    this.object.userData.selectable = this.createSelectableInfo();
    this.object.traverse((child) => {
      child.userData.selectableRoot = this.object;
    });

    this.setRoute(route);
    this.despawn();
  }

  setRoute(route: VehicleRoute): void {
    this.route = route;
    this.cumulativeDistances = [0];
    let sum = 0;
    for (let i = 0; i < route.points.length - 1; i++) {
      sum += route.points[i].distanceTo(route.points[i + 1]);
      this.cumulativeDistances.push(sum);
    }
    this.totalRouteLength = sum;
  }

  spawn(route: VehicleRoute): void {
    this.setRoute(route);
    this.segmentIndex = 0;
    this.progress = 0;
    this.speed = 0;
    this.active = true;
    this.state = 'MOVING';
    this.object.visible = true;

    const start = this.route.points[0];
    const initialHeading = this.route.headings[0] ?? 0;
    this.object.position.copy(start);
    this.object.rotation.y = initialHeading;
    this.object.userData.selectable = this.createSelectableInfo();
  }

  despawn(): void {
    this.active = false;
    this.object.visible = false;
    this.speed = 0;
    this.state = 'MOVING';
    this.segmentIndex = 0;
    this.progress = 0;
  }

  update(
    deltaSeconds: number,
    desiredSpeed: number,
    leadingVehicleGap: number,
  ): void {
    if (!this.active || deltaSeconds <= 0) return;

    // Following logic: smoothly adjust desired speed based on distance to car ahead
    if (leadingVehicleGap < 14.0) {
      if (leadingVehicleGap <= 2.2) {
        desiredSpeed = 0;
        if (this.state !== 'WAITING_FOR_LIGHT' && this.state !== 'YIELDING') {
          this.state = 'FOLLOWING';
        }
      } else {
        // Safe buffer: target speed proportional to gap beyond safe stopping margin
        const safeMargin = 3.2 + this.speed * 0.45;
        const availableSpace = Math.max(0, leadingVehicleGap - safeMargin);
        const followingMaxSpeed = availableSpace * 1.8;
        if (followingMaxSpeed < desiredSpeed) {
          desiredSpeed = followingMaxSpeed;
          if (this.state !== 'WAITING_FOR_LIGHT' && this.state !== 'YIELDING' && this.state !== 'SLOWING_FOR_YELLOW') {
            this.state = 'FOLLOWING';
          }
        }
      }
    }

    // Dynamic acceleration / braking
    const isBraking = desiredSpeed < this.speed;
    const accelRate = isBraking ? 7.5 : 4.8;
    this.speed = THREE.MathUtils.damp(this.speed, desiredSpeed, accelRate, deltaSeconds);

    if (this.speed < 0.05 && desiredSpeed === 0) {
      this.speed = 0;
    }

    this.advance(deltaSeconds);
    this.object.userData.selectable = this.createSelectableInfo();
  }

  getTraveledDistance(): number {
    if (!this.active || this.segmentIndex >= this.cumulativeDistances.length - 1) {
      return this.totalRouteLength;
    }
    const segStartDist = this.cumulativeDistances[this.segmentIndex] ?? 0;
    const nextDist = this.cumulativeDistances[this.segmentIndex + 1] ?? segStartDist;
    const segLength = nextDist - segStartDist;
    return segStartDist + this.progress * segLength;
  }

  isApproachingStop(): boolean {
    return this.segmentIndex < this.route.stopPointIndex;
  }

  distanceToStopLine(): number {
    const stopDist = this.cumulativeDistances[this.route.stopPointIndex] ?? 0;
    return Math.max(0, stopDist - this.getTraveledDistance());
  }

  isInsideIntersection(): boolean {
    return (
      this.segmentIndex >= this.route.stopPointIndex &&
      this.segmentIndex < this.route.intersectionEndIndex
    );
  }

  hasClearedIntersection(): boolean {
    return this.segmentIndex >= this.route.intersectionEndIndex;
  }

  isCompleted(): boolean {
    return this.segmentIndex >= this.route.points.length - 1;
  }

  getCurrentLaneId(): string {
    if (this.segmentIndex < this.route.stopPointIndex) {
      return this.route.startLaneId;
    }
    if (this.segmentIndex < this.route.intersectionEndIndex) {
      return 'intersection';
    }
    return this.route.destinationLaneId;
  }

  getDistanceAlongCurrentLane(): number {
    const traveled = this.getTraveledDistance();
    if (this.segmentIndex < this.route.stopPointIndex) {
      return traveled;
    }
    if (this.segmentIndex < this.route.intersectionEndIndex) {
      const stopDist = this.cumulativeDistances[this.route.stopPointIndex] ?? 0;
      return traveled - stopDist;
    }
    const exitDist = this.cumulativeDistances[this.route.intersectionEndIndex] ?? 0;
    return traveled - exitDist;
  }

  private advance(deltaSeconds: number): void {
    let distanceToMove = this.speed * deltaSeconds;

    while (distanceToMove > 0 && this.segmentIndex < this.route.points.length - 1) {
      const p0 = this.route.points[this.segmentIndex];
      const p1 = this.route.points[this.segmentIndex + 1];
      const segLength = p0.distanceTo(p1);
      const currentPosOnSeg = this.progress * segLength;
      const remainingSeg = segLength - currentPosOnSeg;

      if (distanceToMove < remainingSeg) {
        this.progress = (currentPosOnSeg + distanceToMove) / Math.max(0.001, segLength);
        this.updatePositionAndHeading(p0, p1);
        distanceToMove = 0;
      } else {
        distanceToMove -= remainingSeg;
        this.segmentIndex += 1;
        this.progress = 0;
        if (this.segmentIndex >= this.route.points.length - 1) {
          const finalPoint = this.route.points[this.route.points.length - 1];
          this.object.position.copy(finalPoint);
          distanceToMove = 0;
        }
      }
    }
  }

  private updatePositionAndHeading(p0: THREE.Vector3, p1: THREE.Vector3): void {
    // Smooth position interpolation along spline segment
    this.object.position.lerpVectors(p0, p1, this.progress);

    // Smooth heading rotation interpolation
    const h0 = this.route.headings[this.segmentIndex] ?? 0;
    const h1 = this.route.headings[Math.min(this.segmentIndex + 1, this.route.headings.length - 1)] ?? h0;
    this.object.rotation.y = lerpAngle(h0, h1, this.progress);
  }

  private createMesh(): THREE.Group {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.48,
      metalness: 0.08,
    });
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
        Lane: this.getCurrentLaneId(),
        State: this.state,
        Destination: this.route.destinationRoadId,
      },
    };
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = (b - a) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return a + diff * t;
}

