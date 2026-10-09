import type { ProgressEvent } from './protocol';

export type FileProgress = Record<string, { loaded: number; total: number }>;

export function addProgress(files: FileProgress, event: ProgressEvent): FileProgress {
  return { ...files, [event.file]: { loaded: event.loaded, total: event.total } };
}

export function totals(files: FileProgress) {
  let loaded = 0;
  let total = 0;
  for (const file of Object.values(files)) {
    loaded += file.loaded;
    total += file.total;
  }
  return { loaded, total };
}

export function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type Inflight = {
  label: string;
  startedAt: number;
  step: string;
  file?: string;
  loaded: number;
  total: number;
  updatedAt: number;
};

export const INFLIGHT_KEY = 'liora-eval-inflight';

export function describeInflight(run: Inflight) {
  const where = run.file ? `, downloading ${run.file} (${formatMB(run.loaded)} of ${formatMB(run.total)})` : '';
  const seconds = Math.round((run.updatedAt - run.startedAt) / 1000);
  return `The last run did not finish: "${run.label}", step "${run.step}"${where}, ${seconds} s after it started. The tab was probably reloaded or killed.`;
}
