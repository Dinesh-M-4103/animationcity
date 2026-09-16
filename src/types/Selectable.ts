export type SelectableType = 'building' | 'intersection' | 'vehicle';

export interface SelectableInfo {
  id: string;
  type: SelectableType;
  title: string;
  details: Record<string, string | number>;
}
