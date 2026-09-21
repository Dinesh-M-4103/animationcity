import * as THREE from 'three';
import type { PedestrianSignalController } from './PedestrianSignalController';

interface SignalFixture {
  group: THREE.Group;
  crosswalkId: string;
  dontWalkLens: THREE.Mesh;
  walkLens: THREE.Mesh;
}

const materials = {
  pole: new THREE.MeshStandardMaterial({ color: 0x222629, roughness: 0.5, metalness: 0.2 }),
  box: new THREE.MeshStandardMaterial({ color: 0x161a1c, roughness: 0.4, metalness: 0.1 }),
  visor: new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 0.6 }),
  dontWalkOff: new THREE.MeshStandardMaterial({ color: 0x3a0d0d, emissive: 0x220000, roughness: 0.3 }),
  walkOff: new THREE.MeshStandardMaterial({ color: 0x0f291e, emissive: 0x05120a, roughness: 0.3 }),
};

export class PedestrianSignalVisuals {
  readonly object = new THREE.Group();
  private readonly fixtures: SignalFixture[] = [];

  constructor(private readonly signalController: PedestrianSignalController) {
    this.object.name = 'PedestrianSignals';

    // 4 Corner pedestals positioned at crosswalk waiting areas
    const configs = [
      { x: -9.2, z: -8.0, rotY: 0, crosswalkId: 'crosswalk-north' },
      { x: 9.2, z: -8.0, rotY: Math.PI, crosswalkId: 'crosswalk-north' },
      { x: -9.2, z: 8.0, rotY: 0, crosswalkId: 'crosswalk-south' },
      { x: 9.2, z: 8.0, rotY: Math.PI, crosswalkId: 'crosswalk-south' },
      { x: -8.0, z: -9.2, rotY: Math.PI * 0.5, crosswalkId: 'crosswalk-west' },
      { x: -8.0, z: 9.2, rotY: -Math.PI * 0.5, crosswalkId: 'crosswalk-west' },
      { x: 8.0, z: -9.2, rotY: Math.PI * 0.5, crosswalkId: 'crosswalk-east' },
      { x: 8.0, z: 9.2, rotY: -Math.PI * 0.5, crosswalkId: 'crosswalk-east' },
    ];

    for (const cfg of configs) {
      const fixture = this.createPedestrianSignal(cfg.x, cfg.z, cfg.rotY, cfg.crosswalkId);
      this.fixtures.push(fixture);
      this.object.add(fixture.group);
    }

    this.update();
  }

  update(): void {
    for (const fixture of this.fixtures) {
      const state = this.signalController.getSignalState(fixture.crosswalkId);
      const isWalk = state === 'WALK';

      const dwMat = fixture.dontWalkLens.material as THREE.MeshStandardMaterial;
      const wMat = fixture.walkLens.material as THREE.MeshStandardMaterial;

      if (isWalk) {
        // WALK active: Bottom lens glows bright white-green, top is dim
        dwMat.color.setHex(0x3a0d0d);
        dwMat.emissive.setHex(0x220000);
        dwMat.emissiveIntensity = 0.2;

        wMat.color.setHex(0xd0ffea);
        wMat.emissive.setHex(0x55ffaa);
        wMat.emissiveIntensity = 1.35;
      } else {
        // DONT_WALK active: Top lens glows bright orange-red, bottom is dim
        dwMat.color.setHex(0xff3b30);
        dwMat.emissive.setHex(0xff3322);
        dwMat.emissiveIntensity = 1.35;

        wMat.color.setHex(0x0f291e);
        wMat.emissive.setHex(0x05120a);
        wMat.emissiveIntensity = 0.2;
      }
    }
  }

  private createPedestrianSignal(x: number, z: number, rotY: number, crosswalkId: string): SignalFixture {
    const group = new THREE.Group();
    group.name = `ped-signal-${crosswalkId}`;
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 10), materials.pole);
    pole.position.y = 1.3;
    pole.castShadow = true;
    group.add(pole);

    // Box housing
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.24), materials.box);
    box.position.set(0, 2.25, 0.12);
    box.castShadow = true;
    group.add(box);

    // Sun visors
    for (const yOffset of [0.13, -0.13]) {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.14), materials.visor);
      visor.position.set(0, 2.25 + yOffset + 0.11, 0.24);
      group.add(visor);
    }

    // Top lens (DON'T WALK)
    const dwLensMat = materials.dontWalkOff.clone();
    const dontWalkLens = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), dwLensMat);
    dontWalkLens.position.set(0, 2.25 + 0.13, 0.245);
    group.add(dontWalkLens);

    // Bottom lens (WALK)
    const wLensMat = materials.walkOff.clone();
    const walkLens = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), wLensMat);
    walkLens.position.set(0, 2.25 - 0.13, 0.245);
    group.add(walkLens);

    return {
      group,
      crosswalkId,
      dontWalkLens,
      walkLens,
    };
  }
}
