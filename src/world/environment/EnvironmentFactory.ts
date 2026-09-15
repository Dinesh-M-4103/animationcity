import * as THREE from 'three';
import { CITY_SCALE, COLORS } from '../../config/constants';

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.92 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: COLORS.sidewalk, roughness: 0.82 }),
  curb: new THREE.MeshStandardMaterial({ color: COLORS.curb, roughness: 0.8 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x75513d, roughness: 0.82 }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x3f7a4d, roughness: 0.78 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x2d3438, roughness: 0.46, metalness: 0.28 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xffe6aa, emissive: 0x7d5420, roughness: 0.25 }),
};

export class EnvironmentFactory {
  createGround(): THREE.Object3D {
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(CITY_SCALE.groundSize, 0.08, CITY_SCALE.groundSize),
      materials.grass,
    );
    ground.name = 'GroundTerrain';
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    return ground;
  }

  createSidewalkPlazas(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SidewalksAndCurbs';

    const sidewalkRects = [
      { x: -38, z: -38, w: 58, d: 58 },
      { x: 38, z: -38, w: 58, d: 58 },
      { x: -38, z: 38, w: 58, d: 58 },
      { x: 38, z: 38, w: 58, d: 58 },
    ];

    for (const rect of sidewalkRects) {
      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(rect.w, 0.16, rect.d), materials.sidewalk);
      sidewalk.name = 'sidewalk-plaza';
      sidewalk.position.set(rect.x, 0.04, rect.z);
      sidewalk.receiveShadow = true;
      group.add(sidewalk);
    }

    const curbRects = [
      { x: -38, z: -7.25, w: 58, d: CITY_SCALE.curbWidth },
      { x: 38, z: -7.25, w: 58, d: CITY_SCALE.curbWidth },
      { x: -38, z: 7.25, w: 58, d: CITY_SCALE.curbWidth },
      { x: 38, z: 7.25, w: 58, d: CITY_SCALE.curbWidth },
      { x: -7.25, z: -38, w: CITY_SCALE.curbWidth, d: 58 },
      { x: -7.25, z: 38, w: CITY_SCALE.curbWidth, d: 58 },
      { x: 7.25, z: -38, w: CITY_SCALE.curbWidth, d: 58 },
      { x: 7.25, z: 38, w: CITY_SCALE.curbWidth, d: 58 },
    ];

    for (const rect of curbRects) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(rect.w, CITY_SCALE.curbHeight, rect.d), materials.curb);
      curb.name = 'curb';
      curb.position.set(rect.x, 0.18, rect.z);
      curb.castShadow = true;
      curb.receiveShadow = true;
      group.add(curb);
    }

    return group;
  }

  createStreetLights(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StreetLights';
    const positions = [
      [-12, -12], [12, -12], [-12, 12], [12, 12],
      [-58, -10], [58, -10], [-58, 10], [58, 10],
      [-10, -58], [10, -58], [-10, 58], [10, 58],
    ];

    for (const [x, z] of positions) {
      group.add(this.createStreetLight(x, z));
    }

    return group;
  }

  createTrees(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Trees';
    const positions = [
      [-20, -58], [-44, -58], [23, -58], [48, -56],
      [-22, 58], [-48, 56], [22, 58], [48, 56],
      [-58, -22], [-58, 22], [58, -22], [58, 22],
    ];

    for (const [x, z] of positions) {
      group.add(this.createTree(x, z));
    }

    return group;
  }

  createStreetProps(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StreetProps';

    const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x82664a, roughness: 0.72 });
    for (const [x, z, rot] of [[-16, -15, 0], [16, 15, Math.PI], [-15, 16, Math.PI / 2], [15, -16, -Math.PI / 2]] as const) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.45, 1.0), benchMaterial);
      bench.name = 'bench';
      bench.position.set(x, 0.65, z);
      bench.rotation.y = rot;
      bench.castShadow = true;
      group.add(bench);
    }

    return group;
  }

  private createStreetLight(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'street-light';

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 5.8, 12), materials.metal);
    pole.position.set(x, 2.9, z);
    pole.castShadow = true;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), materials.metal);
    arm.position.set(x + Math.sign(x || 1) * 0.85, 5.6, z);
    arm.castShadow = true;
    group.add(arm);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 8), materials.lamp);
    lamp.position.set(x + Math.sign(x || 1) * 1.85, 5.45, z);
    group.add(lamp);

    const light = new THREE.PointLight(0xffdba0, 0.65, 20, 2);
    light.position.copy(lamp.position);
    group.add(light);

    return group;
  }

  private createTree(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tree';

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 2.4, 10), materials.trunk);
    trunk.position.set(x, 1.2, z);
    trunk.castShadow = true;
    group.add(trunk);

    const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), materials.leaves);
    canopy.position.set(x, 3.15, z);
    canopy.scale.set(1.15, 1.0, 1.15);
    canopy.castShadow = true;
    group.add(canopy);

    return group;
  }
}
