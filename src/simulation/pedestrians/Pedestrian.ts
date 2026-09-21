import * as THREE from 'three';
import type { SelectableInfo } from '../../types/Selectable';
import type { PedestrianDefinition, PedestrianState, SidewalkNode } from '../../types/Pedestrian';
import type { PedestrianSignalController } from './PedestrianSignalController';
import type { PedestrianNavigation } from './PedestrianNavigation';

const sharedGeometries = {
  head: new THREE.SphereGeometry(0.16, 12, 10),
  hair: new THREE.BoxGeometry(0.24, 0.1, 0.24),
  torso: new THREE.BoxGeometry(0.32, 0.52, 0.2),
  arm: new THREE.BoxGeometry(0.1, 0.44, 0.1),
  leg: new THREE.BoxGeometry(0.11, 0.5, 0.11),
};

export class Pedestrian {
  readonly object = new THREE.Group();
  definition: PedestrianDefinition;
  currentState: PedestrianState = 'WALKING';
  active = false;
  currentSpeed = 0;
  destinationNode: SidewalkNode | null = null;
  pathNodeIds: string[] = [];
  waypoints: THREE.Vector3[] = [];
  targetIndex = 0;
  tripCompleted = false;
  private currentCrosswalkId: string | null = null;
  private dwellTimer = 0;
  private walkCycle = 0;

  // Rig joint nodes
  private readonly torsoMesh: THREE.Mesh;
  private readonly leftArmPivot = new THREE.Group();
  private readonly rightArmPivot = new THREE.Group();
  private readonly leftLegPivot = new THREE.Group();
  private readonly rightLegPivot = new THREE.Group();

