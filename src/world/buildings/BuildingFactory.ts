import * as THREE from 'three';
import type { BuildingLot } from '../../data/cityBlockData';
import type { SelectableInfo } from '../../types/Selectable';

const reusable = {
  box: new THREE.BoxGeometry(1, 1, 1),
  window: new THREE.BoxGeometry(1, 1, 0.08),
  door: new THREE.BoxGeometry(2.4, 3.2, 0.12),
};

const styleMaterials = {
  brick: new THREE.MeshStandardMaterial({ color: 0x8d5146, roughness: 0.78 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x5b7888, roughness: 0.28, metalness: 0.08 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x8d9088, roughness: 0.72 }),
  mixed: new THREE.MeshStandardMaterial({ color: 0x60706d, roughness: 0.58 }),
};

const windowMaterials = {
  warm: new THREE.MeshStandardMaterial({ color: 0xffd88a, emissive: 0x4b2a08, roughness: 0.32 }),
  cool: new THREE.MeshStandardMaterial({ color: 0x8fc8dd, emissive: 0x102d38, roughness: 0.25 }),
};

export class BuildingFactory {
  createBuilding(lot: BuildingLot): THREE.Group {
    const group = new THREE.Group();
    group.name = lot.id;

    const height = lot.floors * 3.4 + (lot.style === 'glass' ? 2 : 0);
    const base = new THREE.Mesh(reusable.box, styleMaterials[lot.style]);
    base.scale.set(lot.width, height, lot.depth);
    base.position.set(lot.x, height / 2, lot.z);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    this.addWindows(group, lot, height);
    this.addEntrance(group, lot);
    this.addRooftop(group, lot, height);

    const info: SelectableInfo = {
      id: lot.id,
      type: 'building',
      title: lot.id.replace(/-/g, ' ').toUpperCase(),
      details: {
        Floors: lot.floors,
        Style: lot.style,
        Footprint: `${lot.width}m x ${lot.depth}m`,
      },
    };

    group.userData.selectable = info;
    group.traverse((child) => {
      child.userData.selectableRoot = group;
    });

    return group;
  }

  private addWindows(group: THREE.Group, lot: BuildingLot, height: number): void {
    const rows = Math.max(2, lot.floors);
    const colsX = Math.max(2, Math.floor(lot.width / 3.2));
    const colsZ = Math.max(2, Math.floor(lot.depth / 3.2));
    const matrix = new THREE.Matrix4();
    const material = lot.style === 'brick' || lot.style === 'stone' ? windowMaterials.warm : windowMaterials.cool;

    const windows = new THREE.InstancedMesh(reusable.window, material, rows * (colsX + colsZ) * 2);
    windows.name = `${lot.id}-windows`;
    let index = 0;

    for (let row = 0; row < rows; row += 1) {
      const y = 3 + row * 3.15;
      if (y > height - 1.8) continue;

      for (let col = 0; col < colsX; col += 1) {
        const x = lot.x - lot.width * 0.36 + (col / Math.max(1, colsX - 1)) * lot.width * 0.72;
        matrix.compose(
          new THREE.Vector3(x, y, lot.z - lot.depth / 2 - 0.04),
          new THREE.Quaternion(),
          new THREE.Vector3(1.25, 1.45, 1),
        );
        windows.setMatrixAt(index, matrix);
        index += 1;

        matrix.compose(
          new THREE.Vector3(x, y, lot.z + lot.depth / 2 + 0.04),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
          new THREE.Vector3(1.25, 1.45, 1),
        );
        windows.setMatrixAt(index, matrix);
        index += 1;
      }

      for (let col = 0; col < colsZ; col += 1) {
        const z = lot.z - lot.depth * 0.34 + (col / Math.max(1, colsZ - 1)) * lot.depth * 0.68;
        matrix.compose(
          new THREE.Vector3(lot.x - lot.width / 2 - 0.04, y, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
          new THREE.Vector3(1.25, 1.45, 1),
        );
        windows.setMatrixAt(index, matrix);
        index += 1;

        matrix.compose(
          new THREE.Vector3(lot.x + lot.width / 2 + 0.04, y, z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2),
          new THREE.Vector3(1.25, 1.45, 1),
        );
        windows.setMatrixAt(index, matrix);
        index += 1;
      }
    }

    windows.count = index;
    group.add(windows);
  }

  private addEntrance(group: THREE.Group, lot: BuildingLot): void {
    const door = new THREE.Mesh(
      reusable.door,
      new THREE.MeshStandardMaterial({ color: 0x20272b, roughness: 0.42, metalness: 0.15 }),
    );
    door.name = `${lot.id}-entrance`;
    door.position.set(lot.x, 1.6, lot.z + lot.depth / 2 + 0.08);
    door.castShadow = true;
    group.add(door);

    const awning = new THREE.Mesh(
      reusable.box,
      new THREE.MeshStandardMaterial({ color: 0x345f70, roughness: 0.5 }),
    );
    awning.name = `${lot.id}-awning`;
    awning.scale.set(4.4, 0.28, 1.4);
    awning.position.set(lot.x, 3.45, lot.z + lot.depth / 2 + 0.55);
    awning.castShadow = true;
    group.add(awning);
  }

  private addRooftop(group: THREE.Group, lot: BuildingLot, height: number): void {
    const parapet = new THREE.Mesh(
      reusable.box,
      new THREE.MeshStandardMaterial({ color: 0x34393a, roughness: 0.7 }),
    );
    parapet.name = `${lot.id}-rooftop`;
    parapet.scale.set(lot.width + 0.6, 0.7, lot.depth + 0.6);
    parapet.position.set(lot.x, height + 0.35, lot.z);
    parapet.castShadow = true;
    group.add(parapet);

    const mechanical = new THREE.Mesh(
      reusable.box,
      new THREE.MeshStandardMaterial({ color: 0x6f7778, roughness: 0.65 }),
    );
    mechanical.name = `${lot.id}-mechanical`;
    mechanical.scale.set(lot.width * 0.28, 1.3, lot.depth * 0.24);
    mechanical.position.set(lot.x + lot.width * 0.18, height + 1.35, lot.z - lot.depth * 0.16);
    mechanical.castShadow = true;
    group.add(mechanical);
  }
}
