import { File, Paths } from 'expo-file-system';
import type { KeyValueStorage } from './storage.types';

const file = () => new File(Paths.document, 'tell-liora.json');
const temp = () => new File(Paths.document, 'tell-liora.json.tmp');

let cache: Record<string, string> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function load(): Record<string, string> {
  if (cache) return cache;
  try {
    const f = file();
    cache = f.exists ? (JSON.parse(f.textSync()) as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

// Temp file first, then move over the real one, so a crash never leaves half a file.
function persist(data: Record<string, string>) {
  const t = temp();
  t.create({ overwrite: true });
  t.write(JSON.stringify(data));
  t.moveSync(file(), { overwrite: true });
  cache = data;
}

function run<T>(job: () => T): Promise<T> {
  const next = queue.then(job);
  queue = next.catch(() => undefined);
  return next;
}

export const storage: KeyValueStorage = {
  getItem: (key) => run(() => load()[key] ?? null),
  setItem: (key, value) => run(() => persist({ ...load(), [key]: value })),
  removeItem: (key) =>
    run(() => {
      const { [key]: _gone, ...rest } = load();
      persist(rest);
    }),
  clear: () => run(() => persist({})),
};
