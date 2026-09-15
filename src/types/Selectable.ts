export type SelectableType = 'building' | 'intersection';

export interface SelectableInfo {
  id: string;
  type: SelectableType;
  title: string;
  details: Record<string, string | number>;
}
