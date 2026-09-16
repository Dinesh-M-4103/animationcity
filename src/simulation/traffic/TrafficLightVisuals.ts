import * as THREE from 'three';
import type { TrafficLightDefinition, TrafficLightState } from '../../types/Traffic';
import { TrafficLightController } from './TrafficLightController';

const materials = {
  pole: new THREE.MeshStandardMaterial({ color: 0x252b2e, roughness: 0.45, metalness: 0.32 }),
  housing: new THREE.MeshStandardMaterial({ color: 0x171b1d, roughness: 0.5, metalness: 0.18 }),
  red: new THREE.MeshStandardMaterial({ color: 0x3a0d0d, emissive: 0x220000, roughness: 0.3 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0x3b3008, emissive: 0x241800, roughness: 0.3 }),
  green: new THREE.MeshStandardMaterial({ color: 0x0b331a, emissive: 0x001e0b, roughness: 0.3 }),
};

const activeColors: Record<TrafficLightState, number> = {
  RED: 0xff3535,
  YELLOW: 0xffd44a,
  GREEN: 0x40ff7a,
};

export class TrafficLightVisuals {
  readonly object = new THREE.Group();
  private readonly lenses = new Map<string, Record<TrafficLightState, THREE.Mesh>>();

  constructor(
    definitions: TrafficLightDefinition[],
    private readonly controller: TrafficLightController,
  ) {
    this.object.name = 'TrafficLights';
    for (const definition of definitions) {
      this.object.add(this.createSignal(definition));
    }
  }

  update(): void {
    for (const [id, lenses] of this.lenses) {
      const signal = this.object.getObjectByName(id);
      const definition = signal?.userData.definition as TrafficLightDefinition | undefined;
      if (!definition) continue;
      const active = this.controller.getStateForAxis(definition.axis);

      for (const state of ['RED', 'YELLOW', 'GREEN'] as const) {
        const material = lenses[state].material as THREE.MeshStandardMaterial;
        if (state === active) {
          material.color.setHex(activeColors[state]);
          material.emissive.setHex(activeColors[state]);
          material.emissiveIntensity = 1.25;
        } else {
          const base = materials[state.toLowerCase() as Lowercase<TrafficLightState>] as THREE.MeshStandardMaterial;
          material.color.copy(base.color);
          material.emissive.copy(base.emissive);
          material.emissiveIntensity = 0.2;
        }
      }
    }
  }

  private createSignal(definition: TrafficLightDefinition): THREE.Group {
    const group = new THREE.Group();
    group.name = definition.id;
    group.position.set(definition.x, 0, definition.z);
    group.rotation.y = definition.rotationY;
    group.userData.definition = definition;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.2, 12), materials.pole);
    pole.position.y = 2.6;
    pole.castShadow = true;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.14), materials.pole);
    arm.position.set(0, 5.0, -0.95);
    arm.castShadow = true;
    group.add(arm);

    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.95, 0.42), materials.housing);
    housing.position.set(0, 4.75, -2.0);
    housing.castShadow = true;
    group.add(housing);

    const lenses = {
      RED: this.createLens(0.55, materials.red.clone()),
      YELLOW: this.createLens(0, materials.yellow.clone()),
      GREEN: this.createLens(-0.55, materials.green.clone()),
    };

    for (const lens of Object.values(lenses)) {
      group.add(lens);
    }
    this.lenses.set(definition.id, lenses);

    return group;
  }

  private createLens(yOffset: number, material: THREE.MeshStandardMaterial): THREE.Mesh {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 10), material);
    lens.position.set(0, 4.75 + yOffset, -2.23);
    return lens;
  }
}