  constructor(definition: PedestrianDefinition) {
    this.definition = definition;
    this.object.name = definition.id;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: definition.skinColor, roughness: 0.72 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: definition.shirtColor, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: definition.pantsColor, roughness: 0.85 });
    const hairMat = new THREE.MeshStandardMaterial({ color: definition.hairColor, roughness: 0.9 });

    // Rig hierarchy
    // 1. Torso
    this.torsoMesh = new THREE.Mesh(sharedGeometries.torso, shirtMat);
    this.torsoMesh.position.y = 0.78;
    this.torsoMesh.castShadow = true;
    this.object.add(this.torsoMesh);

    // 2. Head & Hair
    const headMesh = new THREE.Mesh(sharedGeometries.head, skinMat);
    headMesh.position.y = 1.18;
    headMesh.castShadow = true;
    this.object.add(headMesh);

    const hairMesh = new THREE.Mesh(sharedGeometries.hair, hairMat);
    hairMesh.position.set(0, 1.25, -0.02);
    this.object.add(hairMesh);

    // 3. Arms
    this.leftArmPivot.position.set(-0.22, 1.0, 0);
    const leftArmMesh = new THREE.Mesh(sharedGeometries.arm, shirtMat);
    leftArmMesh.position.y = -0.22;
    leftArmMesh.castShadow = true;
    this.leftArmPivot.add(leftArmMesh);
    this.object.add(this.leftArmPivot);

    this.rightArmPivot.position.set(0.22, 1.0, 0);
    const rightArmMesh = new THREE.Mesh(sharedGeometries.arm, shirtMat);
    rightArmMesh.position.y = -0.22;
    rightArmMesh.castShadow = true;
    this.rightArmPivot.add(rightArmMesh);
    this.object.add(this.rightArmPivot);

    // 4. Legs
    this.leftLegPivot.position.set(-0.1, 0.52, 0);
    const leftLegMesh = new THREE.Mesh(sharedGeometries.leg, pantsMat);
    leftLegMesh.position.y = -0.25;
    leftLegMesh.castShadow = true;
    this.leftLegPivot.add(leftLegMesh);
    this.object.add(this.leftLegPivot);

    this.rightLegPivot.position.set(0.1, 0.52, 0);
    const rightLegMesh = new THREE.Mesh(sharedGeometries.leg, pantsMat);
    rightLegMesh.position.y = -0.25;
    rightLegMesh.castShadow = true;
    this.rightLegPivot.add(rightLegMesh);
    this.object.add(this.rightLegPivot);

    this.object.scale.setScalar(definition.heightScale);
    this.object.userData.selectable = this.createSelectableInfo();
    this.object.traverse((child) => {
      child.userData.selectableRoot = this.object;
    });

    this.despawn();
  }

  spawn(startNode: SidewalkNode, destNode: SidewalkNode, nav: PedestrianNavigation): void {
    this.active = true;
    this.object.visible = true;
    this.destinationNode = destNode;
    this.currentState = 'WALKING';
    this.currentSpeed = 0;
    this.dwellTimer = 0;
    this.currentCrosswalkId = null;

    this.setNavigationPath(startNode.id, destNode.id, nav);

    this.object.position.set(startNode.x, 0.16, startNode.z);
    if (this.waypoints.length > 1) {
      const p1 = this.waypoints[1];
      this.object.rotation.y = Math.atan2(p1.x - startNode.x, p1.z - startNode.z);
    }

    this.object.userData.selectable = this.createSelectableInfo();
  }

  despawn(): void {
    this.active = false;
    this.object.visible = false;
    this.currentSpeed = 0;
    this.currentState = 'IDLE';
    this.pathNodeIds = [];
    this.waypoints = [];
    this.targetIndex = 0;
    this.tripCompleted = false;
  }

  setNavigationPath(startNodeId: string, destNodeId: string, nav: PedestrianNavigation): void {
    this.pathNodeIds = nav.findPath(startNodeId, destNodeId);
    this.waypoints = nav.getPathWaypoints(this.pathNodeIds);
    this.targetIndex = Math.min(1, this.waypoints.length - 1);
  }

  update(
    deltaSeconds: number,
    signalController: PedestrianSignalController,
    nav: PedestrianNavigation,
    allPedestrians: Pedestrian[],
  ): void {
    if (!this.active || deltaSeconds <= 0) return;

    // 1. Inside building logic (dwelling before exiting)
    if (this.currentState === 'INSIDE_BUILDING') {
      this.dwellTimer += deltaSeconds;
      if (this.dwellTimer >= 5.0) {
        // Exit building and choose another destination
        this.currentState = 'EXITING_BUILDING';
        this.object.visible = true;
        this.dwellTimer = 0;
        const currentEntrance = this.destinationNode;
        const nextDest = nav.getRandomDestination(currentEntrance?.id);
        if (currentEntrance) {
          this.destinationNode = nextDest;
          this.setNavigationPath(currentEntrance.id, nextDest.id, nav);
          this.currentState = 'WALKING';
        }
      }
      return;
    }

    // 2. Waiting at destination or idle
    if (this.currentState === 'WAITING_AT_DESTINATION' || this.currentState === 'IDLE') {
      this.dwellTimer += deltaSeconds;
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, 0, 8, deltaSeconds);
      this.animateWalking(deltaSeconds);

      if (this.dwellTimer >= 3.0) {
        // Pick new random destination
        const currentLoc = this.destinationNode;
        const nextDest = nav.getRandomDestination(currentLoc?.id);
        if (currentLoc) {
          this.destinationNode = nextDest;
          this.setNavigationPath(currentLoc.id, nextDest.id, nav);
          this.currentState = 'WALKING';
          this.dwellTimer = 0;
        }
      }
      this.object.userData.selectable = this.createSelectableInfo();
      return;
    }

    // 3. Waiting at crosswalk
    if (this.currentState === 'WAITING_FOR_CROSSING') {
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, 0, 9, deltaSeconds);
      this.animateWalking(deltaSeconds);

      if (this.currentCrosswalkId && signalController.isWalkPermitted(this.currentCrosswalkId)) {
        this.currentState = 'CROSSING';
      }
      this.object.userData.selectable = this.createSelectableInfo();
      return;
    }

    // 4. Walking or Crossing Navigation
    if (this.waypoints.length === 0 || this.targetIndex >= this.waypoints.length) {
      this.handleDestinationReached();
      return;
    }

    const targetPos = this.waypoints[this.targetIndex];
    const dx = targetPos.x - this.object.position.x;
    const dz = targetPos.z - this.object.position.z;
    const distToTarget = Math.hypot(dx, dz);

    const currentNodeId = this.pathNodeIds[this.targetIndex];
    const currentNode = currentNodeId ? nav.getNode(currentNodeId) : null;

    // Check if target is a crosswalk waiting node and we need to check the signal
    if (
      this.currentState === 'WALKING' &&
      currentNode &&
      currentNode.type === 'CORNER_WAITING' &&
      currentNode.crosswalkId &&
      distToTarget < 1.4
    ) {
      this.currentCrosswalkId = currentNode.crosswalkId;
      if (!signalController.isWalkPermitted(this.currentCrosswalkId)) {
        this.currentState = 'WAITING_FOR_CROSSING';
        this.currentSpeed = 0;
        this.object.userData.selectable = this.createSelectableInfo();
        return;
      }
      // Permitted to cross -> transition to CROSSING
      this.currentState = 'CROSSING';
    }

    // Once pedestrian reaches the other side of a crosswalk (reaches a sidewalk on another block), revert to WALKING
    if (this.currentState === 'CROSSING' && currentNode && currentNode.type === 'SIDEWALK') {
      this.currentState = 'WALKING';
      this.currentCrosswalkId = null;
    }

    // Local steering avoidance against nearby pedestrians
    const avoidance = this.computeLocalAvoidance(allPedestrians);

    // Target movement direction
    const desiredSpeed = this.definition.walkingSpeed;
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, desiredSpeed, 4.5, deltaSeconds);

    const targetHeading = Math.atan2(dx + avoidance.x, dz + avoidance.y);
    this.object.rotation.y = lerpAngle(this.object.rotation.y, targetHeading, deltaSeconds * 6);

    const moveStep = this.currentSpeed * deltaSeconds;
    this.object.position.x += Math.sin(this.object.rotation.y) * moveStep;
    this.object.position.z += Math.cos(this.object.rotation.y) * moveStep;

    // Check if reached waypoint
    if (distToTarget < 0.6) {
      this.targetIndex += 1;
      if (this.targetIndex >= this.waypoints.length) {
        this.handleDestinationReached();
      }
    }

    this.animateWalking(deltaSeconds);
    this.object.userData.selectable = this.createSelectableInfo();
  }

  private handleDestinationReached(): void {
    this.tripCompleted = true;
    if (this.destinationNode?.type === 'BUILDING_ENTRANCE') {
      // Enter building: hide mesh and dwell inside
      this.currentState = 'INSIDE_BUILDING';
      this.object.visible = false;
      this.dwellTimer = 0;
    } else {
      // Reached open area or bench: idle for a moment
      this.currentState = 'WAITING_AT_DESTINATION';
      this.dwellTimer = 0;
    }
  }

  private computeLocalAvoidance(neighbors: Pedestrian[]): THREE.Vector2 {
    const avoid = new THREE.Vector2(0, 0);
    const myPos = this.object.position;
    const personalRadius = 1.0;

    for (const other of neighbors) {
      if (other === this || !other.active || other.currentState === 'INSIDE_BUILDING') continue;
      const ox = other.object.position.x - myPos.x;
      const oz = other.object.position.z - myPos.z;
      const dist = Math.hypot(ox, oz);

      if (dist > 0.05 && dist < personalRadius) {
        const strength = (personalRadius - dist) / personalRadius;
        // Push sideways perpendicular to direction of other
        avoid.x -= (ox / dist) * strength * 1.2;
        avoid.y -= (oz / dist) * strength * 1.2;
      }
    }
    return avoid;
  }

  private animateWalking(deltaSeconds: number): void {
    if (this.currentSpeed > 0.08) {
      this.walkCycle += deltaSeconds * this.currentSpeed * 6.8;
      const legAngle = Math.sin(this.walkCycle) * 0.62;
      const armAngle = Math.sin(this.walkCycle) * 0.52;

      this.leftLegPivot.rotation.x = legAngle;
      this.rightLegPivot.rotation.x = -legAngle;
      this.leftArmPivot.rotation.x = -armAngle;
      this.rightArmPivot.rotation.x = armAngle;

      // Vertical bounce
      this.torsoMesh.position.y = 0.78 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.025;
    } else {
      // Return to neutral standing pose
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0, 8, deltaSeconds);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0, 8, deltaSeconds);
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, 0, 8, deltaSeconds);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, 0, 8, deltaSeconds);
      this.torsoMesh.position.y = THREE.MathUtils.damp(this.torsoMesh.position.y, 0.78, 8, deltaSeconds);
    }
  }

  private createSelectableInfo(): SelectableInfo {
    return {
      id: this.definition.id,
      type: 'pedestrian',
      title: `PEDESTRIAN ${this.definition.id.replace('pedestrian-', '')}`,
      details: {
        Type: this.definition.type,
        Speed: `${(this.currentSpeed).toFixed(1)} m/s`,
        State: this.currentState,
        Destination: this.destinationNode ? this.destinationNode.id : 'None',
        Path: this.pathNodeIds.length > 0 ? `${this.pathNodeIds[0]} -> ${this.pathNodeIds[this.pathNodeIds.length - 1]}` : 'None',
        Crossing: this.currentState === 'CROSSING' ? 'YES' : 'NO',
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
