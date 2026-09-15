import * as THREE from 'three';

const materials = {
  tire: new THREE.MeshStandardMaterial({ color: 0x151719, roughness: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x253944, roughness: 0.2, metalness: 0.08 }),
};

const colors = [0x345f85, 0x9a4038, 0xd8d3c5, 0x2f684f, 0xc59d49];

export class ParkedVehicleFactory {
  createParkedVehicles(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ParkedVehicles';

    const placements = [
      { x: -28, z: -10.8, rot: 0 },
      { x: -48, z: 10.8, rot: Math.PI },
      { x: 28, z: 10.8, rot: Math.PI },
      { x: 50, z: -10.8, rot: 0 },
      { x: -10.8, z: 32, rot: Math.PI / 2 },
      { x: 10.8, z: -36, rot: -Math.PI / 2 },
    ];

    placements.forEach((placement, index) => {
      group.add(this.createVehicle(placement.x, placement.z, placement.rot, colors[index % colors.length]));
    });

    return group;
  }

  private createVehicle(x: number, z: number, rotation: number, color: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'parked-vehicle';
    group.position.set(x, 0.25, z);
    group.rotation.y = rotation;

    const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.08 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 2.0), bodyMaterial);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 1.65), materials.glass);
    cabin.position.set(-0.25, 1.35, 0);
    cabin.castShadow = true;
    group.add(cabin);

    for (const wheelX of [-1.45, 1.45]) {
      for (const wheelZ of [-1.05, 1.05]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 14), materials.tire);
        wheel.position.set(wheelX, 0.34, wheelZ);
        wheel.rotation.x = Math.PI / 2;
        wheel.castShadow = true;
        group.add(wheel);
      }
    }

    return group;
  }
}
