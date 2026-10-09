// Least recently used: a read counts as a use, and the oldest entry goes first when the cache is full.
export class Lru<V> {
  private readonly items = new Map<string, V>();

  constructor(private readonly max: number) {
    if (max < 1) throw new Error('An LRU needs room for at least one entry');
  }

  get size(): number {
    return this.items.size;
  }

  get(key: string): V | undefined {
    if (!this.items.has(key)) return undefined;
    const value = this.items.get(key) as V;
    this.items.delete(key);
    this.items.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    this.items.delete(key);
    this.items.set(key, value);
    if (this.items.size > this.max) this.items.delete(this.items.keys().next().value as string);
  }

  clear(): void {
    this.items.clear();
  }
}
