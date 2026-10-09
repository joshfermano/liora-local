import { z } from 'zod';
import { ACTIVITIES, DANGER_CODES, FINDING_SOURCES, FLOWS, MOODS, SEVERITIES, SYMPTOMS } from './vocabulary';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const FlowSchema = z.enum(FLOWS);
export const SymptomSchema = z.enum(SYMPTOMS);
export const ActivitySchema = z.enum(ACTIVITIES);
export const MoodSchema = z.enum(MOODS);
export const DangerCodeSchema = z.enum(DANGER_CODES);
export const SeveritySchema = z.enum(SEVERITIES);
export const FindingSourceSchema = z.enum(FINDING_SOURCES);

export const FindingSchema = z.object({
  code: z.union([DangerCodeSchema, SymptomSchema]),
  severity: SeveritySchema,
  sources: z.array(FindingSourceSchema),
  confidence: z.number().min(0).max(1).nullable(),
});

export const ExtractionSchema = z.object({
  period: z
    .object({
      event: z.enum(['started', 'ended', 'ongoing']),
      when: z.enum(['today', 'yesterday', 'days_ago', 'date', 'unknown']),
      days_ago: z.number().int().nonnegative().nullable(),
      date: ymd.nullable(),
      flow: FlowSchema.nullable(),
    })
    .nullable(),
  symptoms: z.array(z.object({ code: SymptomSchema, severity: SeveritySchema })),
  moods: z.array(MoodSchema),
  danger_signs: z.array(z.object({ code: DangerCodeSchema, severity: SeveritySchema })),
  pregnancy_weeks: z.number().nullable(),
});

export const ContextSchema = z.object({
  status: z.enum(['pregnant', 'postpartum', 'neither']),
  weeks: z.number().optional(),
  days_since_birth: z.number().optional(),
  bp: z
    .object({ systolic: z.number(), diastolic: z.number(), recorded_at: z.string() })
    .optional(),
  proteinuria: z.boolean().optional(),
});

export const DecisionSchema = z.object({
  level: z.enum(['go_now', 'follow_up', 'ok']),
  fired: z.array(z.object({ rule_id: z.string(), codes: z.array(z.string()) })),
  follow_up: z.object({ question_id: z.string(), code: z.string() }).optional(),
});

export const EntrySchema = z.object({
  id: z.string(),
  created_at: z.string(),
  text: z.string(),
  input: z.enum(['text', 'voice', 'checklist']),
  findings: z.array(FindingSchema),
  extraction: ExtractionSchema.nullable(),
  decision: DecisionSchema,
  // Her answer to the follow-up question; a skip still counts as serious (SR-5) but is shown as a skip.
  // `changed` lists every sign the answer set, so re-opening a skip undoes exactly those.
  follow_up_answer: z.object({ code: z.string(), answer: z.enum(['yes', 'no', 'skip']), changed: z.array(z.string()).optional() }).optional(),
  card_ids: z.array(z.string()),
  models: z.array(
    z.object({
      role: z.enum(['llm', 'asr', 'embedding', 'ocr']),
      id: z.string(),
      version: z.string(),
      // Which prompt versions this model was given; entries saved before this field have none.
      prompts: z.record(z.string(), z.string()).optional(),
    }),
  ),
});

export const MoodResultSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  answers: z.array(z.number()),
  total: z.number(),
  self_harm_flag: z.boolean(),
});

export const PeriodRecordSchema = z.object({
  id: z.string(),
  start: ymd,
  end: ymd.nullable(),
  flow_by_day: z.record(ymd, FlowSchema),
  source: z.enum(['tell', 'calendar', 'setup']),
});

export const DayLogSchema = z.object({
  date: ymd,
  flow: FlowSchema.nullable(),
  symptoms: z.array(SymptomSchema),
  moods: z.array(MoodSchema),
  activities: z.array(ActivitySchema),
  note: z.string().optional(),
});

export const CycleSettingsSchema = z.object({
  stated_cycle_length: z.number().optional(),
  stated_period_length: z.number().optional(),
});

export const PredictionSchema = z.object({
  next_start: ymd,
  window: z.object({ from: ymd, to: ymd }),
  basis: z.enum(['history', 'stated']),
  cycles_used: z.number(),
  confidence: z.enum(['low', 'medium', 'high']),
  track: z.object({ checked: z.number(), held: z.number() }).optional(),
});

export const SourceRefSchema = z.object({
  org: z.string(),
  title: z.string(),
  year: z.number(),
  ref: z.string(),
  url: z.string(),
});

export type Flow = z.infer<typeof FlowSchema>;
export type Symptom = z.infer<typeof SymptomSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type DayLog = z.infer<typeof DayLogSchema>;
export type Mood = z.infer<typeof MoodSchema>;
export type DangerCode = z.infer<typeof DangerCodeSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type FindingSource = z.infer<typeof FindingSourceSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type Extraction = z.infer<typeof ExtractionSchema>;
export type Context = z.infer<typeof ContextSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type MoodResult = z.infer<typeof MoodResultSchema>;
export type PeriodRecord = z.infer<typeof PeriodRecordSchema>;
export type CycleSettings = z.infer<typeof CycleSettingsSchema>;
export type Prediction = z.infer<typeof PredictionSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
