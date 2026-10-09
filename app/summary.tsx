import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { handoffReport } from '../src/core/handoff';
import { useLogStore } from '../src/store/log';
import { useProfile } from '../src/store/profile';
import { ReportView } from '../src/ui/handoff/ReportView';
import { Screen } from '../src/ui/Screen';

// The same report with no concern: a health summary she can show or share any time.
export default function Summary() {
  const router = useRouter();
  const profile = useProfile();
  const entries = useLogStore((s) => s.entries);
  const dayLogs = useLogStore((s) => s.dayLogs);
  const periods = useLogStore((s) => s.periods);
  const report = useMemo(
    () =>
      handoffReport({
        patient: {
          name: profile.name,
          age: profile.age,
          bloodType: profile.bloodType,
          heightCm: profile.heightCm,
          weightKg: profile.weightKg,
          status: profile.status,
          weeks: profile.weeks,
          daysSinceBirth: profile.daysSinceBirth,
        },
        emergency: profile.emergency,
        entry: null,
        entries,
        dayLogs,
        periods,
        now: new Date(),
      }),
    [profile, entries, dayLogs, periods],
  );
  return (
    <Screen raised field={false}>
      <ReportView report={report} onBack={() => router.back()} />
    </Screen>
  );
}
