// Download sizes as the model host reports them, so she sees the cost before she starts.
export const EXPECTED_BYTES = {
  gemma: 2_841_481_184,
  voice: 557_368_064,
  cards: 277_852_192,
} as const;

export function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  return `${Math.round(bytes / 1_000_000)} MB`;
}
