export type Scheme = 'light' | 'dark';
export type ColorName =
  | 'tint' | 'tint-fill' | 'on-tint' | 'tint-soft' | 'tint-soft-ink' | 'urgent' | 'urgent-fill'
  | 'on-urgent' | 'dusk' | 'ground' | 'surface' | 'surface-raised' | 'fill' | 'label'
  | 'label-secondary' | 'label-tertiary' | 'separator' | 'nacre' | 'light-dawn-source'
  | 'light-dawn-fade' | 'frame' | 'lit' | 'peach' | 'pearl';
export const palette: Record<Scheme, Record<ColorName, string>>;
export const colors: Record<string, string>;
export const type: Record<string, [string, Record<string, string>]>;
export const radii: Record<string, string>;
export const spacing: Record<string, string>;
