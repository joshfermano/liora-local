export const FLOWS = ['spotting', 'light', 'medium', 'heavy'] as const;

export const SYMPTOMS = [
  'cramps', 'headache', 'back_pain', 'bloating', 'fatigue', 'mood_changes', 'acne',
  'breast_tenderness', 'sleep_quality', 'energy', 'stress', 'appetite', 'nausea', 'pelvic_pain',
] as const;

export const ACTIVITIES = [
  'walk', 'exercise', 'rest', 'water', 'slept_well', 'checkup_visit', 'medicine_taken',
] as const;

export const MOODS = [
  'calm', 'joyful', 'energetic', 'romantic', 'tired', 'anxious', 'stressed', 'irritable', 'sad',
] as const;

// The WHO ANC DAK danger-sign check (ANC.DT.01, p. 73), with "Headache and visual disturbance"
// split into two codes so either one alone is caught.
export const DANGER_CODES = [
  'vaginal_bleeding', 'convulsions', 'fever', 'severe_headache', 'visual_disturbance',
  'imminent_delivery', 'labour', 'looks_very_ill', 'severe_vomiting', 'severe_pain',
  'severe_abdominal_pain', 'unconscious', 'central_cyanosis', 'severe_difficulty_breathing',
] as const;

export const SEVERITIES = ['mild', 'moderate', 'severe', 'unknown'] as const;
export const FINDING_SOURCES = ['lexicon', 'embedding', 'llm', 'checklist'] as const;
