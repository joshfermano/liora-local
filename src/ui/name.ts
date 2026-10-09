import { useLogStore } from '../store/log';

export const NAME_MAX = 40;

// Plain text only: control characters out, length capped.
export function cleanName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, NAME_MAX);
}

export function useName(): string {
  return useLogStore((s) => (typeof s.setup?.name === 'string' ? cleanName(s.setup.name) : ''));
}

export function mergeSetup(patch: Record<string, unknown>): void {
  const { setup, setSetup } = useLogStore.getState();
  setSetup({ ...(setup ?? {}), ...patch });
}
