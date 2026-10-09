// Remembers the last result and the arguments it was made from. Arguments are compared by identity,
// which suits the log store: a slice that did not change is the very same object.
export interface LastResult<A extends readonly unknown[], R> {
  (...args: A): { value: R; hit: boolean };
  reset(): void;
}

export function lastResult<A extends readonly unknown[], R>(compute: (...args: A) => R): LastResult<A, R> {
  let last: { args: A; value: R } | null = null;
  const call = ((...args: A) => {
    if (last && last.args.length === args.length && last.args.every((a, i) => Object.is(a, args[i]))) {
      return { value: last.value, hit: true };
    }
    const value = compute(...args);
    last = { args, value };
    return { value, hit: false };
  }) as LastResult<A, R>;
  call.reset = () => {
    last = null;
  };
  return call;
}
