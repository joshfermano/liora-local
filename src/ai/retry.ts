export async function withRetries<T>(
  task: () => Promise<T>,
  { attempts, onRetry }: { attempts: number; onRetry?: (attempt: number, error: unknown) => void },
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task();
    } catch (error) {
      last = error;
      if (attempt < attempts) onRetry?.(attempt, error);
    }
  }
  throw last;
}
