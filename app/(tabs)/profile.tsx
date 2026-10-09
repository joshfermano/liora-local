import { Screen } from '../../src/ui/Screen';
import { Text } from '../../src/ui/Text';
import { en } from '../../src/content/copy';

export default function Profile() {
  return (
    <Screen>
      <Text variant="displayTitle" accessibilityRole="header">
        {en('tabs.profile')}
      </Text>
    </Screen>
  );
}
