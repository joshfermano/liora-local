import { Text as RNText, type TextProps } from 'react-native';
import { TEXT_TONE, type Tone } from './theme';

const VARIANT = {
  wordmark: 'font-display text-wordmark',
  displayTitle: 'font-display text-display-title',
  displayHeading: 'font-display text-display-heading',
  display: 'text-display tabular-nums',
  title1: 'text-title1',
  title2: 'text-title2',
  title3: 'text-title3',
  headline: 'text-headline',
  body: 'text-body',
  subheadline: 'text-subheadline',
  footnote: 'text-footnote',
  caption1: 'text-caption1',
} as const;
export type Variant = keyof typeof VARIANT;

export interface UiTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  className?: string;
}

export function Text({ variant = 'body', tone = 'label', className, ...props }: UiTextProps) {
  return <RNText {...props} className={`${VARIANT[variant]} ${TEXT_TONE[tone]} ${className ?? ''}`} />;
}
