type AppPhase = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

// Leaving for the background locks the app again; only a return from the background asks for Face ID.
// The Face ID sheet itself moves the app to inactive and back, so prompting on that would loop.
export function lockOnChange(prev: AppPhase, next: AppPhase): { relock: boolean; prompt: boolean } {
  return { relock: next === 'background', prompt: prev === 'background' && next === 'active' };
}
