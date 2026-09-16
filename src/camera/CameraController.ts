import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraController {
  private readonly controls: OrbitControls;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    camera.position.set(58, 55, 76);
    camera.lookAt(0, 0, 0);

    domElement.style.touchAction = 'none';
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.screenSpacePanning = false;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 220;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.target.set(0, 3, 0);
    this.controls.panSpeed = 0.85;
    this.controls.zoomSpeed = 1.1;
    this.controls.rotateSpeed = 0.65;
    this.controls.update();
  }

  update(_deltaSeconds: number): void {
    this.controls.update();
  }
}
