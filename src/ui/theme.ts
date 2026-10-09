import { useColorScheme } from 'react-native';
import { palette, type ColorName, type Scheme } from './tokens';

export function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function useColors(): Record<ColorName, string> {
  return palette[useScheme()];
}

// Tailwind only sees literal class names, so every pair is spelled out.
export const TEXT_TONE = {
  label: 'text-label dark:text-label-dark',
  secondary: 'text-label-secondary dark:text-label-secondary-dark',
  tertiary: 'text-label-tertiary dark:text-label-tertiary-dark',
  tint: 'text-tint dark:text-tint-dark',
  tintSoftInk: 'text-tint-soft-ink dark:text-tint-soft-ink-dark',
  urgent: 'text-urgent dark:text-urgent-dark',
  onTint: 'text-on-tint',
  onUrgent: 'text-on-urgent',
  urgentFill: 'text-urgent-fill',
} as const;
export type Tone = keyof typeof TEXT_TONE;

// Icon colours read the palette directly.
export const TONE_COLOR: Record<Tone, ColorName> = {
  label: 'label',
  secondary: 'label-secondary',
  tertiary: 'label-tertiary',
  tint: 'tint',
  tintSoftInk: 'tint-soft-ink',
  urgent: 'urgent',
  onTint: 'on-tint',
  onUrgent: 'on-urgent',
  urgentFill: 'urgent-fill',
};

export const SURFACE = {
  ground: 'bg-ground dark:bg-ground-dark',
  surface: 'bg-surface dark:bg-surface-dark',
  raised: 'bg-surface-raised dark:bg-surface-raised-dark',
  fill: 'bg-fill dark:bg-fill-dark',
  tintSoft: 'bg-tint-soft dark:bg-tint-soft-dark',
  tintFill: 'bg-tint-fill',
  alarm: 'bg-urgent-fill',
  onAlarm: 'bg-on-urgent',
} as const;

export const EDGE = 'border border-nacre dark:border-nacre-dark';
export const EDGE_FOCUS = 'border-[1.5px] border-tint dark:border-tint-dark';
export const SEPARATOR = 'bg-separator dark:bg-separator-dark';
