import type { VehicleDefinition, VehicleType } from '../../types/Vehicle';
import type { RouteManager, VehicleRoute } from '../traffic/RouteManager';
import { Vehicle } from './Vehicle';

const CAR_PALETTES = [
  0x2b5c8f, // Deep Blue
  0x9c3328, // Crimson
  0x3f6b4e, // Forest Green
  0xd19f38, // Warm Amber
  0x556066, // Slate Graphite
  0xdde2e6, // Silver Pearl
  0x1e272c, // Obsidian Black
  0x915838, // Terracotta
  0x2d7f8d, // Teal
  0xb85b35, // Burnt Orange
  0x5b4778, // Royal Plum
  0x6e7855, // Olive Green
];

export class VehiclePool {
  private readonly pool: Vehicle[] = [];

  constructor(size: number, routes: RouteManager) {
    const types: VehicleType[] = ['Sedan', 'Sedan', 'SUV', 'SUV', 'Van', 'Bus'];
    const dummyRoute = routes.getRoutes()[0];

    for (let i = 0; i < size; i++) {
      const type = types[i % types.length];
      const maxSpeed = type === 'Bus' ? 6.2 : type === 'Van' ? 7.2 : type === 'SUV' ? 8.0 : 9.2;
      const color = CAR_PALETTES[i % CAR_PALETTES.length];
      const def: VehicleDefinition = {
        id: `vehicle-${String(i + 1).padStart(3, '0')}`,
        type,
        routeId: dummyRoute.id,
        color,
        maxSpeed,
        startDelay: 0,
      };

      const vehicle = new Vehicle(def, dummyRoute);
      this.pool.push(vehicle);
    }
  }

  acquire(route: VehicleRoute): Vehicle | null {
    for (const vehicle of this.pool) {
      if (!vehicle.active) {
        vehicle.spawn(route);
        return vehicle;
      }
    }
    return null;
  }

  release(vehicle: Vehicle): void {
    vehicle.despawn();
  }

  getAll(): Vehicle[] {
    return this.pool;
  }

  getActive(): Vehicle[] {
    return this.pool.filter((v) => v.active);
  }
}
