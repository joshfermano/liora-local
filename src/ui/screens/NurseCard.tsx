import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { handoffReport } from '../../core/handoff';
import type { Context, Entry } from '../../core/types';
import { useLogStore } from '../../store/log';
import { useProfile } from '../../store/profile';
import { ReportView } from '../handoff/ReportView';
import { Screen } from '../Screen';

// The handoff report for one concern (FR-6): she shows it on screen or shares it as a PDF.
export function NurseCard({ entry, context }: { entry: Entry; context: Context }) {
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
          status: context.status,
          weeks: context.weeks,
          daysSinceBirth: context.days_since_birth,
        },
        emergency: profile.emergency,
        entry,
        entries,
        dayLogs,
        periods,
        now: new Date(),
      }),
    [profile, context, entry, entries, dayLogs, periods],
  );

  return (
    <Screen raised field={false}>
      <ReportView report={report} extras={{ bp: context.bp }} onBack={() => router.back()} />
    </Screen>
  );
}
