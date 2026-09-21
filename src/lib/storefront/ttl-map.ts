// Mapa en memoria con vencimiento y TAMAÑO ACOTADO (sin dependencias ni timers).
// Lo usan la ruta `/api/revalidate-catalog` (visto bueno y RECHAZO del API por hash
// del token) y el SSR del detalle (recordar unos segundos un 429/5xx por slug+país).
// Al llenarse primero tira lo vencido y, si sigue lleno, se vacía: nunca crece sin
// límite aunque alguien mande claves distintas sin parar. Es memoria del PROCESO
// (cada instancia serverless tiene la suya): es una optimización, no una garantía.

export class BoundedTtlMap<V> {
  private readonly entries = new Map<string, { value: V; until: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
  ) {}

  /** Valor vigente o `undefined`. Una entrada vencida se borra al leerla. */
  get(key: string, now: number): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.until <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** `ttlMs` opcional para esta entrada (p. ej. un `Retry-After`); por defecto el del mapa. */
  set(key: string, value: V, now: number, ttlMs: number = this.ttlMs): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      for (const [k, entry] of this.entries) if (entry.until <= now) this.entries.delete(k);
      if (this.entries.size >= this.maxEntries) this.entries.clear();
    }
    this.entries.set(key, { value, until: now + ttlMs });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
