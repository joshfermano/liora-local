import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors, useScheme } from './theme';

// A blur that is full at the screen's edge and fades to nothing toward the middle, over a soft wash of
// the ground so text above busy messages stays readable. The web has no masked blur; it keeps the wash.
export function FadeBlur({ edge }: { edge: 'top' | 'bottom' }) {
  const c = useColors();
  const scheme = useScheme();
  const solid = edge === 'top' ? (['#000', '#000', 'transparent'] as const) : (['transparent', '#000', '#000'] as const);
  const stops = edge === 'top' ? ([0, 0.5, 1] as const) : ([0, 0.5, 1] as const);
  const wash =
    edge === 'top' ? ([`${c.ground}F2`, `${c.ground}B3`, `${c.ground}00`] as const) : ([`${c.ground}00`, `${c.ground}B3`, `${c.ground}F2`] as const);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Platform.OS === 'ios' ? (
        <MaskedView style={StyleSheet.absoluteFill} maskElement={<LinearGradient colors={solid} locations={stops} style={StyleSheet.absoluteFill} />}>
          <BlurView intensity={28} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </MaskedView>
      ) : null}
      <LinearGradient colors={wash} locations={stops} style={StyleSheet.absoluteFill} />
    </View>
  );
}
