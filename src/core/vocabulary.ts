export const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const;

export const SYMPTOMS = [
  'cramps', 'headache', 'back_pain', 'bloating', 'fatigue', 'mood_changes', 'acne',
  'breast_tenderness', 'sleep_quality', 'energy', 'stress', 'appetite', 'nausea', 'pelvic_pain',
] as const;

export const MOODS = [
  'calm', 'joyful', 'energetic', 'romantic', 'tired', 'anxious', 'stressed', 'irritable', 'sad',
] as const;

// WHO ANC.DT.01, the 13 codes only.
export const DANGER_CODES = [
  'vaginal_bleeding', 'convulsions', 'fever', 'severe_headache', 'visual_disturbance',
  'imminent_delivery', 'labour', 'looks_very_ill', 'severe_vomiting', 'severe_pain',
  'severe_abdominal_pain', 'unconscious', 'central_cyanosis',
] as const;

export const SEVERITIES = ['mild', 'moderate', 'severe', 'unknown'] as const;
export const FINDING_SOURCES = ['lexicon', 'embedding', 'llm', 'checklist'] as const;
