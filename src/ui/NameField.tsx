import { TextInput, View } from 'react-native';
import { en } from '../content/copy';
import { NAME_MAX } from './name';
import { Text } from './Text';
import { EDGE, SURFACE, TEXT_TONE } from './theme';

export function NameField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (t: string) => void;
  onSubmit?: () => void;
}) {
  return (
    <View className="gap-xs">
      <View className="gap-xxs">
        <Text variant="headline" accessibilityRole="header">
          {en('name.question')}
        </Text>
        <Text variant="footnote" tone="secondary">
          {en('name.optional')}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        accessibilityLabel={en('name.question')}
        maxLength={NAME_MAX}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
        className={`${SURFACE.surface} ${EDGE} rounded-pane min-h-tap px-md text-body ${TEXT_TONE.label}`}
      />
    </View>
  );
}
