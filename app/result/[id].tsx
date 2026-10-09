import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTellStore } from '../../src/store/tell';
import { Calm } from '../../src/ui/screens/Calm';
import { FollowUp } from '../../src/ui/screens/FollowUp';
import { GoNow } from '../../src/ui/screens/GoNow';

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useTellStore((s) => s.current);
  if (!entry || entry.id !== id) return <Redirect href="/" />;
  switch (entry.decision.level) {
    case 'go_now':
      return <GoNow entry={entry} />;
    case 'follow_up':
      // Each question gets a fresh screen: two follow-ups can share the same words.
      return <FollowUp key={`${entry.id}:${entry.decision.follow_up?.code ?? ''}`} entry={entry} />;
    case 'ok':
      return <Calm entry={entry} />;
  }
}
