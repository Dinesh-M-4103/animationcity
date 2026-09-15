import * as THREE from 'three';
import { RENDERING } from '../config/constants';

export class SceneLighting {
  constructor(scene: THREE.Scene) {
    scene.fog = new THREE.FogExp2(0xc8d8e0, 0.006);

    const hemi = new THREE.HemisphereLight(0xdcefff, 0x66705b, 1.9);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2d2, 3.4);
    sun.position.set(-45, 72, 36);
    sun.castShadow = true;
    sun.shadow.mapSize.set(RENDERING.shadowMapSize, RENDERING.shadowMapSize);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 170;
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x9fc5ff, 0.8);
    fill.position.set(46, 34, -44);
    scene.add(fill);
  }
}
