import * as THREE from 'three';
import { COLORS } from '../config/constants';
import type { SelectableInfo } from '../types/Selectable';

interface SelectionManagerOptions {
  camera: THREE.Camera;
  scene: THREE.Scene;
  domElement: HTMLElement;
  onSelectionChanged: (info: SelectableInfo | null) => void;
}

interface SelectableCarrier extends THREE.Object3D {
  userData: {
    selectable?: SelectableInfo;
    selectableRoot?: THREE.Object3D;
  };
}

export class SelectionManager {
  private readonly camera: THREE.Camera;
  private readonly scene: THREE.Scene;
  private readonly domElement: HTMLElement;
  private readonly onSelectionChanged: (info: SelectableInfo | null) => void;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(-10, -10);
  private readonly selectionBox = new THREE.BoxHelper(new THREE.Object3D(), COLORS.selection);
  private hovered: THREE.Object3D | null = null;
  private selected: THREE.Object3D | null = null;

  constructor(options: SelectionManagerOptions) {
    this.camera = options.camera;
    this.scene = options.scene;
    this.domElement = options.domElement;
    this.onSelectionChanged = options.onSelectionChanged;

    this.selectionBox.visible = false;
    this.scene.add(this.selectionBox);

    this.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    this.domElement.addEventListener('click', this.handleClick);
  }

  update(): void {
    if (this.selected) {
      this.selectionBox.setFromObject(this.selected);
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    const candidate = this.pick();
    this.hovered = candidate;
    this.domElement.style.cursor = candidate ? 'pointer' : 'grab';
  };

  private readonly handlePointerLeave = (): void => {
    this.pointer.set(-10, -10);
    this.hovered = null;
    this.domElement.style.cursor = 'default';
  };

  private readonly handleClick = (): void => {
    this.selected = this.hovered;
    this.selectionBox.visible = Boolean(this.selected);

    if (this.selected) {
      this.selectionBox.setFromObject(this.selected);
      this.onSelectionChanged(this.getSelectableInfo(this.selected));
      return;
    }

    this.onSelectionChanged(null);
  };

  private pick(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    for (const hit of hits) {
      const selectable = this.findSelectable(hit.object);
      if (selectable) {
        return selectable;
      }
    }

    return null;
  }

  private findSelectable(object: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = object;

    while (current) {
      const carrier = current as SelectableCarrier;
      if (carrier.userData.selectableRoot) {
        return carrier.userData.selectableRoot;
      }
      if (carrier.userData.selectable) {
        return current;
      }
      current = current.parent;
    }

    return null;
  }

  private getSelectableInfo(object: THREE.Object3D): SelectableInfo {
    const carrier = object as SelectableCarrier;
    if (!carrier.userData.selectable) {
      throw new Error(`Object ${object.name} is missing selectable metadata.`);
    }
    return carrier.userData.selectable;
  }
}
