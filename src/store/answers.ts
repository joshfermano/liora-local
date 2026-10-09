import { format, parseISO } from 'date-fns';
import { en } from '../content/copy';
import type { HerAnswer } from '../core/agent/her-data';
import type { DayLog } from '../core/types';

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? '');
// Chip labels like "Sleep" or "Energy" name a topic; in a sentence she needs what was wrong.
const IN_A_SENTENCE: Record<string, string> = { sleep_quality: 'her.symptom.sleep_quality', energy: 'her.symptom.energy', appetite: 'her.symptom.appetite' };
const label = (prefix: string, code: string) => en(prefix === 'symptom' && IN_A_SENTENCE[code] ? IN_A_SENTENCE[code] : `${prefix}.${code}`).toLowerCase();

// One day of her log in her words: "heavy flow, cramps, fatigue, irritable".
export function dayLine(log: DayLog): string {
  const parts = [
    log.flow ? fill(en('her.flow'), { flow: label('cal.flow', log.flow) }) : null,
    ...log.symptoms.map((s) => label('symptom', s)),
    ...log.moods.map((m) => label('feeling', m)),
    ...log.activities.map((a) => label('activity', a)),
    log.discharge ? en('her.discharge') : null,
    log.note?.trim() ? `"${log.note.trim()}"` : null,
  ];
  return parts.filter(Boolean).join(', ');
}

// The fixed reply for a question about her own logs, with every value written out.
export function answerText(a: HerAnswer): { key: string; params: Record<string, string> } {
  const params = { ...(a.params ?? {}) };
  if (a.symptoms) params.sign = a.symptoms.map((s) => label('symptom', s)).join(' or ');
  if (a.moods) params.list = a.moods.map((m) => label('feeling', m)).join(', ');
  if (a.days) params.list = a.days.map((d) => `${format(parseISO(d.date), 'MMM d')}: ${dayLine(d)}`).join('; ');
  return { key: a.key, params };
}
