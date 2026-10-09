import { View } from 'react-native';
import { en } from '../../content/copy';
import { useMemoryStore } from '../../store/memory';
import { tap } from '../haptics';
import { PressableSurface } from '../PressableSurface';
import { Symbol } from '../Symbol';
import { Text } from '../Text';
import { Divider, Section } from './parts';

// What Liora keeps about her beyond her logs: her own notes and the language she writes in.
export function MemorySection() {
  const notes = useMemoryStore((s) => s.notes);
  const language = useMemoryStore((s) => s.language);
  const forgetAt = useMemoryStore((s) => s.forgetAt);
  return (
    <Section title={en('pf.memory')} footer={en('pf.memory.footer')}>
      {language ? (
        <View className="min-h-choice flex-row items-center justify-between gap-md px-md">
          <Text variant="body">{en('pf.memory.language')}</Text>
          <Text variant="body" tone="secondary">
            {en(`pf.memory.language.${language}`)}
          </Text>
        </View>
      ) : null}
      {notes.length === 0 ? (
        <View className="min-h-choice justify-center px-md">
          {language ? <Divider /> : null}
          <Text variant="subheadline" tone="secondary">
            {en('pf.memory.empty')}
          </Text>
        </View>
      ) : (
        notes.map((note, i) => (
          <View key={`${i}-${note}`}>
            {i > 0 || language ? <Divider /> : null}
            <View className="min-h-choice flex-row items-center gap-sm pl-md pr-xs">
              <Text variant="body" className="flex-1">
                {note}
              </Text>
              <PressableSurface
                label={`${en('pf.memory.forget')}: ${note}`}
                onPress={() => {
                  tap();
                  forgetAt(i);
                }}
                surfaceClassName="h-tap w-tap items-center justify-center rounded-full"
              >
                <Symbol name="xmark.circle" fallback="close" tone="tertiary" size={20} />
              </PressableSurface>
            </View>
          </View>
        ))
      )}
    </Section>
  );
}
