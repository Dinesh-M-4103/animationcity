import type { PedestrianDefinition, PedestrianType } from '../../types/Pedestrian';
import { Pedestrian } from './Pedestrian';
import type { PedestrianNavigation } from './PedestrianNavigation';

const SKIN_TONES = [0xf5c396, 0xe0a97a, 0xc48c62, 0x8d5c38, 0x5c3a21, 0xffe0bd];
const SHIRT_COLORS = [0x2d5f8b, 0xa8382c, 0x3a784d, 0xd49b2f, 0x5a6368, 0xdbe0e5, 0x9c4285, 0x3a7882, 0x7a5b3a, 0x222629];
const PANTS_COLORS = [0x1f2730, 0x2b3846, 0x403b35, 0x2c332e, 0x595d61, 0x181c1f];
const HAIR_COLORS = [0x1a1a1a, 0x3b281d, 0x6a482d, 0x9e784f, 0xd1af78];
const TYPES: PedestrianType[] = ['Adult', 'Worker', 'Student', 'Elderly'];

export class PedestrianPool {
  private readonly pool: Pedestrian[] = [];

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const type = TYPES[i % TYPES.length];
      const heightScale = type === 'Student' ? 0.88 : type === 'Elderly' ? 0.94 : type === 'Worker' ? 1.04 : 1.0;
      const walkingSpeed = type === 'Student' ? 1.48 : type === 'Elderly' ? 1.15 : type === 'Worker' ? 1.38 : 1.32;

      const def: PedestrianDefinition = {
        id: `pedestrian-${String(i + 1).padStart(3, '0')}`,
        type,
        heightScale,
        skinColor: SKIN_TONES[i % SKIN_TONES.length],
        shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
        pantsColor: PANTS_COLORS[i % PANTS_COLORS.length],
        hairColor: HAIR_COLORS[i % HAIR_COLORS.length],
        walkingSpeed: walkingSpeed + (Math.random() * 0.15 - 0.07),
      };

      const pedestrian = new Pedestrian(def);
      this.pool.push(pedestrian);
    }
  }

  acquire(startNode: import('../../types/Pedestrian').SidewalkNode, destNode: import('../../types/Pedestrian').SidewalkNode, nav: PedestrianNavigation): Pedestrian | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.spawn(startNode, destNode, nav);
        return p;
      }
    }
    return null;
  }

  release(p: Pedestrian): void {
    p.despawn();
  }

  getAll(): Pedestrian[] {
    return this.pool;
  }

  getActive(): Pedestrian[] {
    return this.pool.filter((p) => p.active);
  }
}
