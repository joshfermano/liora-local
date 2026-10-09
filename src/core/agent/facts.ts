import type { AgentData, Facts } from './types';

// Placeholders until the implementations land; every export keeps this exact signature.

// What her cycle or pregnancy looks like today, as plain facts for the responder: cycle day, next
// period window, fertile window, period ongoing, weeks pregnant. Dates are written out in words.
export function cycleFacts(_data: AgentData, _status: string | undefined, _today: string): Facts {
  return {};
}

// What she logged on one day.
export function dayFacts(_data: AgentData, _date: string): Facts {
  return {};
}

// Keeps the sentences of Gemma's reply that are safe to show (no medical advice, diagnosis,
// medicine, contraception advice, or any number missing from the facts); null when none are.
export function guardReply(_text: string, _facts: Facts): string | null {
  return null;
}
