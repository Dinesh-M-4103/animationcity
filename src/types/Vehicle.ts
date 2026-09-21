export type VehicleState = 'MOVING' | 'WAITING_FOR_LIGHT' | 'SLOWING_FOR_YELLOW' | 'FOLLOWING' | 'YIELDING';
export type VehicleType = 'Sedan' | 'SUV' | 'Van' | 'Bus';

export interface VehicleDefinition {
  id: string;
  type: VehicleType;
  routeId: string;
  color: number;
  maxSpeed: number;
  startDelay: number;
}
