import { Redirect, useLocalSearchParams } from 'expo-router';
import { useTellStore } from '../../src/store/tell';
import { NurseCard } from '../../src/ui/screens/NurseCard';

export default function Card() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useTellStore((s) => s.current);
  const context = useTellStore((s) => s.context);
  if (!entry || entry.id !== id) return <Redirect href="/" />;
  return <NurseCard entry={entry} context={context} />;
}
