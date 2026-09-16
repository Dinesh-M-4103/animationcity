export type SelectableType = 'building' | 'intersection' | 'vehicle' | 'pedestrian';

export interface SelectableInfo {
  id: string;
  type: SelectableType;
  title: string;
  details: Record<string, string | number>;
}
