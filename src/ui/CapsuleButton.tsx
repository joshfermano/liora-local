import { ActivityIndicator } from 'react-native';
import { PressableSurface } from './PressableSurface';
import { Text } from './Text';
import { EDGE, SURFACE, type Tone } from './theme';
import { useColors } from './theme';

export type CapsuleVariant = 'filled' | 'tinted' | 'neutral' | 'plain' | 'onAlarm';

const LOOK: Record<CapsuleVariant, { surface: string; tone: Tone }> = {
  filled: { surface: `${SURFACE.tintFill} rounded-capsule min-h-capsule px-xl`, tone: 'onTint' },
  tinted: { surface: `${SURFACE.tintSoft} rounded-capsule min-h-capsule px-xl`, tone: 'tintSoftInk' },
  neutral: { surface: `${SURFACE.surface} ${EDGE} rounded-capsule min-h-capsule px-xl`, tone: 'label' },
  plain: { surface: 'rounded-full min-h-tap px-xs', tone: 'tint' },
  onAlarm: { surface: `${SURFACE.onAlarm} rounded-capsule min-h-capsule px-xl`, tone: 'urgentFill' },
};

export interface CapsuleButtonProps {
  label: string;
  onPress?: () => void;
  variant?: CapsuleVariant;
  disabled?: boolean;
  loading?: boolean;
  hint?: string;
  className?: string;
}

export function CapsuleButton({
  label,
  onPress,
  variant = 'filled',
  disabled = false,
  loading = false,
  hint,
  className,
}: CapsuleButtonProps) {
  const colors = useColors();
  const look = disabled && variant !== 'plain' ? { surface: `${SURFACE.fill} rounded-capsule min-h-capsule px-xl`, tone: 'tertiary' as Tone } : LOOK[variant];
  const plain = variant === 'plain';
  return (
    <PressableSurface
      label={label}
      hint={hint}
      onPress={onPress}
      disabled={disabled}
      busy={loading}
      pressScale={0.97}
      className={className}
      surfaceClassName={`${look.surface} items-center justify-center`}
    >
      {loading ? (
        <ActivityIndicator color={colors[variant === 'filled' ? 'on-tint' : 'tint']} />
      ) : (
        <Text variant={plain ? 'body' : 'headline'} tone={look.tone}>
          {label}
        </Text>
      )}
    </PressableSurface>
  );
}
