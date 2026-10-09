import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const on = Platform.OS === 'ios';

export const tap = () => {
  if (on) void Haptics.selectionAsync().catch(() => {});
};
export const confirm = () => {
  if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
// Go-now gets a warning buzz, never a celebratory one.
export const warn = () => {
  if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
