import type { Context } from '../core/types';
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
  lock: boolean;
}

const RANGES = { age: [10, 60], heightCm: [100, 220], weightKg: [25, 250], weeks: [1, 45] } as const;

const inRange = (value: unknown, [min, max]: readonly [number, number]): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : undefined;

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
    lock: s.lock === true,
  };
  return Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)) as Profile;
}

export function contextFrom(profile: Profile): Context {
  const status = profile.status ?? 'pregnant';
  return profile.weeks !== undefined && status === 'pregnant' ? { status, weeks: profile.weeks } : { status };
}

export const PROFILE_RANGES = RANGES;

export function useProfile(): Profile {
  const setup = useLogStore((s) => s.setup);
  return readProfile(setup);
}

export function updateProfile(patch: Partial<Profile>): void {
  mergeSetup(patch);
}
