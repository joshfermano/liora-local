import type { Context } from '../core/types';
import { AVATAR_MARKS, type AvatarMarkName } from '../ui/art/marks';
import { cleanName, mergeSetup } from '../ui/name';
import { useLogStore, type SetupAnswers } from './log';

export type Status = Context['status'];

// Age, height and weight are shown to her and on the nurse card; they never feed the rules.
export interface Profile {
  name?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  status?: Status;
  weeks?: number;
  daysSinceBirth?: number;
  avatar?: AvatarMarkName;
  lock: boolean;
}

const RANGES = { age: [10, 60], heightCm: [100, 220], weightKg: [25, 250], weeks: [1, 45], daysSinceBirth: [0, 365] } as const;

// The native wheel can hand its value back as text, so "55" reads as 55; anything else is dropped.
const inRange = (value: unknown, [min, max]: readonly [number, number]): number | undefined => {
  const n = typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

export function readProfile(setup: SetupAnswers | null): Profile {
  const s = setup ?? {};
  const name = typeof s.name === 'string' ? cleanName(s.name) : '';
  const status = s.status === 'pregnant' || s.status === 'postpartum' || s.status === 'neither' ? s.status : undefined;
  const profile: Profile = {
    name: name || undefined,
    age: inRange(s.age, RANGES.age),
    heightCm: inRange(s.heightCm, RANGES.heightCm),
    weightKg: inRange(s.weightKg, RANGES.weightKg),
    status,
    weeks: status === 'pregnant' ? inRange(s.weeks, RANGES.weeks) : undefined,
    daysSinceBirth: status === 'postpartum' ? inRange(s.days_since_birth, RANGES.daysSinceBirth) : undefined,
    avatar: (AVATAR_MARKS as readonly unknown[]).includes(s.avatar) ? (s.avatar as AvatarMarkName) : undefined,
    lock: s.lock === true,
  };
  return Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)) as Profile;
}

export function contextFrom(profile: Profile): Context {
  const status = profile.status ?? 'pregnant';
  if (status === 'pregnant' && profile.weeks !== undefined) return { status, weeks: profile.weeks };
  if (status === 'postpartum' && profile.daysSinceBirth !== undefined) return { status, days_since_birth: profile.daysSinceBirth };
  return { status };
}

export const PROFILE_RANGES = RANGES;

export function useProfile(): Profile {
  const setup = useLogStore((s) => s.setup);
  return readProfile(setup);
}

// Setup saved days since birth under its own key; keep one key on disk.
export function updateProfile({ daysSinceBirth, ...rest }: Partial<Profile>): void {
  mergeSetup(daysSinceBirth === undefined ? rest : { ...rest, days_since_birth: daysSinceBirth });
}
